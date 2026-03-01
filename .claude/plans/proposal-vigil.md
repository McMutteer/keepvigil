# Vigil — Product Proposal

## The Press Release (from the future)

**San Francisco, July 2026** — Today, Vigil launches publicly, introducing the first tool that automatically executes AI-generated test plans from pull requests. As AI coding agents like Claude Code, Cursor, and GitHub Copilot have become standard development tools, a new problem has emerged: these agents generate detailed test plan checklists in every PR, but 70% of those tests are never actually run.

"We analyzed hundreds of pull requests across real production repositories," said the Vigil team. "The AI agents know exactly what should be tested — they write it down, checkbox by checkbox. But then nothing happens. Developers merge with unchecked boxes and hope for the best."

Vigil installs as a GitHub App in one click. When a PR includes a test plan section, Vigil parses each item, translates it into an executable test using AI and Playwright, runs it against the PR's preview deployment, and reports results directly as GitHub Check Runs. No test files to write. No new platform to learn. The test plan the AI already wrote becomes the test suite.

## The Problem

AI coding agents generate test plans in PR descriptions as standard practice. Analysis of 35 real PRs across 8 production repositories confirms that **94% of AI-generated PRs include test plan checklists**, but **70% of items are never executed**.

These aren't trivial checks. They include:
- UI flow verification ("Click connect → QR code appears → scan → status changes to connected")
- API contract testing ("POST /api/agents → verify agent created, POST with duplicate → expect 409")
- Visual/responsive checks ("Mobile 320px: nodes stay within canvas bounds")
- SEO/metadata validation ("JSON-LD valid for Google Rich Results")
- Security assertions ("Send with API key B → expect 404, ownership check")

The test plan IS the test specification. It's written by the same AI that wrote the code. It knows what changed and what could break. But there's no bridge between the plan and its execution.

## The Solution

**Vigil** is a GitHub App that automatically executes AI-generated test plans from pull requests.

1. **Detects** test plan sections in PR descriptions (markdown checkboxes)
2. **Classifies** each item by type (build check, UI flow, API test, visual, metadata)
3. **Translates** natural language items into executable tests using Claude API
4. **Executes** tests against the PR's preview deployment using Playwright
5. **Reports** results as GitHub Check Runs with evidence (screenshots, logs, assertions)
6. **Updates** the PR description with execution results

Zero configuration. Zero test files to maintain. The test plan already exists — Vigil just runs it.

## Target Users

### Primary Persona: The AI-Native Developer
- **Name:** Alex, 28, full-stack developer
- **Tools:** Claude Code or Cursor as primary coding agent, GitHub, Vercel/Netlify
- **Pain:** Every PR has a test plan they know they should execute but never do. Merges with guilt. Occasional bugs that the test plan would have caught.
- **Behavior:** Solo developer or small team (2-5). Ships fast. Values automation over process.
- **Trigger:** Has had a production bug that was explicitly listed in an unchecked test plan item.

### Secondary Persona: The Quality-Conscious Tech Lead
- **Name:** Maria, 35, engineering manager
- **Team:** 5-15 developers, several using AI agents
- **Pain:** Can't trust that AI-generated PRs are properly verified. Team members skip test plans. Code review catches logic issues but not visual/UX problems.
- **Trigger:** Wants to enforce quality standards without slowing down velocity.

## Goals

1. **Close the verification gap:** Execute 80%+ of automatable test plan items without human intervention
2. **Zero workflow change:** Developers change nothing about how they work — test plans are already being generated
3. **Fast feedback:** Results appear as Check Runs before code review starts
4. **Evidence-based:** Every result includes proof (screenshots, HTTP responses, logs), not just pass/fail
5. **Progressive trust:** Start with high-confidence tests (build, API), earn trust for visual/UX tests

## Non-Goals (first-class section)

1. **NOT a test framework.** Vigil does not replace Playwright, Jest, or any testing library. It orchestrates them.
2. **NOT a test authoring tool.** Vigil does not help you write test plans. The AI agent already does that.
3. **NOT a code review tool.** Vigil does not review code quality, suggest improvements, or catch bugs in code. That's CodeRabbit/Qodo territory.
4. **NOT a CI replacement.** Vigil runs ALONGSIDE CI, not instead of it. Existing build/lint/test pipelines are untouched.
5. **NOT a QA platform.** No test management, no dashboards, no test case databases. Just execute what the PR says.
6. **NOT for manual tests.** Items like "ask the client if they like it" are classified and skipped.
7. **NOT multi-platform in v1.** GitHub only. No GitLab, Bitbucket, or Azure DevOps in the first version.
8. **NOT self-hosted in v1.** SaaS only. Self-hosted comes with enterprise tier.

## Key Features

### P0 (Must ship)
- **PR test plan parser** — Detect and extract test plan items from PR descriptions
- **Item classifier** — Categorize items by type (build, UI, API, visual, metadata, manual/skip)
- **Build/command executor** — Run shell commands (`npm run build`, `npm test`)
- **API test executor** — Execute HTTP requests and verify responses
- **GitHub Check Runs** — Report results as native GitHub checks
- **Basic PR comment** — Summary comment with results and evidence

### P1 (Should ship)
- **UI flow executor** — Playwright-based browser testing from NL descriptions
- **Visual screenshot capture** — Take screenshots as evidence for visual assertions
- **Viewport testing** — Test responsive layouts at specified breakpoints
- **Metadata/SEO checker** — Validate OG tags, JSON-LD, sitemap, robots.txt
- **Preview deployment integration** — Auto-detect Vercel/Netlify preview URLs
- **Confidence scoring** — Each result includes confidence level (deterministic vs AI-judged)

### P2 (Nice to have / v2)
- **Visual regression** — Compare screenshots against baseline
- **Historical tracking** — Track which test plan items consistently pass/fail
- **Custom test plan format** — Support structured YAML/JSON test plans (not just markdown)
- **CLI for local runs** — Run Vigil locally before pushing
- **Team dashboard** — Aggregated quality metrics across repos
- **GitLab/Bitbucket support** — Multi-platform
- **Self-hosted runners** — Enterprise deployment option

## Competitive Advantage

| Competitor | Their approach | Vigil's advantage |
|-----------|---------------|-------------------|
| **Shortest** | NL tests in code files | No code to write — uses the test plan AI already generated |
| **testRigor** | NL tests in their platform ($900/mo) | No new platform — runs inside GitHub |
| **CodeRabbit** | Reviews code, suggests tests | Vigil EXECUTES tests, not just reviews |
| **Meticulous AI** | Replays recorded sessions | Vigil works Day 1 on new features — no prior sessions needed |
| **Momentic** | NL E2E tests in own platform | Zero onboarding — test plan already exists in the PR |
| **Octomind** | Crawls app to generate tests | Vigil tests what the AI SAID to test, not what it discovers |

**Core moat:** Zero workflow change. The AI agent already writes the test plan. Vigil is the only product that recognizes this artifact as a test specification and executes it.

## Recommended Tech Stack

| Layer | Technology | Why | Research backing |
|-------|-----------|-----|-----------------|
| Runtime | Node.js (TypeScript) | Matches target audience stack, Playwright native support | Industry standard for dev tools |
| GitHub Integration | Probot + Octokit | Purpose-built for GitHub Apps, handles webhooks/auth | GitHub official recommendation |
| NL Interpreter | Anthropic Claude API | Best at understanding nuanced test descriptions, vision for screenshots | Proven by Shortest |
| Browser Automation | Playwright | Multi-browser, built-in assertions, viewport emulation | Industry standard E2E |
| Task Queue | BullMQ + Redis | Reliable job processing, retries, concurrency control | Battle-tested in Node.js |
| Database | PostgreSQL | Execution logs, user/repo config, billing | Reliable, scalable |
| Hosting | Docker on Dokploy (self-managed) | User's existing infrastructure, cost-effective | User constraint |
| Domain/DNS | Vercel (keepvigil.dev) | Already purchased and managed there | User constraint |

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   GitHub PR      │────▶│  Vigil GitHub App │────▶│  Task Queue     │
│   (webhook)      │     │  (Probot)         │     │  (BullMQ/Redis) │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                           │
                         ┌─────────────────────────────────┘
                         ▼
              ┌─────────────────────┐
              │   Test Orchestrator  │
              │                     │
              │  1. Parse test plan │
              │  2. Classify items  │
              │  3. Generate specs  │
              │  4. Execute tests   │
              │  5. Collect results │
              └──────────┬──────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐
   │ Shell      │ │ Playwright │ │ HTTP/API   │
   │ Executor   │ │ Executor   │ │ Executor   │
   │ (build,    │ │ (UI flows, │ │ (API tests,│
   │  lint,     │ │  visual,   │ │  webhooks) │
   │  test)     │ │  viewport) │ │            │
   └────────────┘ └────────────┘ └────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Result Reporter    │
              │                     │
              │  - Check Runs       │
              │  - PR Comments      │
              │  - Screenshots      │
              │  - Evidence logs    │
              └─────────────────────┘
```

## Rabbit Holes (Shape Up concept)

| Rabbit Hole | Why it's dangerous | Mitigation |
|-------------|-------------------|------------|
| **NL ambiguity** | "Verify responsive" has infinite interpretations. Trying to make AI perfectly understand every test description is an infinite rabbit hole. | Don't try to be perfect. Classify confidence (HIGH/MEDIUM/LOW). Execute HIGH with full assertion. Report MEDIUM with screenshot evidence. Flag LOW as "needs human." |
| **Visual assertion accuracy** | "Button should look right" — what is "right"? Pixel-perfect comparison is fragile. | Use screenshots as EVIDENCE, not as pass/fail gates in v1. Let humans judge visual results. Graduate to AI vision comparison in v2. |
| **Preview deployment detection** | Every hosting provider has different preview URL patterns. Supporting all is an infinite list. | v1: Vercel + Netlify only. Accept preview URL as manual config for others. |
| **Test isolation** | Some test plan items depend on state from previous items (login → navigate → verify). | Treat each item as independent by default. Add `setup:` prefix support for dependencies. |
| **Flaky tests** | E2E tests are notoriously flaky. One flaky check will make users distrust Vigil forever. | Retry (3x). Screenshot on fail. Mark as "flaky" not "failed" on intermittent failures. Never block merge on flaky. |
| **Cost per PR** | Each execution = Claude API calls + browser time. Heavy repos could be expensive. | Token-based pricing. Cache common patterns. Batch API calls. |

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CodeRabbit adds test execution | Medium | High | Move fast. Build deep NL→test execution before they catch up. Their strength is review, not execution. |
| GitHub Copilot internalizes this | Medium | Critical | Be platform-agnostic long-term. Build brand and community before GitHub moves. |
| AI-generated test plans become more structured | Low | Medium | Support structured formats (YAML) alongside NL. Actually benefits Vigil — easier to parse. |
| Flaky tests erode trust | High | High | Conservative approach: only assert high-confidence checks. Use screenshots as evidence, not pass/fail. |
| Cost of Claude API makes pricing uncompetitive | Medium | Medium | Optimize prompts, cache patterns, use cheaper models for classification. |
| Users don't read Check Run results | Medium | Medium | Make results unmissable: inline PR comments, emoji summaries, block merge on failures. |

## Appetite

- **Total appetite:** 6 weeks of focused work to launch beta
- **MVP appetite:** 2-3 weeks to a working prototype (parser + shell executor + Check Runs)
- **If we had to cut:** Drop visual/viewport testing (P1), keep parser + command executor + API tester + Check Runs (P0)

## Estimated Complexity

**Overall project size:** Medium-Large
**Estimated number of implementation sections:** 8-12
