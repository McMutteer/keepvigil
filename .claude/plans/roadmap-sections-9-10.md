# Vigil — Roadmap: Sections 9 & 10

**Generated:** 2026-03-03
**Project state when written:** 8/10 sections complete. PRs #1–#8 merged. Quality gates green (261 tests).
**Purpose:** Implementation spec for another agent. Contains everything needed to build the Orchestrator and deploy to production without reading prior sessions.

---

## Current State (8/10 Done)

| # | Section | Status | Notes |
|---|---------|--------|-------|
| 1 | Bootstrap | ✅ | pnpm monorepo, tsup, Vitest, Docker |
| 2 | GitHub App Core | ✅ | Probot 14, webhooks, BullMQ producer |
| 3 | Test Plan Parser | ✅ | Regex-based, 33 tests |
| 4 | Item Classifier | ✅ | Rule-based + Claude Haiku, 35 tests |
| 5 | Shell Executor | ✅ | Docker sandbox, allowlist, 12 safe npx tools |
| 6 | API Test Executor | ✅ | HTTP requests, Claude Haiku spec gen |
| 7 | Browser Test Executor | ✅ | Playwright, metadata/OG checks |
| 8 | Result Reporter | ✅ | Check Runs + PR comments, 65 tests |
| 9 | **Orchestrator** | ⏳ | BullMQ worker, pipeline, repo-clone, preview URL |
| 10 | **Deployment** | ⏳ | Phase A done (DNS/SSL/Traefik). Phase B pending. |

### Package Exports — What Exists Now

**`@vigil/core`** exports:
```typescript
// Types
TestPlanItem, ParsedTestPlan, TestPlanHints
ClassifiedItem, ConfidenceLevel, ExecutorType
ExecutionResult
VerifyTestPlanJob, QUEUE_NAMES

// Functions
parseTestPlan(body: string): ParsedTestPlan
classifyItems(items: TestPlanItem[], apiKey: string): Promise<ClassifiedItem[]>
enqueueVerification(job: VerifyTestPlanJob): Promise<void>
initQueue(redisUrl: string): void
closeQueue(): Promise<void>
```

**`@vigil/executors`** exports:
```typescript
executeShellItem(item: ClassifiedItem, ctx: ShellExecutionContext): Promise<ExecutionResult>
executeApiItem(item: ClassifiedItem, ctx: ApiExecutionContext): Promise<ExecutionResult>
executeBrowserItem(item: ClassifiedItem, ctx: BrowserExecutionContext): Promise<ExecutionResult>

interface ShellExecutionContext {
  repoPath: string;           // absolute path to cloned repo
  timeoutMs?: number;         // default: 300_000 (5 min)
  sandboxImage?: string;      // default: "node:22-alpine"
}

interface ApiExecutionContext {
  baseUrl: string;            // e.g., "https://pr-42.preview.app.com"
  timeoutMs?: number;         // default: 30_000
  anthropicApiKey: string;
}

interface BrowserExecutionContext {
  baseUrl: string;
  anthropicApiKey: string;
  timeoutMs?: number;         // default: 60_000
  maxRetries?: number;        // default: 3
  viewports?: ViewportSpec[];
}
```

**`@vigil/github`** exports:
```typescript
reportResults(ctx: ReportContext): Promise<void>

interface ReportContext {
  octokit: ProbotOctokit;
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  checkRunId: number;
  classifiedItems: ClassifiedItem[];
  executionResults: ExecutionResult[];
}
```

### DB Schema (Current)

```sql
-- packages/core/src/db/schema.ts
installations {
  id: uuid PRIMARY KEY
  githubInstallationId: text UNIQUE   -- string, not number!
  accountLogin: text
  accountType: text                   -- "User" | "Organization"
  active: boolean
  createdAt, updatedAt: timestamptz
}

healthChecks {
  id: uuid PRIMARY KEY
  service: text
  status: text                        -- "ok" | "degraded" | "error"
  message: text
  checkedAt: timestamptz
}
```

### BullMQ Job Shape (Produced by Webhook)

```typescript
// packages/core/src/queue.ts
interface VerifyTestPlanJob {
  installationId: string;   // String(installation.id) — normalized in webhook
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  checkRunId: number;
  prBody: string;           // Full PR description for parsing
}
// Queue name: "verify-test-plan"
// Job type: "verify"
// Retries: 3, exponential backoff (5s initial)
```

---

## Section 9: Orchestrator

**Branch:** `feat/section-9-orchestrator`
**Complexity:** HIGH
**Depends on:** All prior sections (all done)

### Architecture

```
BullMQ Queue "verify-test-plan"
        │
        ▼
  worker.ts (BullMQ Worker)
        │
        ▼
  pipeline.ts (Pipeline Orchestrator)
    │
    ├─ 1. repo-clone.ts      → clone PR branch to temp dir
    ├─ 2. parseTestPlan()    → extract items from prBody
    ├─ 3. classifyItems()    → confidence + executorType per item
    ├─ 4. preview-url.ts     → detect Vercel/Netlify deployment URL
    ├─ 5. executor-router.ts → dispatch items to shell/api/browser
    │      ├─ shell items  → executeShellItem() [parallel]
    │      ├─ api items    → executeApiItem()   [parallel]
    │      └─ browser items → executeBrowserItem() [parallel]
    ├─ 6. aggregate results  → ExecutionResult[]
    └─ 7. reportResults()   → Check Run + PR comment
```

### Files to Create

#### `packages/github/src/worker.ts`

The BullMQ Worker entry point. Created once, processes all jobs.

```typescript
import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES, type VerifyTestPlanJob } from "@vigil/core";
import { runPipeline } from "./services/pipeline.js";
import { createOctokit } from "./services/octokit.js";  // helper to get Octokit from installationId

export function createWorker(redisUrl: string): Worker {
  const worker = new Worker(
    QUEUE_NAMES.VERIFY_TEST_PLAN,
    async (job: Job<VerifyTestPlanJob>) => {
      await runPipeline(job.data);
    },
    {
      connection: { url: redisUrl },
      concurrency: 5,           // max 5 PRs processed simultaneously
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  worker.on("completed", (job) => {
    console.info(`Job ${job.id} completed`);
  });

  return worker;
}
```

**Important:** The worker must be started from `app.ts` (or a separate process entry). Check how BullMQ workers are initialized in the project.

#### `packages/github/src/services/pipeline.ts`

The main pipeline — coordinates all stages with proper error handling.

```typescript
import type { VerifyTestPlanJob, ExecutionResult } from "@vigil/core";
import { parseTestPlan, classifyItems } from "@vigil/core";
import { executeShellItem, executeApiItem, executeBrowserItem } from "@vigil/executors";
import { reportResults } from "./reporter.js";
import { cloneRepo, cleanupRepo } from "./repo-clone.js";
import { detectPreviewUrl } from "./preview-url.js";
import { routeToExecutors } from "./executor-router.js";

export async function runPipeline(job: VerifyTestPlanJob): Promise<void> {
  const { owner, repo, pullNumber, headSha, checkRunId, prBody, installationId } = job;

  // 1. Get Octokit (authenticated for this installation)
  const octokit = await getInstallationOctokit(installationId);

  let repoPath: string | null = null;
  let executionResults: ExecutionResult[] = [];
  let classifiedItems: ClassifiedItem[] = [];

  try {
    // 2. Parse PR body
    const parsed = parseTestPlan(prBody);
    if (parsed.items.length === 0) {
      // No items found — this shouldn't happen (webhook checked), but handle gracefully
      await reportResults({ octokit, owner, repo, pullNumber, headSha, checkRunId,
        classifiedItems: [], executionResults: [] });
      return;
    }

    // 3. Classify items
    classifiedItems = await classifyItems(parsed.items, process.env.ANTHROPIC_API_KEY!);

    // 4. Clone repo (only needed for shell executor items)
    const hasShellItems = classifiedItems.some(i => i.executorType === "shell");
    if (hasShellItems) {
      repoPath = await cloneRepo({ owner, repo, sha: headSha });
    }

    // 5. Detect preview deployment URL (for api + browser items)
    const hasWebItems = classifiedItems.some(
      i => i.executorType === "api" || i.executorType === "browser"
    );
    const previewUrl = hasWebItems
      ? await detectPreviewUrl({ octokit, owner, repo, pullNumber })
      : null;

    // 6. Execute items
    executionResults = await routeToExecutors({
      classifiedItems,
      repoPath,
      previewUrl,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    });

  } catch (err) {
    // Pipeline-level error — report whatever we have + log
    console.error(`Pipeline error for PR #${pullNumber}:`, err);
  } finally {
    // 7. Always report (partial results are better than silence)
    await reportResults({
      octokit, owner, repo, pullNumber, headSha, checkRunId,
      classifiedItems,
      executionResults,
    });

    // 8. Cleanup cloned repo
    if (repoPath) {
      await cleanupRepo(repoPath).catch(e =>
        console.error("Cleanup failed:", e)
      );
    }
  }
}
```

**Key design decisions:**
- `try/finally` ensures `reportResults` ALWAYS runs — even on parse/classify errors
- Partial results (some items executed, some not) are reported as-is
- Cleanup is non-fatal — log errors but don't throw

#### `packages/github/src/services/repo-clone.ts`

Clones the PR branch into a temporary directory for shell execution.

```typescript
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface CloneOptions {
  owner: string;
  repo: string;
  sha: string;
  githubToken?: string;   // Optional — for private repos
}

// Validates the path to prevent directory traversal
function validateRepoPath(repoPath: string): void {
  // Reuse same pattern as shell executor
  if (!/^[a-zA-Z0-9_\-/:.]+$/.test(repoPath)) {
    throw new Error(`Invalid repo path: ${repoPath}`);
  }
}

export async function cloneRepo(options: CloneOptions): Promise<string> {
  const { owner, repo, sha, githubToken } = options;

  const repoPath = await mkdtemp(join(tmpdir(), `vigil-${owner}-${repo}-`));

  const cloneUrl = githubToken
    ? `https://x-access-token:${githubToken}@github.com/${owner}/${repo}.git`
    : `https://github.com/${owner}/${repo}.git`;

  await execFileAsync("git", [
    "clone",
    "--depth", "1",
    "--no-tags",
    cloneUrl,
    repoPath,
  ]);

  // Checkout specific SHA
  await execFileAsync("git", ["checkout", sha], { cwd: repoPath });

  validateRepoPath(repoPath);
  return repoPath;
}

export async function cleanupRepo(repoPath: string): Promise<void> {
  await rm(repoPath, { recursive: true, force: true });
}
```

**Security note:** `repoPath` passes through `validateRepoPath()` before being used in shell executor. Same regex as the allowlist: `^[a-zA-Z0-9_\-/:.]+$`.

#### `packages/github/src/services/preview-url.ts`

Detects Vercel/Netlify preview deployment URLs from GitHub deployment statuses.

```typescript
import type { ProbotOctokit } from "probot";

interface DetectOptions {
  octokit: ProbotOctokit;
  owner: string;
  repo: string;
  pullNumber: number;
}

export async function detectPreviewUrl(options: DetectOptions): Promise<string | null> {
  const { octokit, owner, repo, pullNumber } = options;

  // Strategy 1: Check GitHub Deployments API for PR-linked deployments
  try {
    const { data: deployments } = await octokit.rest.repos.listDeployments({
      owner,
      repo,
      environment: "Preview",   // Vercel uses "Preview"
      per_page: 10,
    });

    for (const deployment of deployments) {
      // Filter to this PR (Vercel sets ref to branch name)
      const statuses = await octokit.rest.repos.listDeploymentStatuses({
        owner,
        repo,
        deployment_id: deployment.id,
        per_page: 5,
      });

      const successStatus = statuses.data.find(s => s.state === "success");
      if (successStatus?.environment_url) {
        return successStatus.environment_url;
      }
    }
  } catch (err) {
    console.warn("Could not fetch deployments:", err);
  }

  // Strategy 2: Check PR check runs for Vercel/Netlify bots
  try {
    const { data: checkSuites } = await octokit.rest.checks.listSuitesForRef({
      owner,
      repo,
      ref: `refs/pull/${pullNumber}/head`,
    });

    for (const suite of checkSuites.check_suites) {
      if (!["vercel", "netlify"].includes(suite.app?.slug ?? "")) continue;

      const { data: runs } = await octokit.rest.checks.listForSuite({
        owner,
        repo,
        check_suite_id: suite.id,
      });

      const deployRun = runs.check_runs.find(r =>
        r.conclusion === "success" && r.details_url
      );
      if (deployRun?.details_url) {
        // Extract URL from details (Vercel format: https://vercel.com/...)
        // This may need parsing — check actual Vercel check run format
        return null; // TODO: extract actual preview URL from Vercel check run
      }
    }
  } catch (err) {
    console.warn("Could not fetch check suites:", err);
  }

  return null; // No preview URL found — api/browser tests will be skipped
}
```

**Note:** If `detectPreviewUrl` returns `null`, the executor-router should skip api and browser items and return `ExecutionResult` with `passed: false`, `evidence: { reason: "No preview deployment detected" }`.

#### `packages/github/src/services/executor-router.ts`

Routes classified items to the appropriate executor, running parallel where safe.

```typescript
import type { ClassifiedItem, ExecutionResult } from "@vigil/core";
import { executeShellItem, executeApiItem, executeBrowserItem } from "@vigil/executors";

interface RouterOptions {
  classifiedItems: ClassifiedItem[];
  repoPath: string | null;
  previewUrl: string | null;
  anthropicApiKey: string;
}

export async function routeToExecutors(options: RouterOptions): Promise<ExecutionResult[]> {
  const { classifiedItems, repoPath, previewUrl, anthropicApiKey } = options;

  const results = await Promise.allSettled(
    classifiedItems.map(item => executeItem(item, { repoPath, previewUrl, anthropicApiKey }))
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") return result.value;

    // Executor threw unexpectedly — should not happen (error-as-evidence model)
    // but handle defensively
    console.error(`Executor threw for item ${classifiedItems[i].item.id}:`, result.reason);
    return {
      itemId: classifiedItems[i].item.id,
      passed: false,
      duration: 0,
      evidence: { error: String(result.reason) },
    };
  });
}

async function executeItem(
  item: ClassifiedItem,
  options: Omit<RouterOptions, "classifiedItems">,
): Promise<ExecutionResult> {
  const { repoPath, previewUrl, anthropicApiKey } = options;

  if (item.confidence === "SKIP" || item.executorType === "none") {
    return {
      itemId: item.item.id,
      passed: true,
      duration: 0,
      evidence: { skipped: true },
    };
  }

  switch (item.executorType) {
    case "shell": {
      if (!repoPath) {
        return noRepoResult(item.item.id);
      }
      return executeShellItem(item, { repoPath, timeoutMs: 300_000 });
    }

    case "api": {
      if (!previewUrl) {
        return noPreviewResult(item.item.id);
      }
      return executeApiItem(item, { baseUrl: previewUrl, anthropicApiKey, timeoutMs: 30_000 });
    }

    case "browser": {
      if (!previewUrl) {
        return noPreviewResult(item.item.id);
      }
      return executeBrowserItem(item, { baseUrl: previewUrl, anthropicApiKey, timeoutMs: 60_000 });
    }

    default:
      return {
        itemId: item.item.id,
        passed: false,
        duration: 0,
        evidence: { error: `Unknown executor type: ${item.executorType}` },
      };
  }
}

function noRepoResult(itemId: string): ExecutionResult {
  return {
    itemId,
    passed: false,
    duration: 0,
    evidence: { reason: "Repository could not be cloned" },
  };
}

function noPreviewResult(itemId: string): ExecutionResult {
  return {
    itemId,
    passed: false,
    duration: 0,
    evidence: { reason: "No preview deployment detected. Deploy to Vercel or Netlify to enable API and browser tests." },
  };
}
```

### DB Schema Addition (Section 9)

Add `executions` table to `packages/core/src/db/schema.ts`:

```typescript
export const executions = pgTable("executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: text("job_id").notNull(),
  installationId: text("installation_id")
    .notNull()
    .references(() => installations.githubInstallationId),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  pullNumber: integer("pull_number").notNull(),
  headSha: text("head_sha").notNull(),
  status: text("status").notNull().default("pending"),
  // status values: "pending" | "running" | "completed" | "failed" | "cancelled"
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  resultsSummary: json("results_summary"),
  // { passed: number, failed: number, skipped: number, needsReview: number, total: number }
  error: text("error"),             // Pipeline-level error message if any
});
```

Run migration after schema change: `pnpm --filter @vigil/core drizzle-kit generate`.

### Concurrency & Cancellation

**One execution per PR:** BullMQ's deduplication via `jobId`:
```typescript
await queue.add("verify", jobData, {
  jobId: `${owner}/${repo}#${pullNumber}`,  // Deduplicate by PR
  ...
});
```

If the same PR pushes again while a job is running, the new push creates a new job with the same `jobId`. BullMQ deduplicates — only one job runs at a time.

**Cancellation on new push:** When `pull_request.synchronize` fires (new commit pushed to existing PR), the webhook should remove the existing job and enqueue a new one:
```typescript
// In webhook handler:
await queue.remove(`${owner}/${repo}#${pullNumber}`);  // Cancel in-progress
await enqueueVerification(job);                          // Enqueue new
```

### Tests (Section 9)

Target: ~30 tests in `packages/github/src/__tests__/pipeline.test.ts`

**Core scenarios to test:**
- Happy path: full pipeline → Check Run updated, PR comment posted
- Parse error: empty prBody → reportResults called with empty arrays
- Classify error: LLM fails → graceful degradation
- No preview URL: api/browser items return `noPreviewResult`
- Shell items: `repoPath` passed correctly to `executeShellItem`
- Partial results: executor fails mid-run → report whatever completed
- `cleanupRepo` called even on error (finally block)
- `detectPreviewUrl`: Vercel deployment found → URL returned
- `detectPreviewUrl`: no deployment → `null` returned

### Quality Gates

```bash
pnpm build          # All packages compile
pnpm test           # 261 existing + ~30 new = ~290 total
pnpm lint           # Clean
pnpm typecheck      # Clean
```

---

## Section 10: Deployment (Phase B)

**Branch:** `feat/section-10-deployment`
**Depends on:** Section 9 complete and merged
**Complexity:** MEDIUM

### Infrastructure Already Done (Phase A)

- DNS: `keepvigil.dev` A → 161.97.97.243, `api.keepvigil.dev` A → same
- Traefik: file-based routing at `/etc/dokploy/traefik/dynamic/keepvigil.yml`
- SSL: Let's Encrypt auto-provisioned via Traefik certresolver
- Placeholder container running at `https://keepvigil.dev`

### Critical Infrastructure Notes

> **NEVER use Docker labels for Traefik on this server.** All services on Nqual5 use file-based Traefik config. Docker labels are silently ignored.

> **NEVER use `sourceType: github` in Dokploy.** Nqual5 has no GitHub OAuth (`githubId: null`). Only `sourceType: "raw"` works — paste the compose YAML inline.

> **SSH key:** `~/.ssh/id_ed25519_nqual5_services` (not `id_ed25519` or `id_ed25519_dokploy`)

> **Dokploy IDs:**
> - Project ID: `iI3cqVLay6bqsqfl9gTCV`
> - Service ID: `66cDXwWE7--R5KQqdo9It`

### Phase B Steps

#### Step 1: Update docker-compose.yml for Production

Replace single-service placeholder with multi-service production config:

```yaml
version: "3.9"

services:
  app:
    build: .
    restart: unless-stopped
    ports:
      - "3200:3200"
    environment:
      - NODE_ENV=production
      - PORT=3200
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - GITHUB_APP_ID=${GITHUB_APP_ID}
      - GITHUB_PRIVATE_KEY=${GITHUB_PRIVATE_KEY}
      - GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - repo-cache:/tmp/vigil-repos   # For repo clones

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: vigil
      POSTGRES_USER: vigil
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vigil"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
  redis-data:
  repo-cache:
```

**Note:** Playwright is NOT a separate container — it runs inside the `app` container. Install browsers during Docker build (`npx playwright install --with-deps chromium`).

#### Step 2: Update Dockerfile for Production

Current Dockerfile handles basic Node. For production, add:
1. Playwright browser installation
2. Multi-stage build (deps → build → prod)
3. Non-root user for security

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install Chromium for Playwright
RUN apk add --no-cache chromium chromium-chromedriver
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Non-root user
RUN addgroup -S vigil && adduser -S vigil -G vigil
USER vigil

COPY --from=builder --chown=vigil:vigil /app/dist ./dist
COPY --from=builder --chown=vigil:vigil /app/node_modules ./node_modules
COPY --from=builder --chown=vigil:vigil /app/packages ./packages

EXPOSE 3200
CMD ["node", "dist/github/src/app.js"]
```

#### Step 3: Secrets via Infisical

Use `/infisical` skill to create `keepvigil` project and set:

| Secret | Description |
|--------|-------------|
| `GITHUB_APP_ID` | From GitHub App settings |
| `GITHUB_PRIVATE_KEY` | PEM key (base64 or multiline) |
| `GITHUB_WEBHOOK_SECRET` | Random string for webhook signature |
| `ANTHROPIC_API_KEY` | For Claude Haiku calls |
| `DATABASE_URL` | `postgresql://vigil:${POSTGRES_PASSWORD}@postgres:5432/vigil` |
| `REDIS_URL` | `redis://redis:6379` |
| `POSTGRES_PASSWORD` | Random secure password |

#### Step 4: GitHub App Registration for Production

Register (or update) GitHub App at `https://github.com/settings/apps`:
- **Webhook URL:** `https://keepvigil.dev/webhook`
- **Webhook secret:** Same as `GITHUB_WEBHOOK_SECRET`
- **Permissions:**
  - Repository: `checks: write`, `pull_requests: read`, `contents: read`
  - Account: none required
- **Events to subscribe:** `Pull request`, `Installation`

#### Step 5: Database Migrations

After container starts:
```bash
# SSH into server
ssh -i ~/.ssh/id_ed25519_nqual5_services user@161.97.97.243

# Run migrations inside the container
docker exec keepvigil-0p1rgp-vigil-1 node dist/core/src/db/migrate.js
```

Or add migration as the Docker CMD startup step (run before server starts).

#### Step 6: Update Traefik Config (if needed)

Current file at `/etc/dokploy/traefik/dynamic/keepvigil.yml` routes to port 3200. If ports change, update via SSH:
```bash
ssh -i ~/.ssh/id_ed25519_nqual5_services user@161.97.97.243
sudo nano /etc/dokploy/traefik/dynamic/keepvigil.yml
```

No Traefik restart needed — Traefik watches the file automatically.

#### Step 7: End-to-End Smoke Test

1. Install the GitHub App on a test repo (any repo with a README)
2. Open a PR with this description:
```markdown
## Test Plan
- [ ] `echo hello` succeeds
- [ ] GET / returns 200
```
3. Verify within 2 minutes:
   - ✅ A "Vigil" Check Run appears on the PR
   - ✅ Check Run shows result (passed/failed)
   - ✅ A PR comment appears with the results table

### Acceptance Criteria (Phase B)

```
[ ] GitHub App webhook endpoint responds at https://keepvigil.dev/webhook
[ ] All services healthy: app, Redis, PostgreSQL
[ ] GitHub App installable from github.com/settings/apps
[ ] End-to-end: PR with test plan → Check Run + PR comment with results
[ ] Secrets managed via Infisical, not hardcoded in compose
[ ] Database persists between container restarts (volume mounted)
[ ] Logs accessible via `docker logs keepvigil-0p1rgp-vigil-1`
```

---

## Known Issues to Resolve Before Section 9

These two HIGH audit findings are in PR #6 (`fix/audit-high-priority-bugs`). Merge that PR first:

1. **Installation ID normalization** — `VerifyTestPlanJob.installationId` changed to `string`. The orchestrator must use `String(job.data.installationId)` when looking up the installation in the DB.

2. **Webhook try-catch** — PR webhook now wraps check run creation + enqueue in try-catch. If enqueue fails, check run is cancelled (not left orphaned).

---

## Implementation Order

```
1. Merge PR #6 (fix/audit-high-priority-bugs) — prerequisite
2. git checkout main && git pull
3. git checkout -b feat/section-9-orchestrator

4. Create packages/core/src/db/schema.ts → add executions table
5. Run: pnpm --filter @vigil/core drizzle-kit generate

6. Create packages/github/src/services/repo-clone.ts
7. Create packages/github/src/services/preview-url.ts
8. Create packages/github/src/services/executor-router.ts
9. Create packages/github/src/services/pipeline.ts
10. Create packages/github/src/worker.ts
11. Wire worker into app.ts (start worker on app init)

12. Create packages/github/src/__tests__/pipeline.test.ts (~30 tests)

13. Quality gates: pnpm build && pnpm test && pnpm lint && pnpm typecheck
14. git push -u origin feat/section-9-orchestrator
15. gh pr create

--- Section 9 merged ---

16. git checkout -b feat/section-10-deployment
17. Update docker-compose.yml (multi-service)
18. Update Dockerfile (Playwright + multi-stage)
19. Configure Infisical secrets (/infisical skill)
20. Register GitHub App for production
21. Deploy via Dokploy (update raw compose)
22. Run DB migrations
23. End-to-end smoke test
```

---

## Conventions Reminder

- **Language:** Conversations in Spanish, code/commits/PRs in English
- **Commits:** `feat(worker): add BullMQ worker for pipeline orchestration`
- **Quality gates:** `pnpm build && pnpm test && pnpm lint && pnpm typecheck` — ALL must pass
- **Agents NEVER merge PRs** — user merges
- **tsup config:** use `tsconfig.build.json` without `composite` for tsup DTS generation
- **pg ESM import:** `import pg from "pg"; const { Pool } = pg;`
- **VSCode phantom branch:** always run `git branch --show-current` before committing
