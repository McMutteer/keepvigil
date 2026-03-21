# Vigil Self-Evaluation Log

Tracking how Vigil evaluates its own PRs. Each entry captures the score, signal breakdown, failures, and lessons learned. This is the feedback loop that drives product improvements.

## Score History

### v2 Pipeline (Claims Verification)

| PR | Date | Score | Claims | Undocumented | Coverage | Key Observation |
|----|------|-------|--------|--------------|----------|-----------------|
| #125 | 2026-03-21 | **89/100** | 9/9 ✅ (100) | 1 warning (97) | 0/4 tested (0) | Claims verification excellent — all 9 extracted and confirmed. Undocumented: caught language switcher in DocsNavbar not mentioned in PR description (legitimate). Coverage Mapper noisy: flagged 4 React UI components as untested — technically correct but not actionable for presentation components. Inline comments spammy (4x identical "No test file found"). |

### v1 Pipeline (Test Plans — deprecated)

| PR | Date | Score | Test Plan Items | Key Issue |
|----|------|-------|-----------------|-----------|
| #59 | 2026-03-17 | **42/100** | 0/3 (1 skip) | Rate limited (free tier) → fixed to Pro. Re-run: 42 with Pro signals (sandbox failures) |
| #58 | 2026-03-17 | **70/100** | 1/2 (1 skip) | `pnpm --filter` not in allowlist, Coverage 0 (no landing tests) |
| #57 | 2026-03-17 | **69/100** | 0/3 (1 skip) | Shell commands fail in sandbox, vague items |
| #56 | 2026-03-17 | **42/100** | 1/4 (1 skip) | Shell sandbox + CI Bridge 0 + vague items |
| #53 | 2026-03-17 | **70/100** | 11/12 passed | Cross-file assertion failed, augmentor weak |
| #51 | 2026-03-17 | **70/100** | 2/9 passed | 7 items used bare filenames — all "File not found" |
| #50 | 2026-03-17 | **70/100** | 1/5 passed | API endpoint treated as file path, vague items |
| #49 | 2026-03-17 | **91/100** | 12/12 passed | Smart reader deployed, well-written plan |
| #48 | 2026-03-17 | **70/100** | 9/11 passed | 20KB truncation hid function at line 590 |
| #47 | 2026-03-17 | **94/100** | 12/12 passed | Best score — full paths + logic assertions |
| #45 | 2026-03-17 | **54/100** | 15/15 passed | CI failing + Diff Analyzer scored 0 |

---

## Recurring Failure Patterns

### P1: Bare filenames instead of full paths (most damaging)

**Seen in:** PRs #51, #50, #56

Test plan items like `pricing.tsx has correct values` fail instantly with "File not found" because the assertion executor searches for `pricing.tsx` at repo root, not `packages/landing/src/components/sections/pricing.tsx`.

**Impact:** Drops Test Execution signal to 0-22. Triggers failure cap at 70.

**Fix needed:** File path resolver — when a bare filename is given, search the repo for matches before failing. Fuzzy match against the cloned repo's file tree.

**Workaround:** Always use full relative paths from repo root in test plan items.

---

### P2: Vague items with no actionable content

**Seen in:** PRs #56, #50

Items like "836 tests pass" or "Build succeeds for all packages" have no file path and no executable command. Vigil skips them, which tanks Coverage Mapper score.

**Impact:** Skipped items count as neither pass nor fail but reduce coverage.

**Fix needed:** Classify these as "meta-assertions" and map to shell commands (`pnpm test`, `pnpm build`) automatically when the intent is clear.

**Workaround:** Write explicit commands: `- [ ] pnpm test passes (841 tests)` instead of `- [ ] Tests pass`.

---

### P3: Shell commands fail in sandbox (no deps)

**Seen in:** PRs #56, #50

`pnpm typecheck` and `pnpm build` exit with code 1 in the Docker sandbox because dependencies aren't installed. The sandbox runs commands in an isolated container with `--network none`.

**Impact:** Deterministic shell items fail and trigger the failure cap at 70.

**Fix needed:** Two options:
1. Install deps in the sandbox before running commands (slow, complex)
2. Trust CI Bridge results for these commands when CI is available (CI-over-sandbox, already implemented for some items)

**Current state:** CI-over-sandbox trust exists but only applies when a CI check run matches the item. The matching needs to be more aggressive for common commands.

---

### P4: API endpoints treated as file paths

**Seen in:** PR #50

`/api/stripe/webhooks` was interpreted as a filesystem path. The assertion executor tried to read it as a file.

**Impact:** Instant "File not found" failure.

**Fix needed:** Detect URL-like patterns (`/api/*`, `http://`, endpoint-like paths) and classify them differently — either skip gracefully or map to the corresponding handler file.

---

### P5: Cross-file assertions fail

**Seen in:** PR #53

Test plan item checking that values in `pricing-client.tsx` match a constant in `checkout.ts`. The assertion executor reads one file at a time — it cannot cross-reference.

**Impact:** Single item failure, but highlights a real limitation.

**Fix needed:** Allow assertion executor to read multiple files when the item references more than one. The Contract Checker does this for API/consumer pairs — generalize the pattern.

---

### P6: Plan Augmentor inconsistency

**Seen in:** PRs #53 (20/100), #51 (40/100), #50 (80/100), #49 (60/100)

The augmentor generates 3-5 items that the test plan didn't include. Many fail because they attempt cross-file or behavioral checks the executor can't perform.

**Scores across PRs:** 80, 20, 40, 80, 60, 100, 100 — wildly variable.

**Fix needed:**
1. Filter augmented items that require capabilities the executor doesn't have
2. Weight augmented items lower when they fail due to executor limitations vs real code issues
3. Improve the prompt to generate only items the executor can verify

---

### P7: `pnpm --filter` not in shell allowlist

**Seen in:** PR #58

`pnpm --filter landing build` was skipped because the allowlist doesn't recognize `pnpm --filter <pkg>` as a valid command pattern. Only bare `pnpm build`, `pnpm test`, etc. are allowed.

**Impact:** Legitimate monorepo commands get skipped instead of executed.

**Fix needed:** Add `pnpm --filter` and `pnpm -r` patterns to the shell allowlist. These are standard monorepo commands.

---

### P8: File truncation hiding definitions (FIXED)

**Seen in:** PR #48

`buildOnboardingTips` defined at line ~590 of a 600-line file was invisible to the LLM due to 20KB blind truncation.

**Status:** Fixed in PR #49 with the smart file reader (keyword-directed context extraction).

---

### P9: Subscription insert blocked by NOT NULL constraint

**Seen in:** Manual Pro activation during audit session

When inserting a subscription for internal testing (`McMutteer`), the `INSERT` failed because `stripe_customer_id` has a `NOT NULL` constraint. Internal/testing subscriptions don't have real Stripe IDs.

**Fix applied:** Used placeholder values (`cus_internal_testing`, `sub_internal_testing`). Works but is fragile.

**Fix needed:** Make `stripe_customer_id` and `stripe_subscription_id` nullable in the schema, OR add a separate `source` column (`stripe` | `internal` | `trial`) to distinguish real vs manual subscriptions.

---

## What Makes a High-Scoring PR

PR #47 (94/100) and PR #49 (91/100) are the gold standard. What they have in common:

1. **Full relative paths** from repo root for every file reference
2. **Specific logic assertions** — not just "file exists" but "function X does Y"
3. **Mix of categories** — existence checks + logic + contracts + edge cases
4. **Explicit code blocks** with function names or patterns to verify
5. **No vague prose** — every item is actionable

## Signal Reliability Ranking

| Signal | Avg Score | Reliability | Notes |
|--------|-----------|-------------|-------|
| Credential Scan | 100 | Very High | Never produces false positives/negatives |
| Contract Checker | 100 | High | Only fires when both API + consumer touched |
| Gap Analysis | 91 | High | Occasionally harsh on small PRs |
| Diff vs Claims | 60 | Medium | LLM-dependent, scores vary |
| CI Bridge | 63 | Medium | 0 when CI absent, 100 when present |
| Test Execution | 58 | Medium | Highly dependent on test plan quality |
| Coverage Mapper | 55 | Medium | Penalizes projects without test suites |
| Plan Augmentor | 63 | Low | Most variable signal, needs guardrails |

---

## Backlog: Product Improvements from Self-Evaluation

| Priority | Improvement | Triggered by |
|----------|-------------|-------------|
| **P0** | File path resolver (bare filename → full path search) | PRs #51, #50 |
| **P0** | Expand CI-over-sandbox trust for common commands | PRs #56, #50 |
| **P1** | Detect API endpoints and skip/reroute gracefully | PR #50 |
| **P1** | Multi-file assertion support | PR #53 |
| **P1** | Augmentor guardrails (filter unverifiable items) | PRs #53, #51 |
| **P1** | Add `pnpm --filter` and `pnpm -r` to shell allowlist | PR #58 |
| **P2** | Auto-map vague items to shell commands | PRs #56, #50 |
| **P2** | Augmentor score weighting for executor-limited failures | Multiple |
| **P2** | Coverage Mapper: distinguish presentation components from business logic | PR #125 — 4 React UI components flagged as untested, not actionable |
| **P2** | Consolidate duplicate inline comments into single summary | PR #125 — 4 identical "No test file found" comments are spammy |
