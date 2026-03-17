# Landing Page Example: Real Vigil Score

This is a real Vigil evaluation result to use as the showcase example on the landing page.
It demonstrates all 8 signals working together on a real PR.

## Source

- **PR:** McMutteer/keepvigil#47
- **Title:** feat: contract-over-assertion trust, pipeline reorder, augmentor filtering
- **Date:** 2026-03-17
- **Run ID:** 59d3cad2-73cf-4696-8515-4777e2aca7ff

## Score: 95/100 — Safe to merge

**Recommendation:** Safe to merge — 12/12 checks passed

## Signal Table

| Signal | Score | Status |
|--------|-------|--------|
| Credential Scan | 100/100 | 1 passed |
| CI Bridge | 100/100 | 12 skipped |
| Coverage Mapper | 50/100 | 4 passed, 4 failed |
| Test Execution | 100/100 | 12 passed |
| Diff vs Claims | 47/100 | 8 passed, 4 failed, 4 warnings |
| Gap Analysis | 96/100 | 4 warnings |
| Plan Augmentation | 100/100 | 5 passed |
| Contract Check | 100/100 | 1 passed |

## Test Plan Items (12/12 passed)

| # | Item | Category | Status |
|---|------|----------|--------|
| 1 | `executor-adapter.ts` has `isContractVerified` function | Existence | Passed |
| 2 | `contract-checker.ts` exports `ContractCheckerResult` interface | Existence | Passed |
| 3 | Contract override only triggers for assertion items, not shell/api | Logic | Passed |
| 4 | Contract override sets `passedCount++` and does NOT set `blockingFailed` | Logic | Passed |
| 5 | `verifiedFiles` only contains paths from compatible contracts | Logic | Passed |
| 6 | Uses `GENERATE_PROMPT_NO_CONTRACTS` when checker active | Logic | Passed |
| 7 | Filters `category === "contract"` items after LLM generation | Logic | Passed |
| 8 | `checkContracts` runs BEFORE `buildExecutorSignal` in pipeline | Contract | Passed |
| 9 | Destructures `{ signal, verifiedFiles }` from checker result | Contract | Passed |
| 10 | Passes `contractVerifiedFiles` as 4th arg to executor adapter | Contract | Passed |
| 11 | `isContractVerified` normalizes paths by stripping `./` | Edge case | Passed |
| 12 | Returns neutral with "Contract Checker" message when all items filtered | Edge case | Passed |

## Plan Augmentation Items (5/5 auto-generated and verified)

These were NOT in the original test plan — Vigil generated them automatically:

| # | Item | Category | Status |
|---|------|----------|--------|
| 1 | executor-adapter contract override preserves CI override priority | Logic | Passed |
| 2 | pipeline passes contractCheckerActive based on verifiedFiles.size | Logic | Passed |
| 3 | plan-augmentor GENERATE_PROMPT_NO_CONTRACTS excludes category 1 | Logic | Passed |
| 4 | contract-checker neutralResult returns empty Set not undefined | Edge case | Passed |
| 5 | executor-adapter isContractVerified handles empty string file | Edge case | Passed |

## Before/After Story (for landing page narrative)

### Before (siegekit PR #12, old Vigil)
- Score: **70/100** (capped)
- Test Execution: 78/100 — 2 items FAILED
- The 2 failures were cross-file contract checks that the assertion executor couldn't verify (reads one file)
- Contract Checker said 100/100 compatible — but the failure cap triggered anyway
- **Result: False "review needed" on a correct PR**

### After (keepvigil PR #47, new Vigil)
- Score: **95/100** (no cap)
- Test Execution: 100/100 — all 12 items passed
- Contract Checker verified compatibility → executor adapter trusted the result
- Plan Augmentor generated 5 additional checks, all passed
- **Result: Accurate "safe to merge" with 17 total verifications (12 original + 5 augmented)**

## Usage Notes for Landing Page

- This example shows all 8 signals in a single evaluation
- The before/after story demonstrates the evolution from false negatives to accurate scoring
- The Plan Augmentation section shows Vigil going beyond what the developer wrote
- The categorized test plan (existence/logic/contracts/edge cases) can be highlighted as a best practice
- The 95 score (not 100) is more credible than a perfect score — Coverage Mapper correctly identified files without test coverage
