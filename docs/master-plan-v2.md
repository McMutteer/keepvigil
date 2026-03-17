# Vigil v2 — Master Plan

> Confidence Score for AI-Generated PRs
>
> Vision: `docs/vision-v2-confidence-score.md`
> Strategy notes: `docs/strategy-reposition-2026-03-15.md`

## The Pivot

Vigil v1 is a test plan **executor** — it runs what the checkboxes say. Vigil v2 is a confidence **scorer** — it collects multiple signals about a PR and tells you how safe it is to merge.

**Pipeline change:**
```
v1: parse → classify → execute → report
v2: parse → classify → collect signals → score → report
```

The v1 executor becomes one signal among many. Everything else (webhooks, queue, config, infrastructure) carries forward unchanged.

## Design Decisions (Locked)

These decisions are made. Don't revisit during implementation.

| Decision | Choice | Why |
|----------|--------|-----|
| Score range | 0-100 | Universal, intuitive |
| LLM model | BYOLLM (user provides key) | Zero variable cost, user controls quality/price |
| Free tier | CI Bridge + Credential Scan + Coverage Mapper | Immediate value without config |
| Pro tier | + Diff Analyzer + Gap Analyzer (LLM) | Config-gated via `llm:` in `.vigil.yml` |
| Score weights | Hardcoded defaults, configurable later | Ship fast, iterate on calibration |
| Failure cap | Any signal `passed: false` caps score at 70 | One failure = never "safe to merge" |
| Recommendation thresholds | 80+ safe, 50-79 review, <50 caution | Conservative starting point |
| Backward compat | No LLM config → v1 behavior + free signals | Existing users unaffected |
| Payment | None yet — config-based gating only | Validate product before billing |

## Signals

| Signal | LLM? | Tier | Weight | What it answers |
|--------|-------|------|--------|-----------------|
| CI Bridge | No | Free | 30 | Did GitHub Actions already verify this? |
| Credential Scan | No | Free | 25 | Are there hardcoded secrets in the diff? |
| Test Plan Executors (v1) | No* | Free | 20 | Did the test plan items actually pass? |
| Diff vs Claims | Yes | Pro | 10 | Does the test plan match what actually changed? |
| Coverage Mapper | No | Free | 10 | Do changed files have corresponding test files? |
| Gap Analysis | Yes | Pro | 5 | What areas changed but aren't tested? |

*v1 executors use LLM for classification/spec generation, but run on the platform Groq key — not the user's.

---

## Sections

Each section is a self-contained unit of work. When starting a section, create a detailed implementation plan in `/plan` mode. **Do not plan Section N+1 until Section N is merged.**

### Section 1: Score Engine + Signal Types ✅

**Goal:** Define the data model for signals and the pure function that combines them into a score.

**Scope:**
- `Signal`, `SignalDetail`, `ConfidenceScore` type definitions
- `computeScore(signals[])` → weighted average with failure cap
- Default weight constants
- Recommendation thresholds

**Why first:** Every other section produces or consumes `Signal`. This is the foundation.

**Package:** `packages/core`
**Dependencies:** None

---

### Section 2: BYOLLM Client ✅

**Goal:** Replace the hardcoded Groq integration with a provider-agnostic LLM client that users can configure.

**Scope:**
- `LLMClient` interface + factory function
- Provider support: OpenAI-compatible (OpenAI, Groq, Ollama), Anthropic
- `.vigil.yml` `llm:` section parsing + validation
- Refactor classifier + executors to accept `LLMClient` instead of `groqApiKey`
- Fallback: no user config → platform Groq key (existing behavior)

**Why second:** LLM-dependent signals (Sections 6, 7) need this. Non-LLM signals don't — they can proceed in parallel.

**Packages:** `packages/core`, `packages/executors`, `packages/github`
**Dependencies:** None (parallel with Section 1)

---

### Section 3: Credential Scanner ✅

**Goal:** Scan PR diff for hardcoded secrets using regex patterns. Binary signal: clean or compromised.

**Scope:**
- Regex pattern library (AWS keys, GitHub tokens, private keys, passwords, JWTs, connection strings)
- Only scan added lines in the diff
- Diff fetching via GitHub API (reused by Sections 6, 7)
- Never log or store the actual secret — only pattern name + file + line

**Why here:** High value, no LLM, simple to implement. Good first signal to validate the architecture.

**Package:** `packages/core` (scanner), `packages/github` (diff fetching)
**Dependencies:** Section 1 (needs `Signal` type)

---

### Section 4: CI Bridge ✅

**Goal:** Read GitHub Actions check run results and map them to test plan items.

**Scope:**
- Fetch check runs for the PR's head SHA via GitHub API
- Fuzzy-match test plan item text against check run names
- Conservative matching: when unsure, report "warn" not "pass"
- Link to failed check runs in details

**Why here:** Highest-weight signal (30). Most objective — no LLM, no heuristics, just "did CI pass?"

**Package:** `packages/github`
**Dependencies:** Section 1 (needs `Signal` type)

---

### Section 5: Coverage Mapper ✅

**Goal:** For each changed file, check if a corresponding test file exists in the repo.

**Scope:**
- Naming convention matching (`.test.ts`, `.spec.ts`, `test_*.py`, `*_test.go`)
- Exclude non-source files (config, docs, lockfiles)
- Changed files extracted from diff or GitHub API

**Package:** `packages/core`
**Dependencies:** Section 1 (needs `Signal` type)

---

### Section 6: Diff Analyzer (LLM) ✅

**Goal:** LLM compares the actual code diff against the test plan claims. Are the promises real?

**Scope:**
- Prompt engineering: given diff + test plan, assess coverage per item
- Detect uncovered changes (code changed but no test plan item mentions it)
- Diff truncation for LLM context limits (~50KB)
- Structured JSON response parsing with fallback

**Package:** `packages/github`
**Dependencies:** Section 1 (Signal type) + Section 2 (LLMClient)

---

### Section 7: Gap Analyzer (LLM) ✅

**Goal:** Identify areas of the codebase that changed but aren't addressed by the test plan.

**Scope:**
- Prompt engineering: given diff + test plan + changed files, find gaps
- Severity classification: critical (security), high (core logic), medium (UI), low (config)
- Score penalty formula based on gap severity

**Package:** `packages/github`
**Dependencies:** Section 1 (Signal type) + Section 2 (LLMClient)

---

### Section 8: Executor Signal Adapter ✅

**Goal:** Wrap existing v1 executor results into the `Signal` interface so they participate in the score.

**Scope:**
- Adapter function: `ExecutionResult[] + ClassifiedItem[] → Signal`
- No changes to actual executors — pure wrapper
- Preserve existing conclusion logic (DETERMINISTIC/HIGH fail → signal fails)

**Why not earlier:** Simple adapter, but the pipeline integration (Section 9) is where it matters. Build it right before wiring.

**Package:** `packages/github`
**Dependencies:** Section 1 (needs `Signal` type)

---

### Section 9: Pipeline v2 + Score Comment ✅

**Goal:** Wire all signals into the pipeline and build the new score-based PR comment format.

**Scope:**
- New pipeline orchestration: fetch diff, collect all signals concurrently, compute score
- New PR comment format: score header, signal table, collapsible details, legacy v1 table
- Check run conclusion derived from score (not just pass/fail count)
- Backward compatibility: no signals available → v1 behavior

**This is the integration section.** All prior sections produce independent pieces; this one assembles them.

**Package:** `packages/github`
**Dependencies:** Sections 1-8 (all signals)

---

### Section 10: Free/Pro Tier Gating ✅

**Goal:** Implement the two-tier experience. Free runs non-LLM signals. Pro adds LLM signals.

**Scope:**
- Tier detection: has `llm:` config → Pro, otherwise → Free
- Skip LLM signals gracefully, show "Pro" badge in comment
- Score re-normalization when signals are absent
- README documentation with config examples

**Package:** `packages/github`
**Dependencies:** Section 9 (pipeline v2)

---

## Implementation Order

```
                           ┌─→ S3 (Credential Scanner)
                           ├─→ S4 (CI Bridge)
S1 (Score Engine) ────────┤├─→ S5 (Coverage Mapper)
                           ├─→ S8 (Executor Adapter)
                           │
S2 (BYOLLM Client) ──────┤├─→ S6 (Diff Analyzer)
                           └─→ S7 (Gap Analyzer)
                                      │
                           ┌──────────┘
                           ▼
                    S9 (Pipeline v2)
                           │
                           ▼
                    S10 (Free/Pro)
```

**Recommended execution order (sequential):**
1. S1 — Score Engine (foundation)
2. S2 — BYOLLM Client (foundation)
3. S3 — Credential Scanner (first real signal, validates architecture)
4. S4 — CI Bridge (highest-weight signal)
5. S5 — Coverage Mapper (quick, no LLM)
6. S8 — Executor Adapter (wraps v1)
7. S6 — Diff Analyzer (first LLM signal)
8. S7 — Gap Analyzer (second LLM signal)
9. S9 — Pipeline v2 (integration)
10. S10 — Free/Pro gating (product)

---

## What's NOT in This Plan

Deferred to post-MVP:

- Stripe billing (validate product first)
- Dashboard/UI (scores in PR comments only)
- Custom signal weights in `.vigil.yml`
- Auto-merge based on score
- Score history/trends in DB
- Monorepo support (score per package)
- GitHub Marketplace listing
- Landing page redesign
- Score decay over time (open PR = lower confidence)

---

## Status

| Section | Status | Branch | PR |
|---------|--------|--------|----|
| S1: Score Engine | ✅ Complete | `feat/v2-score-engine` | #29 merged |
| S2: BYOLLM Client | ✅ Complete | `feat/v2-byollm-client` | #30 merged |
| S3: Credential Scanner | ✅ Complete | `feat/v2-credential-scanner` | #31 merged |
| S4: CI Bridge | ✅ Complete | `feat/v2-ci-bridge` | #32 merged |
| S5: Coverage Mapper | ✅ Complete | `feat/v2-coverage-mapper` | #33 merged |
| S6: Diff Analyzer | ✅ Complete | `feat/v2-diff-analyzer` | #35 merged |
| S7: Gap Analyzer | ✅ Complete | `feat/v2-gap-analyzer` | #36 merged |
| S8: Executor Adapter | ✅ Complete | `feat/v2-executor-adapter` | #34 merged |
| S9: Pipeline v2 | ✅ Complete | `feat/section-9-score-reporter` | #37 merged |
| S10: Free/Pro | ✅ Complete | `feat/v2-free-pro-gating` | #38 merged |
