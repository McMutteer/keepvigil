/**
 * Main orchestration pipeline for PR verification.
 * Called by the BullMQ worker for each job.
 *
 * All PRs run the same v2 signal set — no test plan execution.
 * Signals: claims, undocumented, credential, coverage, contract (Pro), diff (Pro).
 */

import { randomUUID } from "node:crypto";
import type { Probot } from "probot";
import type { Signal, VerifyTestPlanJob } from "@vigil/core";
import { createLLMClient, scanCredentials, extractChangedFilesWithStatus, mapCoverage, createLogger, runWithCorrelationId, getWeights } from "@vigil/core";
import type { Database } from "@vigil/core/db";
import { reportResults } from "./reporter.js";
import { fetchPRDiff, fetchRepoFileList } from "./diff-fetcher.js";
import { analyzeDiff } from "./diff-analyzer.js";
import { checkContracts } from "./contract-checker.js";
import { checkPlan, isPro } from "./subscription.js";
import { checkRateLimit } from "./rate-limiter.js";
import { verifyClaims } from "./claims-verifier.js";
import { detectUndocumentedChanges } from "./undocumented-changes.js";
import { loadRepoRules, applyIgnoreRules } from "./repo-memory.js";

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
  const { owner, repo, pullNumber, headSha, checkRunId, prBody, installationId, vigiConfig, configWarnings } = job;
  const prTitle = job.prTitle ?? "";
  const jobId = `${installationId}-${owner}-${repo}-${pullNumber}`;
  const mode = "v2-only" as const;

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
      octokit, owner, repo, pullNumber, headSha, checkRunId,
      classifiedItems: [], executionResults: [], signals: [],
      pipelineError: rateCheck.message ?? "Rate limit exceeded",
      vigiConfig, configWarnings,
      db: pipelineDb ?? undefined, installationId, jobId, tier,
    });
    return;
  }

  const octokit = await probot.auth(Number(installationId));
  const weights = getWeights(mode);

  let pipelineError: string | null = null;
  let diff: string | null = null;
  const signals: Signal[] = [];

  try {
    // Stage 1: Create LLM client
    const llm = createLLMClient({
      provider: "groq",
      model: PLATFORM_MODEL,
      apiKey: groqApiKey,
    });

    // Stage 2: Fetch PR diff
    diff = await fetchPRDiff({ octokit, owner, repo, pullNumber });

    if (diff) {
      // Claims Verifier (free tier)
      const claimsSignal = await verifyClaims({ prTitle, prBody, diff, llm });
      pushSignal(signals, claimsSignal, weights["claims-verifier"]);
      log.info({ signalId: claimsSignal.id, score: claimsSignal.score, passed: claimsSignal.passed }, "Claims verifier complete");

      // Undocumented Changes (free tier)
      const undocSignal = await detectUndocumentedChanges({ prTitle, prBody, diff, llm });
      pushSignal(signals, undocSignal, weights["undocumented-changes"]);
      log.info({ signalId: undocSignal.id, score: undocSignal.score, passed: undocSignal.passed, findings: undocSignal.details.length }, "Undocumented changes complete");

      // Credential Scan (free tier)
      const credSignal = scanCredentials(diff);
      pushSignal(signals, credSignal, weights["credential-scan"]);
      log.info({ signalId: credSignal.id, score: credSignal.score, passed: credSignal.passed, findings: credSignal.details.length }, "Credential scan complete");

      // Coverage Mapper (free tier)
      const changedFiles = extractChangedFilesWithStatus(diff);
      const repoFiles = await fetchRepoFileList({ octokit, owner, repo, headSha });
      const coverageSignal = mapCoverage(changedFiles, repoFiles, undefined, vigiConfig?.coverage?.exclude);
      // If coverage mapper found no test files at all, reduce weight to avoid tanking the score
      const coverageWeight = coverageSignal.score === 0 && coverageSignal.details.every((d) => d.status === "fail")
        ? 2 : weights["coverage-mapper"];
      pushSignal(signals, coverageSignal, coverageWeight);
      log.info({ signalId: coverageSignal.id, score: coverageSignal.score, passed: coverageSignal.passed, weight: coverageWeight }, "Coverage mapper complete");

      // Contract Checker (Pro only)
      if (proEnabled) {
        const { signal: contractSignal } = await checkContracts({ diff, llm });
        pushSignal(signals, contractSignal, weights["contract-checker"]);
        log.info({ signalId: contractSignal.id, score: contractSignal.score, passed: contractSignal.passed }, "Contract checker complete");
      }

      // Diff Analyzer (Pro only)
      if (proEnabled) {
        const diffSignal = await analyzeDiff({ diff, classifiedItems: [], llm });
        pushSignal(signals, diffSignal, weights["diff-analyzer"]);
        log.info({ signalId: diffSignal.id, score: diffSignal.score, passed: diffSignal.passed }, "Diff analyzer complete");
      }
    } else {
      pipelineError = "Could not fetch PR diff";
    }
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const safeMsg = rawMsg.replace(/ghs_[A-Za-z0-9]+/g, "***");
    pipelineError = `Pipeline error: ${safeMsg}`;
    log.error({ error: safeMsg, owner, repo, pullNumber }, "Pipeline error");
  } finally {
    // Apply repo memory rules before reporting (suppress known findings)
    if (pipelineDb && signals.length > 0) {
      try {
        const rules = await loadRepoRules(pipelineDb, owner, repo);
        if (rules.length > 0) {
          const suppressed = applyIgnoreRules(signals, rules);
          if (suppressed > 0) {
            log.info({ owner, repo, suppressed, rules: rules.length }, "Repo rules applied");
          }
        }
      } catch (err) {
        log.warn({ err, owner, repo }, "Failed to apply repo rules — reporting without memory");
      }
    }

    // Stage final: Always report — partial results are better than silence
    try {
      await reportResults({
        octokit,
        owner,
        repo,
        pullNumber,
        headSha,
        checkRunId,
        classifiedItems: [],
        executionResults: [],
        pipelineError,
        correlationId,
        vigiConfig,
        configWarnings,
        signals: signals.length > 0 ? signals : undefined,
        pipelineMode: mode,
        diff,
        proEnabled,
        db: pipelineDb ?? undefined,
        installationId,
        jobId,
        tier,
      });
    } catch (reportErr) {
      log.error({ err: reportErr }, "Failed to report results");
    }

    log.info({ owner, repo, pullNumber }, "Pipeline finished");
  }
}
