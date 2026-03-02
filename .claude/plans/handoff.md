# Vigil — Agent Handoff Document

**Generated:** 2026-03-02 | **Last updated:** 2026-03-02
**Purpose:** Comprehensive state dump for agent continuity. Read this before any session on the Vigil project.

---

## 1. What Is Vigil

A GitHub App that automatically executes AI-generated test plans from PR descriptions. It parses test plan checkboxes, classifies each item by confidence level, translates them into executable tests using Claude API + Playwright, and reports results as GitHub Check Runs.

**Tagline:** "Your test plans, actually tested."
**Domain:** https://keepvigil.dev (live, SSL via Traefik)
**Repo:** https://github.com/McMutteur/keepvigil (private)
**Local path:** `/Users/sotero/keepvigil`

---

## 2. Progress Snapshot

| # | Section | Status | PR | Notes |
|---|---------|--------|-----|-------|
| 1 | Project Bootstrap | ✅ Complete | n/a (initial commit) | pnpm monorepo, TypeScript, Vitest, ESLint, Drizzle |
| 2 | GitHub App Core | ✅ Complete | #1 merged (squash) | Probot 14, webhooks, Check Runs, BullMQ |
| 3 | Test Plan Parser | ✅ Complete | #2 merged (squash) | 33 tests, regex-based, 5 fixture files |
| 4 | Item Classifier | ✅ Complete | #3 merged (squash) | 35 tests, rule-based + Claude Haiku |
| 5 | Shell Executor | 🟡 In Review | #4 open | 48 tests, allowlist + Docker sandbox — **awaiting CodeRabbit + merge** |
| 6 | API Test Executor | 🔲 Pending | — | Can parallel with 5, 7 |
| 7 | Browser Test Executor | 🔲 Pending | — | Can parallel with 5, 6 |
| 8 | Result Reporter | 🔲 Pending | — | Can start after 5 |
| 9 | Orchestrator | 🔲 Pending | — | Needs all above |
| 10 | Deployment | 🔶 Partial | — | Phase A done (DNS, SSL, placeholder container) |

**Current test count:** 138 tests, 7 test files, all passing.

---

## 3. Mandatory Workflow Rules

1. **ALWAYS invoke `/protocol` before starting any section** — it defines branching, commit style, PR format, CodeRabbit loop.
2. **Branch format:** `feat/section-N-description`
3. **Commit format:** Conventional Commits — `feat(scope): description`
4. **Each section → feature branch → PR → CodeRabbit → user merges** (agents never merge to main)
5. **Wait for CodeRabbit, address actionable comments, disagree with justification on nitpicks**
6. **Language:** Conversations in Spanish, code/commits/docs in English

---

## 4. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Node.js 22 + TypeScript 5.8 | ESM throughout |
| Monorepo | pnpm workspaces | 3 packages: core, github, executors |
| GitHub App | Probot 14.x | Handles webhooks, Check Runs |
| NL Classifier | Claude Haiku (`claude-haiku-4-5-20251001`) | Section 4 classifier, future executors |
| NL Executor | Claude Sonnet | Sections 6, 7 — NL → test code |
| Browser | Playwright | Section 7, containerized |
| Queue | BullMQ 5.x + Redis 7 | Job processing with retries |
| Database | PostgreSQL 16 + Drizzle ORM | Migrations via drizzle-kit |
| Build | tsup | ESM + DTS per package |
| Tests | Vitest | Root-level config, workspace aliases |
| Linting | ESLint 10 (flat config) + Prettier | `pnpm lint` |

---

## 5. Monorepo Structure

```
keepvigil/
├── packages/
│   ├── core/                          # @vigil/core — shared types, parser, classifier
│   │   └── src/
│   │       ├── types.ts               # All shared types (TestPlanItem, ClassifiedItem, etc.)
│   │       ├── queue.ts               # BullMQ job types
│   │       ├── db/                    # Drizzle schema + migrations
│   │       │   ├── schema.ts          # installations, healthChecks tables
│   │       │   └── index.ts           # DB connection (pg Pool)
│   │       ├── parser/                # Section 3: Test Plan Parser
│   │       │   ├── index.ts           # parseTestPlan(markdown) → ParsedTestPlan
│   │       │   ├── section-detector.ts
│   │       │   ├── checkbox-parser.ts
│   │       │   └── prefix-extractor.ts
│   │       ├── classifier/            # Section 4: Item Classifier
│   │       │   ├── index.ts           # classifyItems(items, options) → ClassifiedItem[]
│   │       │   ├── rules.ts           # Rule-based pre-classifier (Manual, shell, HTTP)
│   │       │   ├── llm-classifier.ts  # Claude Haiku batch classifier
│   │       │   └── prompts.ts         # System prompt + few-shot examples
│   │       └── __tests__/
│   │           ├── parser.test.ts     # 33 tests
│   │           ├── classifier.test.ts # 35 tests
│   │           ├── health.test.ts     # 1 test
│   │           └── fixtures/          # simple.md, complex.md, real-world.md, etc.
│   │
│   ├── github/                        # @vigil/github — GitHub App (Probot)
│   │   └── src/
│   │       ├── app.ts                 # Probot app entry point
│   │       ├── server.ts              # HTTP server + /health endpoint (port 3200)
│   │       ├── config.ts              # Env var validation (zod)
│   │       ├── webhooks/
│   │       │   ├── pull-request.ts    # pull_request.opened/synchronized/edited handler
│   │       │   └── installation.ts    # App install/uninstall handler
│   │       ├── services/
│   │       │   ├── check-run.ts       # GitHub Check Run create/update
│   │       │   └── queue.ts           # BullMQ producer
│   │       └── utils/has-test-plan.ts # Quick regex gate (no full parse)
│   │
│   └── executors/                     # @vigil/executors — test runners (Section 5-7)
│       └── src/index.ts               # EMPTY — waiting for Sections 5-7
│
├── vitest.config.ts                   # Root Vitest config with package aliases
├── package.json                       # Root — pnpm workspaces, scripts
├── tsconfig.json                      # Root composite tsconfig
├── docker-compose.yml                 # App + Redis + PostgreSQL + Playwright
├── Dockerfile                         # Multi-stage Node build
├── .env.example                       # Template for env vars
└── .claude/plans/                     # Agent planning artifacts
    ├── master-plan-vigil.md           # Full implementation plan (sections 1-10)
    ├── handoff.md                     # This file
    ├── proposal-vigil.md              # Product proposal (approved)
    └── research-vigil.md              # Research findings
```

---

## 6. Key Types (packages/core/src/types.ts)

```typescript
// Section 3 output
interface TestPlanItem {
  id: string;          // "tp-0", "tp-1", ...
  text: string;        // Cleaned item text
  checked: boolean;    // [x] vs [ ]
  raw: string;         // Original markdown
  indent: number;      // Nesting level
  hints: TestPlanHints; // isManual, codeBlocks[], urls[]
}

// Section 4 output
type ConfidenceTier = "DETERMINISTIC" | "HIGH" | "MEDIUM" | "LOW" | "SKIP";
type ExecutorType = "shell" | "api" | "browser" | "none";
type CategoryLabel = "build" | "api" | "ui-flow" | "visual" | "metadata" | "manual" | "vague";

interface ClassifiedItem {
  item: TestPlanItem;
  confidence: ConfidenceTier;
  executorType: ExecutorType;
  category: CategoryLabel;
  reasoning: string;
}

// Section 5+ output (partial — will be extended)
interface ExecutionResult {
  itemId: string;
  passed: boolean;
  duration: number;
  evidence: Record<string, unknown>;
}
```

---

## 7. Package Exports (import paths)

```typescript
// Main barrel (types + parser + classifier)
import { parseTestPlan, classifyItems, ClassifiedItem } from "@vigil/core";

// Subpath exports
import { parseTestPlan } from "@vigil/core/parser";
import { classifyItems, applyRules } from "@vigil/core/classifier";
import { db, installations } from "@vigil/core/db";
import { VerifyTestPlanJob } from "@vigil/core/queue";
```

---

## 8. Section 4 Classifier — How It Works

The classifier runs two passes:

**Pass 1 — Rules (free, instant):**
| Pattern | Result |
|---------|--------|
| `hints.isManual = true` | SKIP / none / manual |
| Code block starting with `npm`, `pnpm`, `yarn`, `bun`, `ruff`, `docker`, `make`, `cargo`, `go`, `pytest`, `jest`, `vitest` | DETERMINISTIC / shell / build |
| Code block starting with `curl ` | HIGH / api / api |
| Text matches `\b(GET\|POST\|PUT\|PATCH\|DELETE\|HEAD\|OPTIONS)\s+\/\S+` | HIGH / api / api |
| Text matches `returns? [1-5]\d{2}` or `[45]xx` | HIGH / api / api |

**Pass 2 — Claude Haiku (batched):**
- Model: `claude-haiku-4-5-20251001`
- Single API call per batch, 10s timeout
- max_tokens = max(1024, items * 150)
- Falls back to LOW/none on any error
- Validates and normalizes JSON response

**Usage:**
```typescript
const items = parseTestPlan(prBody).items;
const classified = await classifyItems(items, {
  apiKey: process.env.ANTHROPIC_API_KEY,
  // rulesOnly: true  // skip LLM pass for testing
});
```

---

## 9. Section 5 — Shell Executor ✅ IN REVIEW (PR #4)

**Branch:** `feat/section-5-shell-executor` (pushed, PR #4 open)
**Depends on:** Sections 3, 4 (both complete)
**Tests:** 48 tests, all passing

### What it does
Execute `DETERMINISTIC/shell` classified items. Runs all `hints.codeBlocks` commands sequentially in a Docker sandbox. Stops on first failure.

### Files created
```
packages/executors/src/allowlist.ts       — validateCommand() — pure function, 13 allowlist patterns
packages/executors/src/sandbox.ts         — runInSandbox() — docker run wrapper (child_process.exec)
packages/executors/src/shell.ts           — executeShellItem(item, context) — orchestrator
packages/executors/src/__tests__/shell.test.ts — 48 tests
packages/core/src/types.ts               — Added ShellExecutionContext interface
```

### New type: ShellExecutionContext (in @vigil/core/types)
```typescript
interface ShellExecutionContext {
  repoPath: string;       // absolute path to cloned repo on host
  timeoutMs?: number;     // default: 300_000 (5 min)
  sandboxImage?: string;  // default: "node:22-alpine"
}
```

### Evidence shape (ExecutionResult.evidence)
```typescript
{
  commands: string[];   // all codeBlocks from the item
  stdout: string;
  stderr: string;
  exitCode: number;     // -1 = timeout
}
```

### Docker sandbox flags
`--network none --memory 512m --cpus 1 --rm -v repoPath:/workspace`

### Usage (from Section 9 orchestrator)
```typescript
import { executeShellItem } from "@vigil/executors";
import type { ShellExecutionContext } from "@vigil/core/types";

const result = await executeShellItem(classifiedItem, {
  repoPath: "/path/to/cloned/repo",
  timeoutMs: 300_000,
});
```

### Key gotcha: vi.hoisted() for node:child_process mocking
```typescript
// In tests — must use vi.hoisted, NOT const mockExec = vi.fn()
const mockExec = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ exec: mockExec }));
```

---

## 10. Section 6 — API Test Executor

**Branch:** `feat/section-6-api-executor` (can parallel with Section 5)
**Depends on:** Sections 3, 4

### What it does
Execute HIGH/api classified items. Parse NL like "POST /api/users returns 201" into HTTP requests using Claude Sonnet, execute against the preview deployment URL, assert response status/body.

### Key design decisions
- **Model:** Claude Sonnet (not Haiku) — NL → `{method, url, headers, body, expectedStatus, expectedBody}`
- **Preview URL source:** Injected by orchestrator (Section 9) from Vercel/Netlify deployment status
- **Evidence:** Full request + response captured
- **Chaining:** Items referencing previous responses (login → use token)

### Files to create
```
packages/executors/src/api.ts
packages/executors/src/api-spec-generator.ts  # Claude Sonnet: NL → HTTP spec
packages/executors/src/http-client.ts
packages/executors/src/assertions.ts
packages/executors/src/__tests__/api.test.ts
```

---

## 11. Section 7 — Browser Test Executor

**Branch:** `feat/section-7-browser-executor` (can parallel with 5, 6)
**Depends on:** Sections 3, 4

### What it does
Execute HIGH+MEDIUM/browser items. Use Claude Sonnet to generate Playwright code from NL descriptions, run in containerized browser, take screenshots.

### Key design decisions
- **Model:** Claude Sonnet — NL → Playwright actions
- **MEDIUM confidence:** screenshot evidence ONLY, no pass/fail assertion
- **HIGH confidence:** full assertion with pass/fail
- Retry up to 3 times on flaky failures
- 60-second timeout per item

### Files to create
```
packages/executors/src/browser.ts
packages/executors/src/playwright-generator.ts  # Claude Sonnet: NL → Playwright
packages/executors/src/screenshot.ts
packages/executors/src/metadata-checker.ts      # OG tags, JSON-LD
packages/executors/src/viewport.ts
packages/executors/src/__tests__/browser.test.ts
```

---

## 12. Section 8 — Result Reporter

**Branch:** `feat/section-8-reporter` (can start after Section 5)
**Depends on:** Sections 2, 5

### What it does
Takes `ExecutionResult[]` from all executors, updates the GitHub Check Run, posts a PR comment with evidence table.

### Conclusion logic
- ALL DETERMINISTIC items pass → `conclusion: success`
- ANY DETERMINISTIC item fails → `conclusion: failure`
- No DETERMINISTIC items, only MEDIUM/LOW issues → `conclusion: neutral`

### Key files to create
```
packages/github/src/services/reporter.ts
packages/github/src/services/check-run-updater.ts
packages/github/src/services/comment-builder.ts    # Markdown table with evidence
packages/github/src/services/screenshot-store.ts   # Upload + URL
packages/github/src/__tests__/reporter.test.ts
```

---

## 13. Section 9 — Orchestrator

**Branch:** `feat/section-9-orchestrator` (needs all above)

### What it does
BullMQ worker that processes `verify-test-plan` jobs. Full pipeline: clone repo → parse → classify → route to executors → report. Handles concurrency, cancellation, 10-minute timeout.

### DB schema extension needed
Add `executions` table to `packages/core/src/db/schema.ts`:
```typescript
executions table:
  id, installationId, prNumber, repo, sha, status,
  startedAt, completedAt, itemCount, passedCount, failedCount
```

### Key files to create
```
packages/github/src/worker.ts              # BullMQ worker entry point
packages/github/src/services/pipeline.ts  # Orchestration logic
packages/github/src/services/repo-clone.ts
packages/github/src/services/preview-url.ts  # Vercel/Netlify URL detection
packages/github/src/services/executor-router.ts
packages/github/src/__tests__/pipeline.test.ts
```

---

## 14. Infrastructure (Section 10 — Phase B)

**Pending after all code is built.**

### Current state (Phase A — DONE)
- Server: `161.97.97.243` (nqual5-services, Contabo)
- SSH key: `~/.ssh/id_ed25519_nqual5_services`
- Domain: `keepvigil.dev` → A record → server
- Traefik: file-based config at `/etc/dokploy/traefik/dynamic/keepvigil.yml`
- Container: `keepvigil-0p1rgp-vigil-1` on port 3200 (placeholder)
- Dokploy project: `iI3cqVLay6bqsqfl9gTCV`
- Compose service ID: `66cDXwWE7--R5KQqdo9It` (sourceType: raw)
- Endpoints: `https://keepvigil.dev` and `https://api.keepvigil.dev` — LIVE

### What Phase B needs
1. Replace placeholder container with full multi-service compose (app + Redis + PostgreSQL + Playwright)
2. Infisical secrets: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `REDIS_URL`
3. Register GitHub App: webhook at `https://keepvigil.dev/webhook`, permissions: `checks:write`, `pull_requests:read`, `contents:read`
4. Run Drizzle migrations against production PostgreSQL

### Critical notes for deployment
- **Traefik is FILE-BASED** — do NOT use Docker labels. Config in `/etc/dokploy/traefik/dynamic/`
- **No GitHub OAuth** on Nqual5 Dokploy — use `sourceType: "raw"` with inline compose YAML
- **Alpine sh** doesn't support heredocs — use `node -e '...'` for inline scripts

---

## 15. Common Gotchas & Patterns

### Dual tsconfig (CRITICAL for all packages)
Every package has TWO tsconfigs:
- `tsconfig.json` — `composite: true`, for IDE/project references
- `tsconfig.build.json` — no `composite`, for tsup DTS generation

If you add a new package, replicate this pattern exactly.

### pnpm esbuild builds
Root `package.json` must have:
```json
"pnpm": { "onlyBuiltDependencies": ["esbuild"] }
```
Without this, pnpm 10 blocks esbuild's native build and tsup fails.

### pg ESM import
```typescript
import pg from "pg";
const { Pool } = pg;  // NOT: import { Pool } from "pg"
```

### Vitest aliases
Every new package subpath needs an alias in `vitest.config.ts`:
```typescript
"@vigil/core/classifier": path.resolve(import.meta.dirname, "packages/core/src/classifier"),
```

### New package subpath exports
In `packages/core/package.json`:
```json
"./new-module": {
  "import": "./dist/new-module/index.js",
  "types": "./dist/new-module/index.d.ts"
}
```
And add the entry to the tsup `build` script.

---

## 16. Environment Variables

Required (from `.env.example`):

```bash
DATABASE_URL=postgresql://vigil:vigil@localhost:5432/vigil
REDIS_URL=redis://localhost:6379
GITHUB_APP_ID=<from GitHub App settings>
GITHUB_APP_PRIVATE_KEY=<PEM string>
GITHUB_WEBHOOK_SECRET=<webhook secret>
ANTHROPIC_API_KEY=<Anthropic API key>
PORT=3200
NODE_ENV=development
```

On production: managed via Infisical (`infisical secrets get KEY --env=prod --domain=https://secrets.nqual5.com`).

---

## 17. Quick Commands

```bash
cd /Users/sotero/keepvigil

# Build all packages
pnpm build

# Run all tests (90 tests, ~1.2s)
pnpm test

# Lint
pnpm lint

# TypeScript check
pnpm typecheck

# Run everything (quality gates)
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

---

## 18. Recommended Next Steps

**Optimal order (can parallelize 5, 6, 7):**

1. **Section 5 (Shell Executor)** — simplest executor, enables Section 8
2. **Section 8 (Result Reporter)** — can be built in parallel with 6 & 7
3. **Section 6 (API Executor)** — parallel with 8
4. **Section 7 (Browser Executor)** — parallel with 8, most complex
5. **Section 9 (Orchestrator)** — integrates everything
6. **Section 10 Phase B (Deployment)** — final

**If time-constrained, minimum viable path:**
Sections 5 → 8 → 9 → 10 gives a working product that handles DETERMINISTIC (shell) items only — the highest-value, lowest-risk subset.

---

## 19. Files to Read at Session Start

1. `/Users/sotero/keepvigil/.claude/plans/master-plan-vigil.md` — full section specs
2. `/Users/sotero/keepvigil/CLAUDE.md` — project identity, toolbox
3. `/Users/sotero/keepvigil/packages/core/src/types.ts` — shared types
4. The specific section you're implementing in `master-plan-vigil.md`
5. (if resuming) recent git log: `git log --oneline -10`
