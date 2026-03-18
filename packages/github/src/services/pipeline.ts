/**
 * Main orchestration pipeline for PR verification.
 * Called by the BullMQ worker for each job.
 *
 * Dual-mode:
 * - v1+v2: PR has a test plan → runs all signals (v1 test execution + v2 claims/undocumented)
 * - v2-only: PR has no test plan → runs v2 signals only (claims, undocumented, credential, coverage)
 */

import { randomUUID } from "node:crypto";
import type { Probot, ProbotOctokit } from "probot";
import type { ClassifiedItem, ExecutionResult, LLMClient, PipelineMode, ParsedTestPlan, Signal, VerifyTestPlanJob, VigilConfig } from "@vigil/core";
import { parseTestPlan, classifyItems, createLLMClient, scanCredentials, extractChangedFilesWithStatus, mapCoverage, createLogger, runWithCorrelationId, getWeights } from "@vigil/core";
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
import { verifyClaims } from "./claims-verifier.js";
import { detectUndocumentedChanges } from "./undocumented-changes.js";
import { hasTestPlan } from "../utils/has-test-plan.js";

const log = createLogger("pipeline");

let pipelineDb: Database | null = null;

/** Set the database instance for subscription lookups */
export function setPipelineDb(database: Database): void {
  pipelineDb = database;
}

/**
 * Run the full verification pipeline for a single PR job.
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

/** Default platform model — configurable via GROQ_MODEL env var */
const PLATFORM_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

function createPipelineLLM(vigiConfig: VigilConfig | undefined, groqApiKey: string): LLMClient {
  const llmConfig = vigiConfig?.llm;
  if (llmConfig?.provider && llmConfig.model) {
    const needsKey = llmConfig.provider !== "ollama";
    if (!needsKey || llmConfig.apiKey) {
      return createLLMClient({
        provider: llmConfig.provider,
        model: llmConfig.model,
        apiKey: llmConfig.apiKey ?? "",
      });
    }
  }
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
// Helper: push signal with weight override
// ---------------------------------------------------------------------------

function pushSignal(signals: Signal[], signal: Signal, weight: number): void {
  signals.push({ ...signal, weight });
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
  const prTitle = job.prTitle ?? "";

  log.info({ owner, repo, pullNumber }, "Pipeline started");

  // Stage 0: Check subscription plan + rate limit
  if (!pipelineDb) {
    log.warn("pipelineDb not initialized — all users fall back to free tier");
  }
  const tier = pipelineDb ? await checkPlan(pipelineDb, installationId) : "free" as const;
  const proEnabled = isPro(tier);
  log.info({ installationId, tier, proEnabled }, "Subscription plan resolved");

  const rateCheck = checkRateLimit(Number(installationId), tier);
  if (!rateCheck.allowed) {
    log.warn({ installationId, message: rateCheck.message }, "Rate limited");
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

  // Stage 1: Determine pipeline mode
  const hasItems = hasTestPlan(prBody);
  const mode: PipelineMode = hasItems ? "v1+v2" : "v2-only";
  const weights = getWeights(mode);
  log.info({ mode, hasItems }, "Pipeline mode determined");

  let repoPath: string | null = null;
  let classifiedItems: ClassifiedItem[] = [];
  let executionResults: ExecutionResult[] = [];
  let pipelineError: string | null = null;
  const signals: Signal[] = [];

  try {
    // Stage 2: Create LLM client (always — v2 signals need it)
    const llm = createPipelineLLM(vigiConfig, groqApiKey);

    // Stage 3: Fetch PR diff (always — both modes need it)
    const diff = await fetchPRDiff({ octokit, owner, repo, pullNumber });

    // =====================================================================
    // v2 signals — run for ALL PRs (claims, undocumented, credential, coverage)
    // =====================================================================

    if (diff) {
      // Claims Verifier (free tier)
      const claimsSignal = await verifyClaims({ prTitle, prBody, diff, llm });
      pushSignal(signals, claimsSignal, weights["claims-verifier"]);
      log.info({ signalId: claimsSignal.id, score: claimsSignal.score, passed: claimsSignal.passed }, "Claims verifier complete");

      // Undocumented Changes (free tier)
      const undocSignal = await detectUndocumentedChanges({ prTitle, prBody, diff, llm });
      pushSignal(signals, undocSignal, weights["undocumented-changes"]);
      log.info({ signalId: undocSignal.id, score: undocSignal.score, passed: undocSignal.passed, findings: undocSignal.details.length }, "Undocumented changes complete");

      // Credential Scan (free tier, both modes)
      const credSignal = scanCredentials(diff);
      pushSignal(signals, credSignal, weights["credential-scan"]);
      log.info({ signalId: credSignal.id, score: credSignal.score, passed: credSignal.passed, findings: credSignal.details.length }, "Credential scan complete");

      // Coverage Mapper (free tier, both modes)
      const changedFiles = extractChangedFilesWithStatus(diff);
      const repoFiles = await fetchRepoFileList({ octokit, owner, repo, headSha });
      const coverageSignal = mapCoverage(changedFiles, repoFiles, mode === "v1+v2" ? classifiedItems : undefined);
      pushSignal(signals, coverageSignal, weights["coverage-mapper"]);
      log.info({ signalId: coverageSignal.id, score: coverageSignal.score, passed: coverageSignal.passed }, "Coverage mapper complete");

      // Contract Checker (Pro only, both modes)
      let contractVerifiedFiles = new Set<string>();
      if (proEnabled) {
        const { signal: contractSignal, verifiedFiles } = await checkContracts({ diff, llm });
        pushSignal(signals, contractSignal, weights["contract-checker"]);
        contractVerifiedFiles = verifiedFiles;
        log.info({ signalId: contractSignal.id, score: contractSignal.score, passed: contractSignal.passed, verifiedFiles: verifiedFiles.size }, "Contract checker complete");
      }

      // Diff Analyzer (Pro only, both modes — works without ClassifiedItem[])
      if (proEnabled) {
        const diffSignal = await analyzeDiff({ diff, classifiedItems, llm });
        pushSignal(signals, diffSignal, weights["diff-analyzer"]);
        log.info({ signalId: diffSignal.id, score: diffSignal.score, passed: diffSignal.passed }, "Diff analyzer complete");
      }

      // =================================================================
      // v1 signals — only when test plan exists
      // =================================================================

      if (mode === "v1+v2") {
        // Parse test plan
        const { plan, emptyError } = stageParse(prBody);
        if (emptyError) {
          // Has checkboxes but something went wrong with parsing — non-fatal, v2 signals still run
          log.warn({ emptyError }, "Test plan parse issue — v1 signals skipped");
        } else {
          // Classify items
          classifiedItems = await stageClassify(plan, llm);

          // Clone repo (only if shell/assertion items)
          repoPath = await stageCloneRepo(classifiedItems, job, octokit);

          // Detect preview URL (only if api/browser items)
          const previewUrl = await stageDetectPreviewUrl(classifiedItems, job, octokit);

          // Execute all items
          executionResults = await stageExecute(classifiedItems, repoPath, previewUrl, llm, vigiConfig, retryItemIds);

          // CI Bridge
          const ciSignal = await collectCISignal({ octokit, owner, repo, headSha, classifiedItems });
          pushSignal(signals, ciSignal, weights["ci-bridge"]);
          log.info({ signalId: ciSignal.id, score: ciSignal.score, passed: ciSignal.passed }, "CI Bridge complete");

          // Executor Adapter
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
          pushSignal(signals, executorSignal, weights["executor"]);
          log.info({ signalId: executorSignal.id, score: executorSignal.score, passed: executorSignal.passed }, "Executor adapter complete");

          // Gap Analyzer (Pro only, needs classifiedItems)
          if (proEnabled) {
            const gapSignal = await analyzeGaps({ diff, classifiedItems, llm });
            pushSignal(signals, gapSignal, weights["gap-analyzer"]);
            log.info({ signalId: gapSignal.id, score: gapSignal.score, passed: gapSignal.passed }, "Gap analyzer complete");
          }

          // Plan Augmentor (both tiers when test plan exists)
          const augmentorSignal = await augmentPlan({ diff, classifiedItems, llm, repoPath, contractCheckerActive: contractVerifiedFiles.size > 0 });
          pushSignal(signals, augmentorSignal, weights["plan-augmentor"]);
          log.info({ signalId: augmentorSignal.id, score: augmentorSignal.score, passed: augmentorSignal.passed }, "Plan augmentor complete");
        }
      }
    } else {
      // No diff available — can't run any signals
      pipelineError = "Could not fetch PR diff";
    }
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const safeMsg = rawMsg.replace(/ghs_[A-Za-z0-9]+/g, "***");
    pipelineError = `Pipeline error: ${safeMsg}`;
    log.error({ error: safeMsg, owner, repo, pullNumber }, "Pipeline error");
  } finally {
    // Stage final: Always report — partial results are better than silence
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
        pipelineMode: mode,
      });
    } catch (reportErr) {
      log.error({ err: reportErr }, "Failed to report results");
    }

    // Cleanup cloned repo (non-fatal)
    if (repoPath) {
      await cleanupRepo(repoPath).catch((cleanupErr) => {
        log.error({ err: cleanupErr }, "Cleanup failed");
      });
    }

    log.info({ owner, repo, pullNumber, mode }, "Pipeline finished");
  }
}
