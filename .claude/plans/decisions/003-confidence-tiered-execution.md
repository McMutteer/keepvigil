# ADR 003: Confidence-Tiered Execution Strategy

**Status:** Accepted
**Date:** 2026-03-01

**Context:** Test plan items range from highly specific ("npm run build passes") to ambiguous ("verify responsive on mobile"). Treating all items equally would either miss easy wins or produce unreliable results for ambiguous items.

**Decision:** Classify every test plan item into a confidence tier before execution. Each tier has a different execution and reporting strategy.

**Tiers:**

| Tier | Confidence | Execution | Reporting | Example |
|------|-----------|-----------|-----------|---------|
| DETERMINISTIC | 100% | Direct command/assertion | Pass/Fail | "npm run build passes" |
| HIGH | 85%+ | Playwright + specific assertions | Pass/Fail + screenshot | "POST /api/users returns 201" |
| MEDIUM | 60-85% | Playwright + AI visual check | Evidence (screenshot) + AI assessment | "Skeleton appears before content" |
| LOW | <60% | Skip execution | Flag as "needs human" | "UX feels natural" |
| SKIP | N/A | Not automatable | Inform user | "Ask client for feedback" |

**Alternatives considered:**
- **Execute everything, best effort** — rejected because: Low-confidence items would produce unreliable results, eroding trust in the entire system.
- **Only execute DETERMINISTIC items** — rejected because: Misses the most valuable items (UI flows, visual checks) that humans actually skip.
- **Let the user configure per-item** — rejected because: Defeats the "zero config" value proposition.

**Consequences:**
- (+) Users trust results because confidence is transparent
- (+) Never blocks a merge on an AI-judged assertion — only on deterministic failures
- (+) Graceful degradation — even LOW items get flagged rather than ignored
- (-) Classification step adds latency and cost (one LLM call per item)
- (-) Some items may be misclassified — needs feedback loop
