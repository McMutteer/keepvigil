# Smart File Reader for Assertion Executor

## Problem

The assertion executor truncates files to 20KB and sends the first 20KB to the LLM. When the function being verified is at the end of a large file, the LLM can't see it and reports "function not found" — a false positive.

**Discovered:** keepvigil PR #48 — `buildOnboardingTips` at line 590 of `comment-builder.ts` (600+ lines). 2/11 items failed because the function was past the truncation point.

## Solution

Replace blind truncation with keyword-directed context extraction:

```
Current:  file[0:20KB] → LLM (misses end of file)
Proposed: search(file, keywords) → relevant_lines ± 30 → LLM (always finds target)
```

## Design

### Step 1: Extract keywords from item text

```typescript
function extractKeywords(itemText: string, codeBlocks: string[]): string[] {
  // From backtick-delimited names: `buildOnboardingTips` → "buildOnboardingTips"
  // From camelCase/PascalCase identifiers in text
  // From string literals in quotes
  // From code blocks (function names, variable names)
}
```

### Step 2: Search file and extract context windows

```typescript
function findRelevantLines(
  content: string,
  keywords: string[],
  windowSize: number = 30,
): string {
  // For each keyword, find all line numbers where it appears
  // Merge overlapping windows
  // Join with "---" separators
  // Respect total budget (20KB across all windows)
  // Prepend: "Lines X-Y of filename (Z total lines)"
}
```

### Step 3: Replace truncation in executor

```typescript
// Before (current):
if (Buffer.byteLength(content) > MAX_FILE_BYTES) {
  content = content.slice(0, MAX_FILE_BYTES) + "...(truncated)";
}

// After:
if (Buffer.byteLength(content) > MAX_FILE_BYTES) {
  const keywords = extractKeywords(item.item.text, item.item.hints.codeBlocks);
  const relevant = findRelevantLines(content, keywords);
  content = relevant || content.slice(0, MAX_FILE_BYTES) + "...(truncated)";
}
```

### Fallback

If no keywords match → current behavior (first 20KB). Zero regression risk.

## Files to modify

- `packages/executors/src/assertion.ts` — main change
- `packages/github/src/services/plan-augmentor.ts` — reuse same logic in `verifyItem`
- Optionally: extract shared utility to `packages/core/src/smart-reader.ts`

## Effort

~1 day. Simple string search, no AST parsing needed.

## Priority

High — affects every large file verification. Will become more frequent as repos grow.
