/**
 * Main orchestration pipeline for test plan verification.
 * Called by the BullMQ worker for each job. Coordinates parse → classify →
 * clone → detect → execute → report in a try/finally to guarantee reporting.
 */

import { randomUUID } from "node:crypto";
import type { Probot, ProbotOctokit } from "probot";
import type { ClassifiedItem, ExecutionResult, ParsedTestPlan, VerifyTestPlanJob, VigilConfig } from "@vigil/core";
import { parseTestPlan, classifyItems, createLogger, runWithCorrelationId } from "@vigil/core";
import { reportResults } from "./reporter.js";
import { cloneRepo, cleanupRepo } from "./repo-clone.js";
import { detectPreviewUrl } from "./preview-url.js";
import { routeToExecutors } from "./executor-router.js";

const log = createLogger("pipeline");

/**
 * Run the full verification pipeline for a single PR job.
 *
 * Stage order:
 * 1. Authenticate as GitHub installation
 * 2. Parse test plan items from prBody
 * 3. Classify items (rule-based + LLM)
 * 4. Clone repo for shell items (optional)
 * 5. Detect preview URL for api/browser items (optional)
 * 6. Execute all items concurrently via executor-router
 * 7. Report results to GitHub (always — even on partial failure)
 * 8. Clean up cloned repo
 */
export async function runPipeline(
  job: VerifyTestPlanJob,
  probot: Probot,
  groqApiKey: string,
): Promise<void> {
  const correlationId = randomUUID();
  return runWithCorrelationId(correlationId, () => _runPipeline(job, probot, groqApiKey, correlationId));
}

// ---------------------------------------------------------------------------
// Stage functions
// ---------------------------------------------------------------------------

function stageParse(prBody: string): { plan: ParsedTestPlan; emptyError: string | null } {
  const plan = parseTestPlan(prBody);
  if (plan.items.length === 0) {
    const emptyError = plan.sectionTitle
      ? `"${plan.sectionTitle}" found but contained no checkbox items.`
      : "No test plan section found or PR body was empty.";
    return { plan, emptyError };
  }
  return { plan, emptyError: null };
}

async function stageClassify(
  plan: ParsedTestPlan,
  groqApiKey: string,
): Promise<ClassifiedItem[]> {
  return classifyItems(plan.items, { apiKey: groqApiKey });
}

async function stageCloneRepo(
  classifiedItems: ClassifiedItem[],
  job: Pick<VerifyTestPlanJob, "owner" | "repo" | "headSha">,
  octokit: ProbotOctokit,
): Promise<string | null> {
  const hasShellItems = classifiedItems.some((i) => i.executorType === "shell");
  if (!hasShellItems) return null;

  let githubToken: string | undefined;
  try {
    // Get installation access token for cloning private repos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Probot's Octokit exposes auth() but types don't surface it
    const authFn = (octokit as any).auth;
    if (typeof authFn === "function") {
      const auth = await authFn({ type: "installation" });
      if (auth && typeof auth === "object" && "token" in auth) {
        githubToken = String(auth.token);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ error: msg.replace(/ghs_[A-Za-z0-9]+/g, "***"), owner: job.owner, repo: job.repo }, "Could not get GitHub token — attempting unauthenticated clone");
  }

  return cloneRepo({ owner: job.owner, repo: job.repo, sha: job.headSha, githubToken });
}

async function stageDetectPreviewUrl(
  classifiedItems: ClassifiedItem[],
  job: Pick<VerifyTestPlanJob, "owner" | "repo" | "pullNumber">,
  octokit: ProbotOctokit,
): Promise<string | null> {
  const hasWebItems = classifiedItems.some(
    (i) => i.executorType === "api" || i.executorType === "browser",
  );
  if (!hasWebItems) return null;
  return detectPreviewUrl({ octokit, owner: job.owner, repo: job.repo, pullNumber: job.pullNumber });
}

async function stageExecute(
  classifiedItems: ClassifiedItem[],
  repoPath: string | null,
  previewUrl: string | null,
  groqApiKey: string,
  vigiConfig?: VigilConfig,
  retryItemIds?: string[],
): Promise<ExecutionResult[]> {
  return routeToExecutors({ classifiedItems, repoPath, previewUrl, groqApiKey, vigiConfig, retryItemIds });
}

// ---------------------------------------------------------------------------
// Coordinator
// ---------------------------------------------------------------------------

async function _runPipeline(
  job: VerifyTestPlanJob,
  probot: Probot,
  groqApiKey: string,
  correlationId: string,
): Promise<void> {
  const { owner, repo, pullNumber, headSha, checkRunId, prBody, installationId, vigiConfig, configWarnings, retryItemIds } = job;

  log.info({ owner, repo, pullNumber }, "Pipeline started");

  const octokit = await probot.auth(Number(installationId));

  let repoPath: string | null = null;
  let classifiedItems: ClassifiedItem[] = [];
  let executionResults: ExecutionResult[] = [];
  let pipelineError: string | null = null;

  try {
    // Stage 2: Parse
    const { plan, emptyError } = stageParse(prBody);
    if (emptyError) {
      pipelineError = emptyError;
      return;
    }

    // Stage 3: Classify
    classifiedItems = await stageClassify(plan, groqApiKey);

    // Stage 4: Clone repo (only if there are shell items)
    repoPath = await stageCloneRepo(classifiedItems, job, octokit);

    // Stage 5: Detect preview URL (only if there are api/browser items)
    const previewUrl = await stageDetectPreviewUrl(classifiedItems, job, octokit);

    // Stage 6: Execute
    executionResults = await stageExecute(classifiedItems, repoPath, previewUrl, groqApiKey, vigiConfig, retryItemIds);
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const safeMsg = rawMsg.replace(/ghs_[A-Za-z0-9]+/g, "***");
    pipelineError = `Pipeline error: ${safeMsg}`;
    log.error({ error: safeMsg, owner, repo, pullNumber }, "Pipeline error");
  } finally {
    // Stage 7: Always report — partial results are better than silence
    try {
      await reportResults({
        octokit,
        owner,
        repo,
        pullNumber,
        headSha,
        checkRunId,
        classifiedItems,
        executionResults,
        pipelineError,
        correlationId,
        vigiConfig,
        configWarnings,
        retryItemIds,
      });
    } catch (reportErr) {
      log.error({ err: reportErr }, "Failed to report results");
    }

    // Stage 8: Cleanup cloned repo (non-fatal)
    if (repoPath) {
      await cleanupRepo(repoPath).catch((cleanupErr) => {
        log.error({ err: cleanupErr }, "Cleanup failed");
      });
    }

    log.info({ owner, repo, pullNumber }, "Pipeline finished");
  }
}
