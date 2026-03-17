# Writing Test Plans That Vigil Can Verify

## The Problem

AI agents write test plans that are ~90% existence checks: "does function X exist in file Y?" Vigil verifies these perfectly (100% pass rate), but they miss real bugs. We discovered this analyzing siegekit PRs #8 and #9:

**Before (existence only):** 6/6 passed, 0 bugs found, merged a broken PR
**After (logic + contracts + edge cases):** 15/15 passed, real bugs detected

## The Rules

### 1. Categorize items

Every test plan should follow this distribution:

| Category | Target % | What it verifies |
|----------|----------|------------------|
| Existence | ≤30% | Does the code exist? |
| Logic | 30-40% | Does it do the right thing? |
| Contracts | 20-30% | Do files agree with each other? |
| Edge cases | 10-20% | What about unusual inputs? |

### 2. Always use full file paths

Vigil's assertion executor resolves files by path. Short names fail with "File not found".

```markdown
# BAD
- [ ] `targets.ts` has PATCH route

# GOOD
- [ ] `packages/api/src/routes/targets.ts` has PATCH `/:id` route handler
```

### 3. Logic items must describe the specific pattern

Tell Vigil exactly what the correct AND wrong pattern looks like.

```markdown
# BAD (vague)
- [ ] `targets.ts` PATCH normalizes value and handles P2025

# GOOD (specific, verifiable)
- [ ] `packages/api/src/routes/targets.ts` PATCH handler calls
      `prisma.target.findUnique` to fetch the existing target BEFORE
      calling `normalizeTargetValue`, using `existing.type` as fallback
      instead of hardcoding a default
```

### 4. Contract items — reference BOTH files, verify ONE at a time

Vigil reads one file per assertion. For cross-file contracts, write TWO items:

```markdown
# GOOD — two items, one per file, checking matching field names
- [ ] `packages/web/reports/page.tsx` `ReportSummary` interface has fields
      `totalTargets`, `totalScans`, `totalFindings`, `openFindings`, `severity`
- [ ] `packages/api/src/routes/reports.ts` `res.json()` response includes keys
      `totalTargets`, `totalScans`, `totalFindings`, `openFindings`, `severity`

# BAD — too vague, can't verify against one file
- [ ] Frontend interface matches API response shape
```

> **Note:** The Contract Checker signal (v2.1+) also auto-detects mismatches
> between API and frontend files in the same PR, even without explicit items.

### 5. Edge case items should describe the guard mechanism

```markdown
# BAD
- [ ] `page.tsx` prevents double submission

# GOOD
- [ ] `packages/web/targets/page.tsx` `handleEdit` checks `editLoading` state
      at the top and returns early if true to prevent double submission
```

### 6. Separate the footer from the last checkbox

The "Generated with Claude Code" line must be separated from the last checkbox by a blank line. Otherwise it gets appended to the last item text and corrupts the assertion.

```markdown
# BAD — footer gets appended to last item
- [ ] `pnpm typecheck` passes with zero errors
🤖 Generated with [Claude Code](https://claude.com/claude-code)

# GOOD — blank line separates them
- [ ] `pnpm typecheck` passes with zero errors

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## What Vigil CAN Verify

- Does a function/variable/import exist in a specific file? ✅
- Does code use pattern A instead of pattern B? ✅
- Does a file contain a specific string/value? ✅
- Are specific fields present in a TypeScript interface? ✅
- Does error handling exist (try/catch, if/return)? ✅
- Is a state variable checked before an action? ✅

## What Vigil CANNOT Verify

- Runtime behavior (does the API actually return 200?) ❌
- Visual appearance (does the button look right?) ❌
- Performance (does it load in <2s?) ❌
- Integration tests (does the full pipeline work?) ❌

## Template

```markdown
## Test plan

### Existence
- [ ] `full/path/to/file.ts` exports/has [specific function/component/route]
- [ ] `full/path/to/other.tsx` renders [specific element]

### Logic
- [ ] `full/path/to/file.ts` [function] does [specific correct thing]
      instead of [specific wrong thing]
- [ ] `full/path/to/file.ts` [function] handles [error case]
      by [specific response]

### Contracts
- [ ] `full/path/to/frontend.tsx` [interface] has fields [list]
      matching expected API shape
- [ ] `full/path/to/api.ts` response includes keys [list]
      matching frontend expectations

### Edge cases
- [ ] `full/path/to/file.tsx` [handler] has [guard mechanism]
      to prevent [problem]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Automatic Augmentation

Even without following these rules, Vigil's **Plan Augmentor** signal automatically generates and verifies 3-5 additional items covering logic, contracts, and edge cases that the original plan missed. The rules above help you get the most out of the system, but the augmentor acts as a safety net.

## Real-World Results

| Metric | Existence-only plan | Optimized plan |
|--------|-------------------|----------------|
| Items | 6 (100% existence) | 15 (categorized) |
| Pass rate | 6/6 (100%) | 15/15 (100%) |
| Bugs found | 0 | 3 (normalization, contract mismatch, CSS override) |
| False confidence | High | None |

Source: siegekit PRs #8 and #9, analyzed 2026-03-17.
