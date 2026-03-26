# Progressive Comment & Comment Redesign

**Date:** 2026-03-26
**Status:** Approved
**Scope:** Two-phase comment posting + compact collapsible comment format

## Problem

1. **30-60 seconds of silence:** When a PR is opened, Vigil creates a pending check run but posts no comment until ALL signals complete. The developer has no feedback that Vigil received the PR.
2. **Wall of text:** The current comment shows all claims, undocumented changes, signal table, and action items fully expanded. On a PR with 9 claims, the comment is 50+ lines — most developers won't read it.

## Solution: Two-Phase Comment

### Phase 1: Placeholder (immediate, < 2 seconds)

Posted by the webhook handler BEFORE enqueueing the job to BullMQ. Uses the PR metadata already available (no LLM, no diff fetch needed).

```markdown
<!-- vigil-results -->
⏳ **Vigil is analyzing this PR...**

📁 11 files changed • +851 / -133 lines • ⚡ ~30s

---
<sub>Vigil v0.2.0 • [keepvigil.dev](https://keepvigil.dev) • run: 99f668</sub>
```

**Data available at this point:**
- File count and line changes: from the PR payload (`additions`, `deletions`, `changed_files`)
- Estimated time: heuristic based on file count (< 5 files: ~15s, 5-20: ~30s, 20+: ~60s)
- Run ID: generated before enqueue
- Version: from package.json or hardcoded

**Implementation:**
- In `webhooks/pull-request.ts`, after creating the pending check run and BEFORE `enqueueVerification()`:
  1. Build placeholder markdown
  2. Call `octokit.rest.issues.createComment()` with the placeholder
  3. Pass the `comment_id` to the job payload so the worker can edit it later

### Phase 2: Results (edit placeholder, ~30-60 seconds later)

The pipeline completes and `reporter.ts` EDITS the placeholder comment (not creates a new one) with the full results in the new compact format.

**Change to reporter.ts:**
- Currently: `findExistingComment()` searches by `COMMENT_MARKER` in body
- New: First try using `comment_id` from job payload (direct edit, no search needed). Fall back to `findExistingComment()` for backwards compatibility (PRs that were already in the queue when this deploys).

### Error State (edit placeholder with error)

If the pipeline fails, the placeholder is edited to show the error:

```markdown
<!-- vigil-results -->
❌ **Vigil encountered an error analyzing this PR.**

Something went wrong during verification. This doesn't affect your PR — you can merge normally.

---
<sub>Vigil v0.2.0 • [keepvigil.dev](https://keepvigil.dev) • run: 99f668 • [Report issue](https://github.com/McMutteer/keepvigil/issues)</sub>
```

**Never leave an "⏳ Analyzing..." comment orphaned.** The `reportResults()` function already runs even on pipeline errors — the error state edit happens there.

## Comment Format Redesign

### Score Header (always visible)

```markdown
## Vigil Confidence Score: 89/100

✅ **Safe to merge**

> 📁 11 files • +851 / -133 • 🧪 4 tested • ⚡ ~20 min review
```

Recommendation labels:
- Score >= 80: `✅ **Safe to merge**`
- Score 50-79: `⚠️ **Review recommended**`
- Score < 50: `🚨 **Do not merge**`

### Collapsible Sections

Each major section uses GitHub's `<details>` tag. The summary line shows the key metric so developers can scan without expanding.

**Claims:**
```markdown
<details>
<summary>📋 <strong>Claims</strong> — 9/9 verified ✅</summary>

✅ **"Complete navigation redesign with route groups"** — The diff moves pages into `(marketing)` and `(docs)` route groups and introduces new layouts.
✅ **"Restructure [locale]/ into route groups"** — Multiple pages were renamed into `(marketing)/` and `(docs)/`.
...

</details>
```

**Undocumented Changes:**
```markdown
<details>
<summary>🔍 <strong>Undocumented Changes</strong> — 1 warning ⚠️</summary>

- ⚠️ Added EN/ES language switcher to the docs navbar

</details>
```

If no undocumented changes: `🔍 **Undocumented Changes** — None found ✅` (no details tag needed)

**Risk Assessment (inline, no collapse):**
```markdown
🟢 **Risk:** LOW
```

Only collapse if HIGH risk with details to show.

**Signal Breakdown:**
```markdown
<details>
<summary>📊 <strong>Signal Breakdown</strong> — 5 passed, 1 warning</summary>

| Signal | Score | Status |
|--------|-------|--------|
| Claims Verifier | 100/100 | ✅ 9 passed |
| Undocumented Changes | 97/100 | ⚠️ 1 warning |
| Credential Scan | 100/100 | ✅ Clean |
| Coverage Mapper | 75/100 | ✅ 3/4 tested |
| Contract Checker | 100/100 | ✅ No issues |
| Diff Analyzer | 100/100 | ✅ No gaps |

</details>
```

**Description Generator (when applicable):**
```markdown
<details>
<summary>📝 <strong>Suggested Description</strong> — PR had no description</summary>

This PR adds a new footer component with 4 columns...

</details>
```

### Footer

```markdown
---
<sub>Vigil v0.2.0 • [keepvigil.dev](https://keepvigil.dev) • run: 99f668</sub>
```

### First-Run Tips (only on first PR for an installation)

```markdown
<details>
<summary>💡 Tips for better Vigil verification</summary>

- **Be specific in PR descriptions** — Vigil extracts and verifies each claim
- **Mention new dependencies** — otherwise they're flagged as undocumented
- **Use conventional commits** — helps Vigil understand intent

[Learn more →](https://keepvigil.dev/docs/getting-started)

</details>
```

## Files to Modify

| File | Changes |
|------|---------|
| `webhooks/pull-request.ts` | Post placeholder comment before enqueue. Pass `comment_id` in job payload |
| `services/reporter.ts` | Accept `commentId` from job, edit directly instead of search. Error state editing |
| `services/comment-builder.ts` | New `buildPlaceholderBody()` function. Rewrite `buildScoreCommentBody()` with collapsible sections |
| `services/pipeline.ts` | Pass `commentId` through to `reportResults()` |
| `worker.ts` | Extract `commentId` from job data, pass to pipeline |

## Files NOT Modified

- `review-commenter.ts` — inline comments are unchanged
- `check-run-updater.ts` — check run flow is unchanged
- `score computation` — scoring logic is unchanged

## Job Payload Change

Add `commentId` to the BullMQ job data:

```typescript
interface VerificationJob {
  // ... existing fields
  commentId?: number;  // GitHub comment ID for editing (undefined for legacy jobs)
}
```

## Testing

- [ ] Placeholder comment appears within 2 seconds of PR open
- [ ] Placeholder shows correct file count and line changes
- [ ] Results edit replaces placeholder (no duplicate comments)
- [ ] All sections use `<details>` tags and render correctly on GitHub
- [ ] Claims summary line shows correct count (X/Y verified)
- [ ] Undocumented shows "None found" when empty
- [ ] Risk displays inline for LOW, collapses for HIGH
- [ ] Signal table renders in collapsed section
- [ ] Error state replaces placeholder correctly
- [ ] First-run tips appear only on first PR per installation
- [ ] Footer shows version and run ID
- [ ] Backwards compatibility: PRs already in queue (no commentId) still work via marker search
- [ ] Re-push to existing PR: edits same comment (no new comment created)
- [ ] Comment stays under 60KB limit with collapsible sections
