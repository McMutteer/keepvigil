# Landing Docs Update — New Signals & Weights

## What Changed (v3, session 2026-03-17)

Two new signals added, weights rebalanced, several features added.

## Files That Need Updating

### 1. Signals Overview Page
**File:** `packages/landing/src/app/docs/signals/page.tsx`

**Current:** 7 signals with old weights (CI Bridge 30, Credential Scan 25, etc.)
**Needed:** 8 signals with new weights:

| Signal | Old Weight | New Weight | Tier |
|--------|-----------|------------|------|
| CI Bridge | 30 | 25 | Free |
| Credential Scan | 25 | 20 | Free |
| Test Execution | 20 | 15 | Free |
| **Plan Augmentation** | — | **15** | **Pro (NEW)** |
| **Contract Check** | — | **10** | **Pro (NEW)** |
| Coverage Mapper | 10 | 5 | Free |
| Diff vs Claims | 10 | 5 | Pro |
| Gap Analysis | 5 | 5 | Pro |

Also update:
- "Seven independent signals" → "Eight independent signals"
- Description text to mention augmentation and contracts
- Failure cap section: mention contract-over-assertion trust
- Signal Details list: add Plan Augmentation and Contract Check links

### 2. New Signal Pages (CREATE)
**Create:** `packages/landing/src/app/docs/signals/plan-augmentation/page.tsx`
- Two-phase: LLM generates items → verifies against codebase
- Categories: logic, edge cases, security (contracts excluded when checker active)
- Reads CLAUDE.md for project context
- Uses smart file reader for keyword-directed context

**Create:** `packages/landing/src/app/docs/signals/contract-check/page.tsx`
- Cross-file API/frontend verification
- Fast-path: only runs when PR touches both producer and consumer
- Producer patterns: routes, controllers, handlers, services
- Consumer patterns: components, pages, hooks, .tsx/.vue/.svelte
- Contract-over-assertion trust: overrides assertion failures

### 3. Coverage Mapper Page
**File:** `packages/landing/src/app/docs/signals/coverage-mapper/page.tsx`
- Update weight from 10 to 5
- Add plan-coverage feature: files referenced by test plan count as covered

### 4. Writing Test Plans Page
**File:** `packages/landing/src/app/docs/writing-test-plans/page.tsx`
- Verify it matches `docs/writing-test-plans.md` in the repo
- Add section about Plan Augmentor auto-generating items
- Add note that Contract Checker auto-detects mismatches

### 5. Scoring Page
**File:** `packages/landing/src/app/docs/scoring/page.tsx`
- Update weights table
- Add contract-over-assertion trust explanation
- Mention that LLM signals don't trigger failure cap

### 6. Landing Page Signals Section
**File:** `packages/landing/src/components/sections/signals.tsx`
- Currently shows 7 signals — add Plan Augmentation and Contract Check
- Update signal count in any headers

### 7. Evidence Section
**File:** `packages/landing/src/components/sections/evidence.tsx`
- Update the example score card to show 8 signals
- Use the real data from `docs/first-95-score-showcase.md`

### 8. Pricing Section
**File:** `packages/landing/src/components/sections/pricing.tsx`
- Pro plan features should mention Plan Augmentation and Contract Check

### 9. Navigation
**File:** Check `packages/landing/src/lib/docs-nav.ts` or wherever nav is defined
- Add Plan Augmentation and Contract Check to the signals nav group

## Source of Truth

- Signal weights: `packages/core/src/score-engine.ts` (SIGNAL_WEIGHTS)
- Signal types: `packages/core/src/types.ts` (SignalId)
- Real example: `docs/first-95-score-showcase.md`
- Test plan guide: `docs/writing-test-plans.md`
- Smart reader: `packages/core/src/smart-reader.ts`
