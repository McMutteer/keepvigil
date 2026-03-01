# Vigil — Master Plan

## Changelog
| Date | Change |
|------|--------|
| 2026-03-01 | Initial plan created |
| 2026-03-01 | Section 10 Phase A complete (infrastructure foundation deployed during baptism) |
| 2026-03-01 | Section 1 complete (project bootstrap — pnpm monorepo, TypeScript, Vitest, ESLint, Drizzle, Docker) |

## Agent Onboarding
**If you are an agent starting a new session, read these files in order:**
1. This master plan (you're reading it)
2. `/CLAUDE.md` — project identity and toolbox
3. `.claude/plans/proposal-vigil.md` — the approved product proposal
4. `.claude/plans/research-vigil.md` — research findings and rationale
5. The specific section you're implementing

## Overview

Vigil is a GitHub App that automatically executes AI-generated test plans from pull requests. It parses test plan checkboxes from PR descriptions, classifies each item by confidence level, translates them into executable tests using Claude API + Playwright, and reports results as GitHub Check Runs. Zero configuration. Zero test files to maintain.

## Vision

A developer installs Vigil on their GitHub repo in one click. From that moment, every PR with a test plan gets automatically verified. The developer opens their PR, sees a Check Run from Vigil: "9/12 passed, 2 need human review, 1 failed — build command returns non-zero exit code." Each result includes evidence — screenshots, HTTP responses, command output. The unchecked boxes that were decoration are now real verification. The developer merges with confidence.

## Tech Stack

| Layer | Technology | Why | ADR |
|-------|-----------|-----|-----|
| Runtime | Node.js 22 + TypeScript 5.x | Target audience stack, Playwright native | - |
| GitHub Integration | Probot 13.x + Octokit | Purpose-built for GitHub Apps | [001](decisions/001-github-app-over-action.md) |
| NL Interpreter | Claude API (Haiku + Sonnet) | Best NL understanding, proven by Shortest | [002](decisions/002-claude-api-for-nl-interpretation.md) |
| Browser Automation | Playwright 1.x | Industry standard, multi-browser, viewport | - |
| Task Queue | BullMQ 5.x + Redis 7 | Reliable job processing, retries | - |
| Database | PostgreSQL 16 + Drizzle ORM | Execution logs, config, billing | - |
| Containerization | Docker + Docker Compose | Reproducible, Playwright needs container | - |
| Hosting | Dokploy on Contabo | User's existing infrastructure | - |
| DNS | Vercel (keepvigil.dev) | Already purchased | - |

## Constraints & Conventions

- **Constraints:**
  - All test execution happens in sandboxed Docker containers
  - Never access production environments
  - Maximum 10 minutes per PR execution
  - Maximum 20 test plan items per PR (soft limit, warn above)
- **Conventions:**
  - **MANDATORY:** Invoke `/protocol` before starting ANY section implementation
  - Monorepo structure: `packages/` for shared code
  - Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`)
  - Branch naming: `feat/section-N-name`, `fix/description`
  - Testing: Vitest for unit/integration tests
  - Each section = feature branch → PR → CodeRabbit review → user merges
  - Agents NEVER commit directly to `main` or merge PRs
- **Non-Goals:**
  - No multi-platform (GitHub only in v1)
  - No self-hosted option in v1
  - No visual regression (pixel comparison) in v1
  - No test authoring — only execution of existing plans

## Project Status

| # | Section | Depends On | Complexity | Confidence | Status |
|---|---------|------------|------------|------------|--------|
| 1 | Project Bootstrap | None | Low | GREEN | Complete |
| 2 | GitHub App Core | 1 | Medium | GREEN | Pending |
| 3 | Test Plan Parser | 1 | Medium | GREEN | Pending |
| 4 | Item Classifier | 3 | Medium | YELLOW | Pending |
| 5 | Shell Executor | 3, 4 | Low | GREEN | Pending |
| 6 | API Test Executor | 3, 4 | Medium | GREEN | Pending |
| 7 | Browser Test Executor | 3, 4 | High | YELLOW | Pending |
| 8 | Result Reporter | 2, 5 | Medium | GREEN | Pending |
| 9 | Orchestrator | 2, 3, 4, 5, 6, 7, 8 | High | YELLOW | Pending |
| 10 | Deployment & Infrastructure | 9 | Medium | GREEN | Partial (Phase A done) |

**Last updated:** 2026-03-01
**Sections complete:** 1 / 10

## Key Decisions

| # | Decision | ADR |
|---|----------|-----|
| 1 | GitHub App over GitHub Action | [001](decisions/001-github-app-over-action.md) |
| 2 | Claude API for NL interpretation | [002](decisions/002-claude-api-for-nl-interpretation.md) |
| 3 | Confidence-tiered execution | [003](decisions/003-confidence-tiered-execution.md) |

## Recommended Implementation Order

```
Section 1 (Bootstrap) ──────────────────────────────────────▶
    │
    ├── Section 2 (GitHub App Core) ────────────────────────▶
    │       │
    │       └── Section 8 (Result Reporter) ────────────────▶
    │
    ├── Section 3 (Parser) ─────────────────────────────────▶
    │       │
    │       └── Section 4 (Classifier) ─────────────────────▶
    │               │
    │               ├── Section 5 (Shell Executor) ─────────▶
    │               ├── Section 6 (API Executor) ───────────▶
    │               └── Section 7 (Browser Executor) ───────▶
    │
    └── After all above ──▶ Section 9 (Orchestrator) ───────▶
                                   │
                                   └── Section 10 (Deploy) ─▶
```

**Sections 2+3 can be developed in parallel.** Sections 5, 6, 7 can be developed in parallel after Section 4. Section 9 integrates everything. Section 10 deploys it.

---

## Section 1: Project Bootstrap

**Status:** Complete
**Depends on:** None
**Estimated complexity:** Low
**Confidence:** GREEN
**Relevant skills:** `/infisical`

### Context
Initialize the monorepo with TypeScript, set up the project structure, configure linting, testing, and development tooling. This is the foundation everything else builds on.

### Architecture
Monorepo with three main packages:
- `packages/core` — shared types, utilities, constants
- `packages/github` — GitHub App (Probot), webhooks, API
- `packages/executors` — test execution engines (shell, API, browser)

### Implementation Steps
1. Initialize the repo with `package.json` — name: `keepvigil`, private monorepo
2. Set up TypeScript config — `tsconfig.json` with strict mode, path aliases
3. Set up workspace structure — `packages/core`, `packages/github`, `packages/executors`
4. Configure Vitest for testing — `vitest.config.ts` at root
5. Configure ESLint + Prettier — consistent code style
6. Add Docker setup — `Dockerfile` + `docker-compose.yml` (Node + Redis + PostgreSQL)
7. Add `.env.example` with required env vars
8. Configure Drizzle ORM — database schema in `packages/core/src/db/`
9. Set up Infisical integration for secrets — `/infisical` skill

### Acceptance Criteria
- [ ] `npm install` succeeds
- [ ] `npm run build` compiles all packages
- [ ] `npm test` runs (empty test suite passes)
- [ ] `npm run lint` passes
- [ ] `docker compose up -d` starts Node + Redis + PostgreSQL
- [ ] Database migrations run successfully
- [ ] TypeScript path aliases resolve across packages

### Files to Create/Modify
| Action | File | Purpose |
|--------|------|---------|
| Create | `package.json` | Root workspace config |
| Create | `tsconfig.json` | TypeScript config |
| Create | `vitest.config.ts` | Test framework config |
| Create | `.eslintrc.js` | Linting rules |
| Create | `.prettierrc` | Formatting rules |
| Create | `Dockerfile` | Container build |
| Create | `docker-compose.yml` | Dev environment |
| Create | `.env.example` | Environment vars template |
| Create | `packages/core/package.json` | Core package |
| Create | `packages/core/src/index.ts` | Core exports |
| Create | `packages/core/src/db/schema.ts` | Database schema |
| Create | `packages/core/src/db/migrate.ts` | Migration runner |
| Create | `packages/github/package.json` | GitHub App package |
| Create | `packages/executors/package.json` | Executors package |

### Verification Gate
- [ ] All acceptance criteria met
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] `docker compose up -d` starts clean

### Anti-Patterns
- Do NOT use `npm` workspaces over `pnpm` — use pnpm for faster installs and better monorepo support
- Do NOT create a custom build system — use `tsup` for building packages
- Do NOT over-engineer the DB schema — start minimal, add tables as sections need them

### NOT in Scope
- Application logic — this is just project structure and tooling
- GitHub App registration — that's Section 2
- Any business logic

### Operational Notes
- **tsup + composite tsconfig conflict:** tsup DTS generation fails with `composite: true` tsconfig (TS6307 error). Solution: create a separate `tsconfig.build.json` without `composite` for each package, keep `composite: true` in the main `tsconfig.json` for project references/IDE support.
- **pnpm esbuild builds:** pnpm 10 blocks build scripts by default. Add `"pnpm": { "onlyBuiltDependencies": ["esbuild"] }` to root package.json.
- **pg ESM import:** `import pg from "pg"; const { Pool } = pg;` — pg is CJS, needs destructuring from default import in ESM context.
- **Docker not required for bootstrap:** `drizzle-kit generate` works without a running database. Migrations can be applied later when Docker is available.

---

## Section 2: GitHub App Core

**Status:** Pending
**Depends on:** Section 1
**Estimated complexity:** Medium
**Confidence:** GREEN

### Context
Build the GitHub App that receives webhooks when PRs are opened/updated. This is the entry point — it listens for PR events and kicks off the test plan verification pipeline. Uses Probot framework for simplified GitHub App development.

### Architecture
- **Probot app** receives `pull_request.opened`, `pull_request.synchronize`, `pull_request.edited` webhooks
- Extracts PR metadata (number, repo, description, head SHA)
- Creates an initial "pending" Check Run
- Enqueues a job in BullMQ for async processing
- Handles installation/uninstallation events

### Implementation Steps
1. Register a GitHub App on github.com/settings/apps — permissions: `checks:write`, `pull_requests:read`, `contents:read`
2. Create the Probot app in `packages/github/src/app.ts`
3. Implement webhook handlers for `pull_request` events
4. Create Check Run on PR open — status "queued"
5. Implement BullMQ producer — enqueue `verify-test-plan` job with PR context
6. Handle GitHub App installation/uninstallation — store in DB
7. Implement rate limiting and error handling
8. Add health check endpoint at `/health`

### Acceptance Criteria
- [ ] App starts and connects to GitHub via Probot
- [ ] `pull_request.opened` event creates a "pending" Check Run on the PR
- [ ] `pull_request.synchronize` (new push) re-triggers verification
- [ ] `pull_request.edited` (description changed) re-triggers verification
- [ ] Job is enqueued in BullMQ with correct PR context
- [ ] App handles missing/empty test plan gracefully (no Check Run created)
- [ ] Installation event stores repo info in database
- [ ] `/health` returns 200

### Files to Create/Modify
| Action | File | Purpose |
|--------|------|---------|
| Create | `packages/github/src/app.ts` | Main Probot app |
| Create | `packages/github/src/webhooks/pull-request.ts` | PR event handler |
| Create | `packages/github/src/webhooks/installation.ts` | Installation handler |
| Create | `packages/github/src/services/check-run.ts` | Check Run creation/update |
| Create | `packages/github/src/services/queue.ts` | BullMQ producer |
| Create | `packages/github/src/server.ts` | HTTP server + health check |
| Modify | `packages/core/src/db/schema.ts` | Add installations table |
| Create | `packages/github/src/__tests__/pull-request.test.ts` | Webhook handler tests |

### Verification Gate
- [ ] All acceptance criteria met
- [ ] Unit tests pass for webhook handlers (mocked GitHub API)
- [ ] Integration test: send fake webhook → job appears in queue
- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes

### Anti-Patterns
- Do NOT process test plans synchronously in the webhook handler — always enqueue
- Do NOT hardcode GitHub App credentials — use env vars via Infisical
- Do NOT create Check Runs for PRs without test plan sections

### NOT in Scope
- Test plan parsing (Section 3)
- Test execution (Sections 5-7)
- Result reporting details (Section 8)

---

## Section 3: Test Plan Parser

**Status:** Pending
**Depends on:** Section 1
**Estimated complexity:** Medium
**Confidence:** GREEN

### Context
Parse the test plan section from a PR description (markdown). Extract individual test items, their checked/unchecked status, and any structural information (grouping, prefixes like "Manual:").

### Architecture
- Input: PR description (raw markdown string)
- Output: Array of `TestPlanItem` objects with text, status, category hints
- Pure function — no side effects, no API calls, fully deterministic
- Must handle: markdown checkboxes, nested lists, section headers, inline code, "Manual:" prefix

### Implementation Steps
1. Create `TestPlanItem` type in `packages/core/src/types.ts`
2. Implement section detector — find `## Test plan` / `## Test Plan` section in markdown
3. Implement checkbox parser — extract `- [ ]` and `- [x]` items
4. Implement prefix extractor — detect "Manual:", inline code blocks (commands), URLs
5. Handle edge cases — nested checkboxes, multi-line items, empty sections
6. Add comprehensive test suite with real examples from McMutteer repos

### Acceptance Criteria
- [ ] Correctly finds "Test plan" section in markdown (case-insensitive)
- [ ] Extracts all checkbox items as `TestPlanItem[]`
- [ ] Distinguishes checked `[x]` from unchecked `[ ]`
- [ ] Detects "Manual:" prefix
- [ ] Extracts inline code as potential commands (e.g., `` `npm run build` ``)
- [ ] Handles multi-line items (continuation of a checkbox)
- [ ] Returns empty array when no test plan section exists
- [ ] Returns empty array when test plan has no checkboxes
- [ ] Handles real-world PR descriptions from nqual5, binance-trading-platform, console-miia

### Files to Create/Modify
| Action | File | Purpose |
|--------|------|---------|
| Modify | `packages/core/src/types.ts` | TestPlanItem, ParsedTestPlan types |
| Create | `packages/core/src/parser/index.ts` | Main parser entry point |
| Create | `packages/core/src/parser/section-detector.ts` | Find test plan section |
| Create | `packages/core/src/parser/checkbox-parser.ts` | Parse checkbox items |
| Create | `packages/core/src/parser/prefix-extractor.ts` | Extract hints (Manual:, commands, URLs) |
| Create | `packages/core/src/__tests__/parser.test.ts` | Parser test suite |
| Create | `packages/core/src/__tests__/fixtures/` | Real PR descriptions as test fixtures |

### Verification Gate
- [ ] All acceptance criteria met
- [ ] 15+ test cases covering real PR descriptions
- [ ] 100% branch coverage on parser
- [ ] `npm test` passes
- [ ] `npm run build` succeeds

### Anti-Patterns
- Do NOT use regex for markdown parsing — use a proper markdown AST parser (remark/unified) or at minimum well-tested regex patterns
- Do NOT make assumptions about section header format — handle `##`, `###`, bold, etc.
- Do NOT use LLM for parsing — this is deterministic, save the LLM budget for classification

### NOT in Scope
- Classifying items by type (Section 4)
- Executing items (Sections 5-7)
- Structured test plan formats (YAML/JSON — v2)

---

## Section 4: Item Classifier

**Status:** Pending
**Depends on:** Section 3
**Estimated complexity:** Medium
**Confidence:** YELLOW

### Context
Classify each parsed test plan item into a category (build, UI, API, visual, metadata, manual) and a confidence tier (DETERMINISTIC, HIGH, MEDIUM, LOW, SKIP). This determines which executor handles the item and how results are reported. Uses Claude API for classification.

See [ADR 003](decisions/003-confidence-tiered-execution.md) for the confidence tier strategy.

### Architecture
- Input: `TestPlanItem` (text + prefix hints from parser)
- Output: `ClassifiedItem` with `category`, `confidence`, `executorType`, and `testSpec`
- Two-pass classification:
  1. **Rule-based pre-classification** — items with inline code commands → DETERMINISTIC/shell, items with "Manual:" → SKIP
  2. **LLM classification** — remaining items sent to Claude Haiku for categorization

### Implementation Steps
1. Create `ClassifiedItem` type in `packages/core/src/types.ts`
2. Implement rule-based classifier — detect shell commands, API calls, "Manual:" prefix
3. Implement Claude Haiku classifier — batch classify remaining items
4. Design the classification prompt — few-shot with examples from real PRs
5. Implement test spec generation — for each classified item, produce an execution spec
6. Add fallback for API failures — classify as LOW confidence

### Acceptance Criteria
- [ ] Items with inline code commands (`` `npm run build` ``) classified as DETERMINISTIC/shell
- [ ] Items with HTTP verbs (POST, GET, PUT) classified as HIGH/api
- [ ] Items with UI interactions ("click", "navigate", "verify page") classified as HIGH/browser
- [ ] Items with visual descriptions ("skeleton appears", "animation smooth") classified as MEDIUM/browser
- [ ] Items prefixed "Manual:" classified as SKIP
- [ ] Items that are vague ("verify it works") classified as LOW
- [ ] Classification completes in <2 seconds for 15 items (batched)
- [ ] Graceful fallback when Claude API is unavailable

### Files to Create/Modify
| Action | File | Purpose |
|--------|------|---------|
| Modify | `packages/core/src/types.ts` | ClassifiedItem, ExecutorType, ConfidenceTier |
| Create | `packages/core/src/classifier/index.ts` | Main classifier |
| Create | `packages/core/src/classifier/rules.ts` | Rule-based pre-classification |
| Create | `packages/core/src/classifier/llm-classifier.ts` | Claude Haiku classifier |
| Create | `packages/core/src/classifier/prompts.ts` | Classification prompts |
| Create | `packages/core/src/__tests__/classifier.test.ts` | Classifier tests |

### Verification Gate
- [ ] All acceptance criteria met
- [ ] Correctly classifies 20+ real test plan items from fixture data
- [ ] Unit tests pass (with mocked Claude API)
- [ ] `npm test` passes
- [ ] `npm run build` succeeds

### Anti-Patterns
- Do NOT use Sonnet for classification — Haiku is sufficient and 10x cheaper
- Do NOT classify one item at a time — batch all items in one API call
- Do NOT retry classification more than once — fallback to LOW

### NOT in Scope
- Executing the classified items (Sections 5-7)
- Fine-tuning the classifier (iterative improvement is post-launch)

---

## Section 5: Shell Executor

**Status:** Pending
**Depends on:** Sections 3, 4
**Estimated complexity:** Low
**Confidence:** GREEN

### Context
Execute DETERMINISTIC items that are shell commands — `npm run build`, `npm test`, `ruff check .`, `docker build .`, etc. These are the highest-confidence items and the simplest to execute. They produce a clear pass/fail result based on exit code.

### Architecture
- Input: `ClassifiedItem` with `executorType: 'shell'` and extracted command
- Output: `ExecutionResult` with pass/fail, stdout, stderr, exit code, duration
- Runs commands in a sandboxed Docker container with the PR's code checked out
- Timeout: 5 minutes per command

### Implementation Steps
1. Create `ExecutionResult` type in `packages/core/src/types.ts`
2. Implement shell executor in `packages/executors/src/shell.ts`
3. Add Docker sandbox — run commands inside a container with the repo cloned
4. Implement timeout handling — kill after 5 minutes
5. Capture stdout, stderr, exit code
6. Parse common command outputs (test count, lint errors)

### Acceptance Criteria
- [ ] Executes `npm run build` and reports pass (exit 0) / fail (exit non-zero)
- [ ] Captures stdout and stderr in result
- [ ] Times out after 5 minutes and reports as failed
- [ ] Does not execute dangerous commands (rm -rf, curl to external, etc.) — allowlist approach
- [ ] Reports execution duration in milliseconds

### Files to Create/Modify
| Action | File | Purpose |
|--------|------|---------|
| Modify | `packages/core/src/types.ts` | ExecutionResult type |
| Create | `packages/executors/src/shell.ts` | Shell command executor |
| Create | `packages/executors/src/sandbox.ts` | Docker sandbox manager |
| Create | `packages/executors/src/allowlist.ts` | Command allowlist |
| Create | `packages/executors/src/__tests__/shell.test.ts` | Shell executor tests |

### Verification Gate
- [ ] All acceptance criteria met
- [ ] Tests pass with real commands in Docker
- [ ] Dangerous commands are blocked
- [ ] `npm test` passes
- [ ] `npm run build` succeeds

### Anti-Patterns
- Do NOT execute arbitrary commands — use an allowlist of safe command patterns
- Do NOT run commands on the host — always in a Docker sandbox
- Do NOT let commands run indefinitely — enforce timeout

### NOT in Scope
- Browser-based testing (Section 7)
- API testing (Section 6)
- Command output intelligence (understanding what lint errors mean)

---

## Section 6: API Test Executor

**Status:** Pending
**Depends on:** Sections 3, 4
**Estimated complexity:** Medium
**Confidence:** GREEN

### Context
Execute test plan items that involve HTTP API calls — "POST /api/users returns 201", "GET /health returns 200", "Send 6 requests → 6th returns 429". These items reference specific endpoints, HTTP methods, and expected status codes or response shapes.

### Architecture
- Input: `ClassifiedItem` with `executorType: 'api'` and extracted endpoint info
- Output: `ExecutionResult` with pass/fail, request/response details, duration
- Uses Claude Sonnet to generate the HTTP request specification from NL
- Executes against the preview deployment URL
- Supports chained requests (login → use token → verify)

### Implementation Steps
1. Implement API executor in `packages/executors/src/api.ts`
2. Create request spec generator — Claude Sonnet translates NL to `{method, url, headers, body, expectedStatus, expectedBody}`
3. Implement HTTP client — `fetch` with timeout, retries
4. Implement assertion engine — status code, response body shape, specific field values
5. Implement request chaining — items that reference previous responses
6. Capture full request/response as evidence

### Acceptance Criteria
- [ ] Executes `POST /api/users` with generated body and asserts `201` response
- [ ] Handles `GET /health` → `200` simple checks
- [ ] Detects expected status codes from NL ("returns 429", "expect 404", "should return 201")
- [ ] Captures full request and response in evidence
- [ ] Times out after 30 seconds per request
- [ ] Reports detailed failure reason on assertion mismatch

### Files to Create/Modify
| Action | File | Purpose |
|--------|------|---------|
| Create | `packages/executors/src/api.ts` | API test executor |
| Create | `packages/executors/src/api-spec-generator.ts` | NL → HTTP spec via Claude |
| Create | `packages/executors/src/http-client.ts` | HTTP client with retries |
| Create | `packages/executors/src/assertions.ts` | Response assertion engine |
| Create | `packages/executors/src/__tests__/api.test.ts` | API executor tests |

### Verification Gate
- [ ] All acceptance criteria met
- [ ] Tests pass with mocked HTTP server
- [ ] `npm test` passes
- [ ] `npm run build` succeeds

### Anti-Patterns
- Do NOT make requests to production URLs — only preview deployments
- Do NOT hardcode base URLs — derive from preview deployment context
- Do NOT skip response body capture — it's essential evidence

### NOT in Scope
- WebSocket testing
- GraphQL-specific testing
- Authentication flow testing (v2)

---

## Section 7: Browser Test Executor

**Status:** Pending
**Depends on:** Sections 3, 4
**Estimated complexity:** High
**Confidence:** YELLOW

### Context
Execute test plan items that require a real browser — UI flows ("click login → verify dashboard"), visual checks ("skeleton appears before content"), viewport testing ("mobile 320px: no overflow"), and metadata verification (OG tags, JSON-LD). This is the most complex executor and the core differentiator of Vigil.

### Architecture
- Input: `ClassifiedItem` with `executorType: 'browser'` and NL description
- Output: `ExecutionResult` with pass/fail, screenshots, console logs, DOM snapshots
- Uses Claude Sonnet to generate Playwright test code from NL description
- Executes generated Playwright code in containerized browser
- Takes screenshots at key moments as evidence
- For MEDIUM confidence items: takes screenshot but does NOT assert pass/fail — presents evidence for human review

### Implementation Steps
1. Implement browser executor in `packages/executors/src/browser.ts`
2. Create Playwright code generator — Claude Sonnet translates NL to Playwright actions
3. Implement screenshot capture — before/after each action, on failure
4. Implement viewport testing — set viewport size, check for overflow
5. Implement metadata checker — parse HTML for OG tags, JSON-LD, sitemap
6. Implement console log capture — collect browser console output
7. Implement retry logic — retry flaky tests up to 3 times
8. Handle MEDIUM confidence — screenshot only, no pass/fail assertion

### Acceptance Criteria
- [ ] Navigates to a URL and executes a click-verify flow
- [ ] Takes screenshots at key moments (before action, after action, on failure)
- [ ] Tests viewport at specified breakpoints (320px, 768px, 1024px)
- [ ] Validates OG meta tags exist and have expected values
- [ ] Validates JSON-LD is valid JSON and contains required fields
- [ ] Captures browser console errors
- [ ] Retries up to 3 times on flaky failures
- [ ] MEDIUM confidence items produce screenshots but no pass/fail gate
- [ ] Times out after 60 seconds per test item

### Files to Create/Modify
| Action | File | Purpose |
|--------|------|---------|
| Create | `packages/executors/src/browser.ts` | Browser test executor |
| Create | `packages/executors/src/playwright-generator.ts` | NL → Playwright code via Claude |
| Create | `packages/executors/src/screenshot.ts` | Screenshot capture and storage |
| Create | `packages/executors/src/metadata-checker.ts` | OG tags, JSON-LD, sitemap validation |
| Create | `packages/executors/src/viewport.ts` | Viewport/responsive testing |
| Create | `packages/executors/src/__tests__/browser.test.ts` | Browser executor tests |

### Verification Gate
- [ ] All acceptance criteria met
- [ ] Tests pass with real Playwright (needs Docker)
- [ ] Screenshots are captured and accessible
- [ ] `npm test` passes
- [ ] `npm run build` succeeds

### Anti-Patterns
- Do NOT try to make AI perfectly judge visual correctness — take screenshots as evidence, let humans decide
- Do NOT generate overly complex Playwright code — simple, linear actions only
- Do NOT navigate outside the preview deployment domain — security boundary
- Do NOT assert on MEDIUM confidence items — evidence only

### NOT in Scope
- Visual regression (pixel comparison with baseline) — v2
- Mobile touch emulation beyond basic tap — v2
- Video recording — v2
- Accessibility testing (axe-core) — v2 but low-hanging fruit

---

## Section 8: Result Reporter

**Status:** Pending
**Depends on:** Section 2, Section 5 (at minimum)
**Estimated complexity:** Medium
**Confidence:** GREEN

### Context
Take execution results from all executors and report them back to the GitHub PR. Creates/updates Check Runs with detailed results, posts a summary comment with evidence, and optionally updates checkbox status in the PR description.

### Architecture
- Input: Array of `ExecutionResult` objects from all executors
- Output: GitHub Check Run (updated), PR comment, optionally updated PR description
- Check Run includes: summary, annotations per item, conclusion (success/failure/neutral)
- PR comment includes: table of results, expandable evidence sections, screenshots
- Screenshots uploaded to a persistent store (S3-compatible or GitHub artifact)

### Implementation Steps
1. Implement result aggregator — combine results from all executors
2. Implement Check Run updater — update the "pending" check with results
3. Design the Check Run summary format — clear, scannable
4. Implement PR comment builder — markdown table with evidence
5. Implement screenshot embedding — upload to storage, embed URLs in comment
6. Implement conclusion logic — success only if ALL deterministic items pass
7. Handle partial results — report what completed if some items timed out

### Acceptance Criteria
- [ ] Check Run updated with `conclusion: success` when all DETERMINISTIC items pass
- [ ] Check Run updated with `conclusion: failure` when any DETERMINISTIC item fails
- [ ] Check Run updated with `conclusion: neutral` when only MEDIUM/LOW items have issues
- [ ] PR comment posted with result table (item, status, confidence, evidence link)
- [ ] Screenshots accessible via URL in the comment
- [ ] SKIP items listed separately with "needs human" label
- [ ] Summary shows counts: "9 passed, 1 failed, 2 need review"

### Files to Create/Modify
| Action | File | Purpose |
|--------|------|---------|
| Create | `packages/github/src/services/reporter.ts` | Result reporter |
| Create | `packages/github/src/services/check-run-updater.ts` | Check Run update logic |
| Create | `packages/github/src/services/comment-builder.ts` | PR comment markdown builder |
| Create | `packages/github/src/services/screenshot-store.ts` | Screenshot upload/URL |
| Create | `packages/github/src/__tests__/reporter.test.ts` | Reporter tests |

### Verification Gate
- [ ] All acceptance criteria met
- [ ] Check Run output matches expected format
- [ ] PR comment renders correctly in GitHub
- [ ] Screenshots are accessible via URLs
- [ ] `npm test` passes
- [ ] `npm run build` succeeds

### Anti-Patterns
- Do NOT block merge on MEDIUM/LOW confidence failures — only DETERMINISTIC
- Do NOT create excessively long comments — use collapsible sections for evidence
- Do NOT update PR description checkboxes without user opt-in

### NOT in Scope
- Dashboard/web UI for results (v2)
- Email/Slack notifications (v2)
- Historical tracking across PRs (v2)

---

## Section 9: Orchestrator

**Status:** Pending
**Depends on:** Sections 2, 3, 4, 5, 6, 7, 8
**Estimated complexity:** High
**Confidence:** YELLOW

### Context
The orchestrator is the brain — it connects the GitHub App, parser, classifier, executors, and reporter into a single pipeline. It's the BullMQ worker that processes `verify-test-plan` jobs. It coordinates the full lifecycle: parse → classify → execute → report.

### Architecture
- BullMQ worker consumes `verify-test-plan` jobs
- Pipeline: Clone repo → Parse PR description → Classify items → Route to executors → Collect results → Report
- Handles concurrency (one execution per PR, queue subsequent)
- Handles cancellation (new push to same PR cancels in-progress execution)
- Error handling at every stage with graceful degradation

### Implementation Steps
1. Implement BullMQ worker in `packages/github/src/worker.ts`
2. Implement pipeline orchestration — sequential stages with error handling
3. Implement repo cloning — clone PR branch into Docker volume
4. Implement preview URL detection — Vercel/Netlify deployment status
5. Route classified items to appropriate executors
6. Implement concurrency control — one active execution per PR
7. Implement cancellation — abort on new push
8. Implement timeout — 10 minute maximum per execution
9. Aggregate results and call reporter

### Acceptance Criteria
- [ ] Worker processes jobs from BullMQ queue
- [ ] Full pipeline executes: parse → classify → execute → report
- [ ] Correctly routes items to shell/api/browser executors
- [ ] Detects Vercel preview deployment URL from PR checks/deployments
- [ ] New push to same PR cancels in-progress execution
- [ ] Handles executor failures gracefully — reports partial results
- [ ] Respects 10-minute total timeout
- [ ] Logs structured execution data to PostgreSQL

### Files to Create/Modify
| Action | File | Purpose |
|--------|------|---------|
| Create | `packages/github/src/worker.ts` | BullMQ worker |
| Create | `packages/github/src/services/pipeline.ts` | Pipeline orchestration |
| Create | `packages/github/src/services/repo-clone.ts` | Git clone into Docker volume |
| Create | `packages/github/src/services/preview-url.ts` | Preview URL detection |
| Create | `packages/github/src/services/executor-router.ts` | Route items to executors |
| Modify | `packages/core/src/db/schema.ts` | Add executions table |
| Create | `packages/github/src/__tests__/pipeline.test.ts` | Pipeline integration tests |

### Verification Gate
- [ ] All acceptance criteria met
- [ ] Integration test: fake PR webhook → full pipeline → Check Run updated
- [ ] Cancellation works correctly
- [ ] Partial results reported on timeout
- [ ] `npm test` passes
- [ ] `npm run build` succeeds

### Anti-Patterns
- Do NOT process items sequentially — parallelize independent items within an executor type
- Do NOT retry the entire pipeline on failure — retry at the individual item level
- Do NOT hold the queue — release the worker after timeout even if items remain

### NOT in Scope
- Billing/metering (post-MVP)
- Rate limiting per user (post-MVP)
- Multi-repo parallel execution (post-MVP)

---

## Section 10: Deployment & Infrastructure

**Status:** Partial (Phase A complete)
**Depends on:** Section 9
**Estimated complexity:** Medium
**Confidence:** GREEN
**Relevant skills:** `/dokploy`, `/infisical`, `/vercel`

### Context
Deploy Vigil to production on the user's Dokploy infrastructure. This section has two phases: infrastructure foundation (completed during baptism) and production deployment (after all code is built).

### Architecture
- Docker Compose deployment on Dokploy (Contabo server at 161.97.97.243)
- Services: Vigil App, Redis, PostgreSQL, Playwright container
- Domain: keepvigil.dev → 161.97.97.243
- SSL: Let's Encrypt via Traefik file-based routing
- Secrets: Managed via Infisical
- Routing: File-based Traefik config at `/etc/dokploy/traefik/dynamic/keepvigil.yml` on the server

### Phase A — Infrastructure Foundation (COMPLETE ✓)

Completed 2026-03-01 during baptism. Do NOT redo these steps.

- [x] DNS configured in Vercel: `keepvigil.dev` A → 161.97.97.243, `www` CNAME → keepvigil.dev, `api` A → 161.97.97.243
- [x] Dokploy project created: "Vigil" (ID: `iI3cqVLay6bqsqfl9gTCV`), Org: Nqual5
- [x] Dokploy compose service created (ID: `66cDXwWE7--R5KQqdo9It`, sourceType: raw)
- [x] Traefik file-based routing configured at `/etc/dokploy/traefik/dynamic/keepvigil.yml`
- [x] SSL: Let's Encrypt certificates auto-provisioned via Traefik certresolver
- [x] Placeholder container running: `keepvigil-0p1rgp-vigil-1` on port 3200
- [x] Health endpoint responding at `https://keepvigil.dev/health`
- [x] Both `https://keepvigil.dev` and `https://api.keepvigil.dev` verified live

### Phase B — Production Deployment (PENDING)

Implementation steps after Sections 1-9 are complete:

1. Update Dokploy raw compose — replace placeholder with production multi-service config (Vigil App + Redis + PostgreSQL + Playwright)
2. Configure production environment — update Traefik config if ports change
3. Set up PostgreSQL — production database with volume persistence and backups
4. Set up Redis — production instance for BullMQ with persistence
5. Configure secrets in Infisical — create `keepvigil` project with: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `REDIS_URL`
6. Register GitHub App for production — webhook URL at `https://keepvigil.dev/webhook`, permissions: `checks:write`, `pull_requests:read`, `contents:read`
7. Configure Playwright container — browsers installed, sandboxed, shared volume with app
8. Run database migrations — Drizzle ORM push to production PostgreSQL
9. End-to-end smoke test — install App on a test repo, open a PR, verify full pipeline

### Acceptance Criteria
- [x] `keepvigil.dev` resolves to the server (Phase A)
- [x] HTTPS works with valid SSL certificate (Phase A)
- [ ] GitHub App webhook endpoint responds at `https://keepvigil.dev/webhook`
- [ ] All services healthy: app, Redis, PostgreSQL, Playwright
- [ ] GitHub App installable from marketplace/settings
- [ ] End-to-end: PR with test plan → Check Run appears with results
- [ ] Secrets managed via Infisical, not hardcoded

### Files to Create/Modify
| Action | File | Purpose |
|--------|------|---------|
| Modify | `docker-compose.yml` | Production multi-service config |
| Create | `.github/workflows/deploy.yml` | CI/CD pipeline |
| Modify | `.env.example` | Production env vars template |

### Verification Gate
- [x] DNS resolves correctly (Phase A)
- [x] SSL certificate valid (Phase A)
- [ ] All acceptance criteria met
- [ ] End-to-end test on real GitHub PR
- [ ] All service health checks pass
- [ ] No secrets in code or logs

### Operational Notes
Lessons learned during Phase A deployment:
- **Traefik routing is FILE-BASED on nqual5-services**, NOT Docker labels. All existing routers use `@file` provider. Config goes in `/etc/dokploy/traefik/dynamic/`
- **Dokploy Nqual5 org has no GitHub OAuth** — `githubId: null`. Must use `sourceType: "raw"` with inline compose YAML
- **SSH key**: `~/.ssh/id_ed25519_nqual5_services` (NOT `id_ed25519_dokploy`)
- **Alpine busybox sh doesn't support heredocs** — use `node -e '...'` for inline scripts in Dockerfiles
- **Container name**: `keepvigil-0p1rgp-vigil-1` — Dokploy generates `{appName}-{service}-{replica}` format

### Anti-Patterns
- Do NOT expose PostgreSQL or Redis ports to the internet
- Do NOT store secrets in docker-compose.yml — use Infisical
- Do NOT skip health checks — every service needs one
- Do NOT use Docker labels for Traefik routing — use file-based config on this server
- Do NOT try to use `sourceType: github` on Nqual5 Dokploy — no GitHub OAuth configured

### NOT in Scope
- Auto-scaling (single server is fine for launch)
- CDN (not serving static content)
- Monitoring/alerting dashboards (post-launch)

---

## Related Documents

- Research: `.claude/plans/research-vigil.md`
- Proposal: `.claude/plans/proposal-vigil.md`
- Decisions: `.claude/plans/decisions/`

## Global Verification

Steps to verify the ENTIRE project is complete:
1. All 10 section verification gates pass
2. Full test suite passes: `npm test`
3. Build succeeds: `npm run build`
4. Docker Compose starts clean: `docker compose up -d`
5. Manual smoke test:
   - Install Vigil GitHub App on a test repo
   - Create a PR with a test plan section containing 5+ items
   - Verify Check Run appears within 60 seconds
   - Verify results are accurate for at least 3 item types (shell, API, browser)
   - Verify screenshots are embedded in PR comment
6. Uninstall and reinstall — verify clean state
