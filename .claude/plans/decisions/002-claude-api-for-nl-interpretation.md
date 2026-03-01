# ADR 002: Claude API for NL Interpretation

**Status:** Accepted
**Date:** 2026-03-01

**Context:** Vigil needs to translate natural language test plan items (e.g., "Click login button → verify dashboard loads") into executable test specifications. Options range from custom NLP to LLM APIs.

**Decision:** Use the Anthropic Claude API (claude-haiku-4-5 for classification, claude-sonnet-4-6 for test generation) as the NL interpretation engine.

**Alternatives considered:**
- **Custom NLP/rule-based parser** — rejected because: Test plan items are too varied and nuanced for regex or rule-based parsing. Would require constant maintenance as new patterns emerge. Cannot handle context-dependent items.
- **OpenAI GPT-4** — rejected because: Claude has better structured output reliability for code generation. Anthropic SDK is more familiar to the team. Shortest (proven NL→Playwright tool) uses Claude successfully.
- **Local/open-source LLM** — rejected because: Insufficient quality for reliable test generation. Would need fine-tuning and significant infrastructure. Not worth the complexity for v1.

**Consequences:**
- (+) Best-in-class NL understanding for varied test descriptions
- (+) Can use vision capabilities for screenshot verification
- (+) Proven approach (Shortest uses Claude for NL→Playwright successfully)
- (+) Haiku for cheap classification, Sonnet for quality generation — cost optimization
- (-) API cost per execution (~$0.01-0.05 per test plan item)
- (-) Dependency on external API availability
- (-) Need to handle rate limits and retries
