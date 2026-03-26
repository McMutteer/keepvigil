/**
 * Main orchestration pipeline for PR verification.
 * Called by the BullMQ worker for each job.
 *
 * All PRs run the same v2 signal set — no test plan execution.
 * Signals: claims, undocumented, credential, coverage, contract (Pro), diff (Pro).
 */

import { randomUUID } from "node:crypto";
import type { Probot } from "probot";
import type { Signal, VerifyTestPlanJob, LLMUsageEvent } from "@vigil/core";
import { createLLMClient, createLLMClientWithFallback, scanCredentials, extractChangedFilesWithStatus, mapCoverage, assessRisk, createLogger, runWithCorrelationId, getWeights } from "@vigil/core";
import type { ReasoningEffort } from "@vigil/core";
import type { Database } from "@vigil/core/db";
import { schema } from "@vigil/core/db";
import { reportResults } from "./reporter.js";
import { fetchPRDiff, fetchRepoFileList } from "./diff-fetcher.js";
// diff-analyzer is skipped in v2-only mode — kept for future repurposing
// import { analyzeDiff } from "./diff-analyzer.js";
import { checkContracts } from "./contract-checker.js";
import { checkPlan, isPro } from "./subscription.js";
import { checkRateLimit } from "./rate-limiter.js";
import { verifyClaims } from "./claims-verifier.js";
import { detectUndocumentedChanges } from "./undocumented-changes.js";
import { generateDescription, shouldGenerate } from "./description-generator.js";
import { loadRepoRules, applyIgnoreRules } from "./repo-memory.js";

const log = createLogger("pipeline");

let pipelineDb: Database | null = null;

/** Set the database instance for subscription lookups */
export function setPipelineDb(database: Database): void {
  pipelineDb = database;
}

export interface PipelineLLMConfig {
  openaiApiKey?: string;
  groqApiKey: string;
  groqModel?: string;
}

/**
 * Run the full verification pipeline for a single PR job.
 */
export async function runPipeline(
  job: VerifyTestPlanJob,
  probot: Probot,
  llmConfig: PipelineLLMConfig,
): Promise<void> {
  const correlationId = randomUUID();
  return runWithCorrelationId(correlationId, () => _runPipeline(job, probot, llmConfig, correlationId));
}

// ---------------------------------------------------------------------------
// LLM client creation
// ---------------------------------------------------------------------------

/** Default Groq model — fallback when OpenAI is not configured */
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

/** OpenAI mini model — primary when OPENAI_API_KEY is set (supports reasoning) */
const OPENAI_MODEL = "gpt-5.4-mini";

/** Reasoning effort by subscription tier */
const TIER_REASONING: Record<string, ReasoningEffort> = {
  free: "medium",
  pro: "medium",
  team: "medium",
};

// ---------------------------------------------------------------------------
// Helper: push signal with weight override
// ---------------------------------------------------------------------------

function pushSignal(signals: Signal[], signal: Signal, weight: number): void {
  signals.push({ ...signal, weight });
}

/** Per-signal timeout — prevents a hung LLM call from blocking the entire pipeline */
const SIGNAL_TIMEOUT_MS = 60_000;

async function withTimeout<T>(promise: Promise<T>, signalName: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Signal "${signalName}" timed out after ${SIGNAL_TIMEOUT_MS / 1000}s`)), SIGNAL_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Run a signal with timeout and individual error handling. Returns null on failure. */
async function safeRunSignal<T>(
  signalName: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await withTimeout(fn(), signalName);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ signal: signalName, error: msg }, "Signal failed");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Diff quality heuristics
// ---------------------------------------------------------------------------

/** Lockfile and generated file patterns — not "real" source changes */
const LOCKFILE_PATTERNS = [
  /\.lock$/i,
  /\.lockb$/i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /Cargo\.lock$/i,
  /go\.sum$/i,
  /composer\.lock$/i,
  /Gemfile\.lock$/i,
  /poetry\.lock$/i,
];

/**
 * Detect when a diff likely only contains lockfile/generated changes
 * but the PR description suggests actual code changes were made.
 */
function isDiffLikelyTruncated(diff: string, prBody: string, prTitle: string): boolean {
  const changedFiles: string[] = [];
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) changedFiles.push(line.slice(6));
  }
  if (changedFiles.length === 0) return false;

  const allLockfiles = changedFiles.every((f) =>
    LOCKFILE_PATTERNS.some((p) => p.test(f)),
  );
  if (!allLockfiles) return false;

  // If the title/body suggests code changes beyond lockfiles, diff is likely truncated
  const description = `${prTitle} ${prBody}`.toLowerCase();
  const codeKeywords = /\b(feat|fix|refactor|add|implement|create|update|remove|delete|change|modify|endpoint|component|api|function|class|module|service|handler|route)\b/;
  return codeKeywords.test(description);
}

// ---------------------------------------------------------------------------
// Coordinator
// ---------------------------------------------------------------------------

async function _runPipeline(
  job: VerifyTestPlanJob,
  probot: Probot,
  llmConfig: PipelineLLMConfig,
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

  const rateCheck = checkRateLimit(Number(installationId), tier, job.prAuthorId != null ? String(job.prAuthorId) : job.prAuthor);
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

  // LLM usage tracking — fire-and-forget DB inserts
  // Each signal gets its own onUsage callback that captures signalId by value
  // to avoid race conditions with a shared mutable variable.
  let currentSignalId = "unknown";
  const makeOnUsage = (signalId: string) => (event: LLMUsageEvent) => {
    if (!pipelineDb) return;
    pipelineDb.insert(schema.llmUsage).values({
      correlationId,
      installationId,
      owner,
      repo,
      pullNumber,
      signalId,
      provider: event.provider,
      model: event.model,
      promptTokens: event.promptTokens,
      completionTokens: event.completionTokens,
      totalTokens: event.totalTokens,
      estimatedCostUsd: event.estimatedCostUsd,
    }).catch((err) => log.warn({ error: String(err) }, "Failed to persist LLM usage"));
  };
  const onUsage = (event: LLMUsageEvent) => makeOnUsage(currentSignalId)(event);

  try {
    // Stage 1: Create LLM client (OpenAI mini primary, Groq fallback)
    const reasoningEffort = TIER_REASONING[tier] ?? "none";
    const groqModel = llmConfig.groqModel || GROQ_MODEL;

    const llm = llmConfig.openaiApiKey
      ? createLLMClientWithFallback(
          { provider: "openai", model: OPENAI_MODEL, apiKey: llmConfig.openaiApiKey, reasoningEffort, onUsage },
          { provider: "groq", model: groqModel, apiKey: llmConfig.groqApiKey, onUsage },
        )
      : createLLMClient({
          provider: "groq",
          model: groqModel,
          apiKey: llmConfig.groqApiKey,
          onUsage,
        });

    log.info({ provider: llmConfig.openaiApiKey ? "openai" : "groq", model: llmConfig.openaiApiKey ? OPENAI_MODEL : groqModel, reasoningEffort }, "LLM client created");

    // Stage 2: Fetch PR diff
    diff = await fetchPRDiff({ octokit, owner, repo, pullNumber });

    // Detect potentially truncated diffs — warn if only lockfiles/generated files are visible
    // but the PR description suggests code changes
    if (diff && isDiffLikelyTruncated(diff, prBody, prTitle)) {
      pipelineError = "Diff may be incomplete — only lockfile/generated changes visible. Verification is limited.";
      log.warn({ owner, repo, pullNumber }, "Detected likely truncated diff");
    }

    if (diff) {
      // Claims Verifier (free tier)
      currentSignalId = "claims-verifier";
      const claimsSignal = await safeRunSignal("claims-verifier", () =>
        verifyClaims({ prTitle, prBody, diff: diff!, llm }),
      );
      if (claimsSignal) {
        pushSignal(signals, claimsSignal, weights["claims-verifier"]);
        log.info({ signalId: claimsSignal.id, score: claimsSignal.score, passed: claimsSignal.passed }, "Claims verifier complete");
      }

      // Description Generator (free tier, only when body is empty/generic or no claims found)
      const claimsFound = claimsSignal?.details.filter((d) => d.status !== "skip").length ?? 0;
      if (shouldGenerate(prBody, prTitle, claimsFound)) {
        currentSignalId = "description-generator";
        const descSignal = await safeRunSignal("description-generator", () =>
          generateDescription({ prTitle, prBody, diff: diff!, llm, claimsFound }),
        );
        if (descSignal) {
          pushSignal(signals, descSignal, weights["description-generator"]);
          log.info({ signalId: descSignal.id, score: descSignal.score, generated: descSignal.details.some((d) => d.label === "generated-description") }, "Description generator complete");
        }
      }

      // Undocumented Changes (free tier)
      currentSignalId = "undocumented-changes";
      const undocSignal = await safeRunSignal("undocumented-changes", () =>
        detectUndocumentedChanges({ prTitle, prBody, diff: diff!, llm }),
      );
      if (undocSignal) {
        pushSignal(signals, undocSignal, weights["undocumented-changes"]);
        log.info({ signalId: undocSignal.id, score: undocSignal.score, passed: undocSignal.passed, findings: undocSignal.details.length }, "Undocumented changes complete");
      }

      // Credential Scan (free tier — synchronous, no timeout needed)
      const credSignal = scanCredentials(diff);
      pushSignal(signals, credSignal, weights["credential-scan"]);
      log.info({ signalId: credSignal.id, score: credSignal.score, passed: credSignal.passed, findings: credSignal.details.length }, "Credential scan complete");

      // Coverage Mapper (free tier — synchronous except file list fetch)
      const changedFiles = extractChangedFilesWithStatus(diff);
      const repoFiles = await fetchRepoFileList({ octokit, owner, repo, headSha });
      const coverageSignal = mapCoverage(changedFiles, repoFiles, undefined, vigiConfig?.coverage?.exclude);
      // If coverage mapper found no test files at all, reduce weight to avoid tanking the score
      const coverageWeight = coverageSignal.score === 0 && coverageSignal.details.every((d) => d.status === "fail")
        ? 2 : weights["coverage-mapper"];
      pushSignal(signals, coverageSignal, coverageWeight);
      log.info({ signalId: coverageSignal.id, score: coverageSignal.score, passed: coverageSignal.passed, weight: coverageWeight }, "Coverage mapper complete");

      // Risk Assessment (free tier, informational — weight 0)
      const riskSignal = assessRisk(diff, changedFiles, repoFiles);
      pushSignal(signals, riskSignal, weights["risk-score"]);
      log.info({ signalId: riskSignal.id, score: riskSignal.score, passed: riskSignal.passed, factors: riskSignal.details.length }, "Risk assessment complete");

      // Contract Checker (all tiers during testing)
      currentSignalId = "contract-checker";
      const contractResult = await safeRunSignal("contract-checker", () =>
        checkContracts({ diff: diff!, llm }),
      );
      if (contractResult) {
        pushSignal(signals, contractResult.signal, weights["contract-checker"]);
        log.info({ signalId: contractResult.signal.id, score: contractResult.signal.score, passed: contractResult.signal.passed }, "Contract checker complete");
      }

      // Diff Analyzer — skipped in v2-only mode (no test plan items to compare against).
      // The signal requires classifiedItems from test plan parsing, which was removed in PR #91.

      // Check if all LLM signals failed — warn about incomplete analysis
      const llmSignalIds = ["claims-verifier", "undocumented-changes", "contract-checker"];
      const llmSignalsPresent = signals.filter((s) => llmSignalIds.includes(s.id));
      const allLlmSkipped = llmSignalsPresent.length > 0 &&
        llmSignalsPresent.every((s) => s.details.every((d) => d.status === "skip"));
      if (llmSignalsPresent.length === 0 || allLlmSkipped) {
        const msg = "LLM analysis unavailable — score based on deterministic signals only";
        pipelineError = pipelineError ? `${pipelineError}. ${msg}` : msg;
        log.warn({ owner, repo, pullNumber }, msg);
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
