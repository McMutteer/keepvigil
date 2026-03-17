/**
 * Main orchestration pipeline for test plan verification.
 * Called by the BullMQ worker for each job. Coordinates parse → classify →
 * clone → detect → execute → report in a try/finally to guarantee reporting.
 */

import { randomUUID } from "node:crypto";
import type { Probot, ProbotOctokit } from "probot";
import type { ClassifiedItem, ExecutionResult, LLMClient, ParsedTestPlan, Signal, VerifyTestPlanJob, VigilConfig } from "@vigil/core";
import { parseTestPlan, classifyItems, createLLMClient, scanCredentials, extractChangedFilesWithStatus, mapCoverage, createLogger, runWithCorrelationId } from "@vigil/core";
import type { Database } from "@vigil/core/db";
import { reportResults } from "./reporter.js";
import { cloneRepo, cleanupRepo } from "./repo-clone.js";
import { detectPreviewUrl } from "./preview-url.js";
import { routeToExecutors } from "./executor-router.js";
import { fetchPRDiff, fetchRepoFileList } from "./diff-fetcher.js";
import { collectCISignal } from "./ci-bridge.js";
import { buildExecutorSignal } from "./executor-adapter.js";
import { analyzeDiff } from "./diff-analyzer.js";
import { analyzeGaps } from "./gap-analyzer.js";
import { augmentPlan } from "./plan-augmentor.js";
import { checkContracts } from "./contract-checker.js";
import { checkPlan, isPro } from "./subscription.js";
import { checkRateLimit } from "./rate-limiter.js";

const log = createLogger("pipeline");

let pipelineDb: Database | null = null;

/** Set the database instance for subscription lookups */
export function setPipelineDb(database: Database): void {
  pipelineDb = database;
}

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
// LLM client creation
// ---------------------------------------------------------------------------

/**
 * Create an LLM client from the job's vigiConfig or fall back to the
 * platform Groq key. This is the single place where the LLM client is
 * instantiated for a pipeline run.
 */
/** Default platform model — configurable via GROQ_MODEL env var */
const PLATFORM_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

function createPipelineLLM(vigiConfig: VigilConfig | undefined, groqApiKey: string): LLMClient {
  const llmConfig = vigiConfig?.llm;
  if (llmConfig?.provider && llmConfig.model) {
    // Ollama doesn't require an API key; other providers do
    const needsKey = llmConfig.provider !== "ollama";
    if (!needsKey || llmConfig.apiKey) {
      return createLLMClient({
        provider: llmConfig.provider,
        model: llmConfig.model,
        apiKey: llmConfig.apiKey ?? "",
      });
    }
  }
  // Fallback: platform Groq key with configurable model
  return createLLMClient({
    provider: "groq",
    model: PLATFORM_MODEL,
    apiKey: groqApiKey,
  });
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
  llm: LLMClient,
): Promise<ClassifiedItem[]> {
  return classifyItems(plan.items, { llm });
}

async function stageCloneRepo(
  classifiedItems: ClassifiedItem[],
  job: Pick<VerifyTestPlanJob, "owner" | "repo" | "headSha">,
  octokit: ProbotOctokit,
): Promise<string | null> {
  const needsRepo = classifiedItems.some((i) => i.executorType === "shell" || i.executorType === "assertion");
  if (!needsRepo) return null;

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
  llm: LLMClient,
  vigiConfig?: VigilConfig,
  retryItemIds?: string[],
): Promise<ExecutionResult[]> {
  return routeToExecutors({ classifiedItems, repoPath, previewUrl, llm, vigiConfig, retryItemIds });
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

  // Stage 0: Check subscription plan + rate limit
  const tier = pipelineDb ? await checkPlan(pipelineDb, Number(installationId)) : "free" as const;
  const proEnabled = isPro(tier);
  log.info({ installationId, tier, proEnabled }, "Subscription plan resolved");

  const rateCheck = checkRateLimit(Number(installationId), tier);
  if (!rateCheck.allowed) {
    log.warn({ installationId, message: rateCheck.message }, "Rate limited");
    // Still report so the user sees a check run (not just silence)
    const octokit = await probot.auth(Number(installationId));
    await reportResults({
      octokit, owner, repo, pullNumber, checkRunId,
      classifiedItems: [], executionResults: [], signals: [],
      pipelineError: rateCheck.message ?? "Rate limit exceeded",
      vigiConfig, configWarnings,
    });
    return;
  }

  const octokit = await probot.auth(Number(installationId));

  let repoPath: string | null = null;
  let classifiedItems: ClassifiedItem[] = [];
  let executionResults: ExecutionResult[] = [];
  let pipelineError: string | null = null;
  const signals: Signal[] = [];

  try {
    // Stage 2: Parse
    const { plan, emptyError } = stageParse(prBody);
    if (emptyError) {
      pipelineError = emptyError;
      return;
    }

    // Create LLM client after parse — avoids failures on empty/no-op pipelines
    const llm = createPipelineLLM(vigiConfig, groqApiKey);

    // Stage 2.5: Fetch PR diff (used by credential scanner + future signals)
    const diff = await fetchPRDiff({ octokit, owner, repo, pullNumber });

    // Stage 3: Classify
    classifiedItems = await stageClassify(plan, llm);

    // Stage 4: Clone repo (only if there are shell items)
    repoPath = await stageCloneRepo(classifiedItems, job, octokit);

    // Stage 5: Detect preview URL (only if there are api/browser items)
    const previewUrl = await stageDetectPreviewUrl(classifiedItems, job, octokit);

    // Stage 6: Execute
    executionResults = await stageExecute(classifiedItems, repoPath, previewUrl, llm, vigiConfig, retryItemIds);

    // Stage 6.5: Credential scan (runs on diff, independent of executors)
    if (diff) {
      const credSignal = scanCredentials(diff);
      signals.push(credSignal);
      log.info({ signalId: credSignal.id, score: credSignal.score, passed: credSignal.passed, findings: credSignal.details.length }, "Credential scan complete");
    }

    // Stage 6.6: CI Bridge (maps check runs to test plan items)
    const ciSignal = await collectCISignal({ octokit, owner, repo, headSha, classifiedItems });
    signals.push(ciSignal);
    log.info({ signalId: ciSignal.id, score: ciSignal.score, passed: ciSignal.passed, matched: ciSignal.details.filter((d) => d.status !== "skip").length }, "CI Bridge complete");

    // Stage 6.7: Coverage Mapper (maps changed files to test files + plan references)
    let contractVerifiedFiles = new Set<string>();
    if (diff) {
      const changedFiles = extractChangedFilesWithStatus(diff);
      const repoFiles = await fetchRepoFileList({ octokit, owner, repo, headSha });
      const coverageSignal = mapCoverage(changedFiles, repoFiles, classifiedItems);
      signals.push(coverageSignal);
      log.info({ signalId: coverageSignal.id, score: coverageSignal.score, passed: coverageSignal.passed }, "Coverage mapper complete");

      // Stage 6.7.5: Contract Checker — cross-file API/frontend shape verification (Pro only)
      // Runs BEFORE executor adapter so verified files can override assertion failures
      if (proEnabled) {
        const { signal: contractSignal, verifiedFiles } = await checkContracts({ diff, llm });
        signals.push(contractSignal);
        contractVerifiedFiles = verifiedFiles;
        log.info({ signalId: contractSignal.id, score: contractSignal.score, passed: contractSignal.passed, verifiedFiles: verifiedFiles.size }, "Contract checker complete");
      }
    }

    // Stage 6.8: Executor Adapter (wraps v1 execution results as signal)
    // Pass CI-verified item IDs and contract-verified files for trust overrides
    const ciVerifiedIds = new Set<string>();
    for (const ci of classifiedItems) {
      const ciDetail = ciSignal.details.find((d) => d.label === ci.item.text.slice(0, 80));
      if (ciDetail?.status === "pass") {
        ciVerifiedIds.add(ci.item.id);
      }
    }
    const executorSignal = buildExecutorSignal(
      classifiedItems,
      executionResults,
      ciVerifiedIds.size > 0 ? ciVerifiedIds : undefined,
      contractVerifiedFiles.size > 0 ? contractVerifiedFiles : undefined,
    );
    signals.push(executorSignal);
    log.info({ signalId: executorSignal.id, score: executorSignal.score, passed: executorSignal.passed, ciOverrides: ciVerifiedIds.size, contractOverrides: contractVerifiedFiles.size }, "Executor adapter complete");

    // LLM signals: Diff Analyzer + Gap Analyzer + Plan Augmentor
    // Pro tier: all three LLM signals run
    // Free tier: only Plan Augmentor (uses platform key)
    if (diff && proEnabled) {
      // Stage 6.9: Diff Analyzer — LLM compares diff vs test plan claims
      const diffSignal = await analyzeDiff({ diff, classifiedItems, llm });
      signals.push(diffSignal);
      log.info({ signalId: diffSignal.id, score: diffSignal.score, passed: diffSignal.passed }, "Diff analyzer complete");

      // Stage 6.10: Gap Analyzer — LLM identifies untested areas
      const gapSignal = await analyzeGaps({ diff, classifiedItems, llm });
      signals.push(gapSignal);
      log.info({ signalId: gapSignal.id, score: gapSignal.score, passed: gapSignal.passed, gaps: gapSignal.details.length }, "Gap analyzer complete");

      // Stage 6.11: Plan Augmentor — generates and verifies items the test plan missed
      // Skips contract items when Contract Checker is active (it handles those better)
      const augmentorSignal = await augmentPlan({ diff, classifiedItems, llm, repoPath, contractCheckerActive: contractVerifiedFiles.size > 0 });
      signals.push(augmentorSignal);
      log.info({ signalId: augmentorSignal.id, score: augmentorSignal.score, passed: augmentorSignal.passed, items: augmentorSignal.details.length }, "Plan augmentor complete");
    } else if (diff) {
      // Free tier: only Plan Augmentor runs (uses platform key)
      const augmentorSignal = await augmentPlan({ diff, classifiedItems, llm, repoPath, contractCheckerActive: contractVerifiedFiles.size > 0 });
      signals.push(augmentorSignal);
      log.info({ signalId: augmentorSignal.id, score: augmentorSignal.score, passed: augmentorSignal.passed, plan }, "Plan augmentor complete (free tier)");
    }
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
        signals: signals.length > 0 ? signals : undefined,
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
