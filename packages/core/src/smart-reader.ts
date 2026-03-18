/**
 * Smart file reader — keyword-directed context extraction.
 *
 * Instead of blindly truncating large files to 20KB, searches for
 * keywords from the assertion item and extracts relevant lines with
 * context. Falls back to head truncation when no keywords match.
 *
 * Discovered in keepvigil PR #48: `buildOnboardingTips` at line 590
 * was invisible to LLM due to blind truncation of a 600-line file.
 */

/** Default lines of context around each keyword match */
const DEFAULT_WINDOW_SIZE = 30;

/** Max total bytes to send to LLM (same as old truncation limit) */
const MAX_OUTPUT_BYTES = 20_000;

/**
 * Extract searchable keywords from an assertion item's text and code blocks.
 *
 * Extracts:
 * - Names between backticks: `buildOnboardingTips` → "buildOnboardingTips"
 * - camelCase/PascalCase identifiers (≥ 6 chars to avoid noise)
 * - Quoted strings
 */
export function extractKeywords(itemText: string, codeBlocks: string[] = []): string[] {
  const keywords = new Set<string>();

  // Backtick-delimited names (highest signal)
  const backtickMatches = itemText.match(/`([^`]+)`/g);
  if (backtickMatches) {
    for (const match of backtickMatches) {
      const inner = match.slice(1, -1).trim();
      // Skip file paths (contain /) — we want function/variable names
      if (!inner.includes("/") && inner.length >= 3) {
        keywords.add(inner);
      }
      // Also extract the last segment of a dotted path: obj.method → method
      const dotParts = inner.split(".");
      if (dotParts.length > 1) {
        const last = dotParts[dotParts.length - 1];
        if (last.length >= 3) keywords.add(last);
      }
    }
  }

  // camelCase/PascalCase identifiers (≥ 6 chars to reduce noise)
  const identifierPattern = /\b[a-zA-Z][a-zA-Z0-9]*(?:[A-Z][a-zA-Z0-9]*)+\b/g;
  const identifiers = itemText.match(identifierPattern);
  if (identifiers) {
    for (const id of identifiers) {
      if (id.length >= 6) keywords.add(id);
    }
  }

  // Keywords from code blocks (function names, exports)
  for (const block of codeBlocks) {
    if (!block.includes("/") && block.length >= 3 && block.length <= 60) {
      keywords.add(block);
    }
  }

  return [...keywords];
}

/**
 * Search file content for keywords and extract context windows around matches.
 *
 * Returns a string with relevant lines and line number annotations.
 * If no keywords match, returns null (caller should fall back to truncation).
 */
export function findRelevantLines(
  content: string,
  keywords: string[],
  windowSize: number = DEFAULT_WINDOW_SIZE,
): string | null {
  if (keywords.length === 0) return null;

  const lines = content.split("\n");
  const matchedLineNums = new Set<number>();

  // Find all lines that contain any keyword
  for (const keyword of keywords) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(keyword)) {
        matchedLineNums.add(i);
      }
    }
  }

  if (matchedLineNums.size === 0) return null;

  // Build context windows around matches
  const includedLines = new Set<number>();
  for (const lineNum of matchedLineNums) {
    const start = Math.max(0, lineNum - windowSize);
    const end = Math.min(lines.length - 1, lineNum + windowSize);
    for (let i = start; i <= end; i++) {
      includedLines.add(i);
    }
  }

  // Sort and merge into contiguous ranges
  const sorted = [...includedLines].sort((a, b) => a - b);
  const ranges: Array<{ start: number; end: number }> = [];
  let current = { start: sorted[0], end: sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === current.end + 1) {
      current.end = sorted[i];
    } else {
      ranges.push(current);
      current = { start: sorted[i], end: sorted[i] };
    }
  }
  ranges.push(current);

  // Build output with line number annotations
  const parts: string[] = [];
  parts.push(`(${lines.length} total lines, showing ${sorted.length} relevant lines)`);

  for (const range of ranges) {
    parts.push(`\n--- Lines ${range.start + 1}-${range.end + 1} ---`);
    for (let i = range.start; i <= range.end; i++) {
      parts.push(lines[i]);
    }
  }

  const result = parts.join("\n");

  // Respect byte budget
  if (Buffer.byteLength(result, "utf-8") > MAX_OUTPUT_BYTES) {
    const truncated = Buffer.from(result, "utf-8")
      .subarray(0, MAX_OUTPUT_BYTES)
      .toString("utf-8")
      .replace(/\uFFFD/g, "");
    return truncated + "\n\n...(context truncated)";
  }

  return result;
}

/**
 * Smart content preparation for LLM verification.
 *
 * For small files (≤ maxBytes): returns full content unchanged.
 * For large files: extracts keyword-relevant context windows.
 * Fallback: blind truncation to first maxBytes (original behavior).
 */
export function prepareFileContent(
  content: string,
  itemText: string,
  codeBlocks: string[] = [],
  maxBytes: number = MAX_OUTPUT_BYTES,
): string {
  if (Buffer.byteLength(content, "utf-8") <= maxBytes) {
    return content;
  }

  // Try keyword-directed extraction
  const keywords = extractKeywords(itemText, codeBlocks);
  if (keywords.length > 0) {
    const relevant = findRelevantLines(content, keywords);
    if (relevant) return relevant;
  }

  // Fallback: blind truncation (original behavior)
  const truncated = Buffer.from(content, "utf-8")
    .subarray(0, maxBytes)
    .toString("utf-8")
    .replace(/\uFFFD/g, "");
  return truncated + "\n\n...(truncated)";
}
