import type { ProbotOctokit } from "probot";
import type { ClassifiedItem, ExecutionResult, VigilConfig, Signal, ConfidenceScore } from "@vigil/core";
import { createLogger, computeScore } from "@vigil/core";
import { updateCheckRun, determineConclusion, conclusionFromScore } from "./check-run-updater.js";
import { buildCommentBody, COMMENT_MARKER } from "./comment-builder.js";
import { notifyWebhooks } from "./webhook-notifier.js";

const log = createLogger("reporter");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Status of a single item after matching classification with execution. */
export type ItemVerdict = "passed" | "failed" | "skipped" | "error" | "infra-skipped";

/** Check Run conclusion. */
export type CheckConclusion = "success" | "failure" | "neutral";

/** A classified item paired with its execution result (if any). */
export interface ReportItem {
  classified: ClassifiedItem;
  result: ExecutionResult | null;
  verdict: ItemVerdict;
}

/** Aggregate counts for the summary line. */
export interface ReportSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  needsReview: number;
}

/** Full report context passed to the reporter entry point. */
export interface ReportContext {
  octokit: ProbotOctokit;
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  checkRunId: number;
  classifiedItems: ClassifiedItem[];
  executionResults: ExecutionResult[];
  /** If set, indicates a pipeline-level error (empty parse, crash, etc.) */
  pipelineError?: string | null;
  /** Correlation ID for this pipeline run — included in check run footer. */
  correlationId?: string;
  /** Parsed .vigil.yml config — included in PR comment when present. */
  vigiConfig?: VigilConfig;
  /** Validation warnings from parsing .vigil.yml — surfaced in the PR comment. */
  configWarnings?: string[];
  /** Item IDs included in this retry run — shown in comment header when set. */
  retryItemIds?: string[];
  /** Signals collected during the pipeline — used to compute confidence score. */
  signals?: Signal[];
}

// ---------------------------------------------------------------------------
// Item matching
// ---------------------------------------------------------------------------

/** Match classified items to execution results by itemId. */
export function buildReportItems(
  classifiedItems: ClassifiedItem[],
  executionResults: ExecutionResult[],
): ReportItem[] {
  const resultMap = new Map(executionResults.map(r => [r.itemId, r]));

  return classifiedItems.map(classified => {
    if (classified.confidence === "SKIP") {
      return { classified, result: null, verdict: "skipped" as const };
    }

    const result = resultMap.get(classified.item.id) ?? null;

    if (!result) {
      return { classified, result: null, verdict: "error" as const };
    }

    // Infrastructure skip: infra limitation prevented execution (no repo, no preview, allowlist rejection)
    const evidence = result.evidence as Record<string, unknown>;
    if (evidence.infrastructureSkip) {
      return { classified, result, verdict: "infra-skipped" as const };
    }

    return {
      classified,
      result,
      verdict: result.passed ? ("passed" as const) : ("failed" as const),
    };
  });
}

// ---------------------------------------------------------------------------
// Summary computation
// ---------------------------------------------------------------------------

/** Compute aggregate counts from report items. */
export function computeSummary(items: ReportItem[]): ReportSummary {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let needsReview = 0;

  let infraSkipped = 0;

  for (const item of items) {
    if (item.verdict === "skipped") {
      skipped++;
    } else if (item.verdict === "infra-skipped") {
      infraSkipped++;
    } else if (item.verdict === "passed") {
      passed++;
    } else {
      const conf = item.classified.confidence;
      if (conf === "MEDIUM" || conf === "LOW") {
        needsReview++;
      } else {
        failed++;
      }
    }
  }

  // Include infra-skipped in the skipped bucket for summary totals
  skipped += infraSkipped;

  return { total: items.length, passed, failed, skipped, needsReview };
}

// ---------------------------------------------------------------------------
// Comment posting with idempotency
// ---------------------------------------------------------------------------

async function findExistingComment(
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<number | null> {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pullNumber,
    per_page: 100,
  });
  const existing = comments.find(
    c => c.body?.includes(COMMENT_MARKER) && c.user?.type === "Bot",
  );
  return existing?.id ?? null;
}

async function postOrUpdateComment(
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string,
): Promise<void> {
  const existingId = await findExistingComment(octokit, owner, repo, pullNumber);

  if (existingId) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingId,
      body,
    });
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body,
    });
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Report execution results to GitHub.
 * Updates the Check Run and posts/updates a PR comment.
 * Called by the orchestrator after all executors complete.
 */
export async function reportResults(context: ReportContext): Promise<void> {
  const items = buildReportItems(context.classifiedItems, context.executionResults);
  const summary = computeSummary(items);

  // When signals are available AND no pipeline error, compute score-based conclusion.
  // Pipeline errors mean incomplete signal collection — fall back to v1 for safety.
  let confidenceScore: ConfidenceScore | undefined;
  let conclusion: CheckConclusion;

  if (context.signals && context.signals.length > 0 && !context.pipelineError) {
    confidenceScore = computeScore(context.signals);
    conclusion = conclusionFromScore(confidenceScore);
  } else {
    conclusion = context.pipelineError && items.length === 0 ? "neutral" : determineConclusion(items);
  }

  // Critical — let errors propagate so BullMQ can retry
  await updateCheckRun({
    octokit: context.octokit,
    owner: context.owner,
    repo: context.repo,
    checkRunId: context.checkRunId,
    conclusion,
    summary,
    items,
    pipelineError: context.pipelineError ?? undefined,
    correlationId: context.correlationId,
    confidenceScore,
  });

  // Secondary — catch errors so a comment failure doesn't re-trigger the whole job
  try {
    // Detect first-run: no existing Vigil comment means this is the first time for this repo/PR
    const existingCommentId = await findExistingComment(context.octokit, context.owner, context.repo, context.pullNumber);
    const isFirstRun = !existingCommentId;

    const commentBody = buildCommentBody(
      items,
      summary,
      context.pipelineError ?? undefined,
      context.correlationId,
      context.vigiConfig,
      context.configWarnings,
      context.retryItemIds,
      confidenceScore,
      isFirstRun,
    );

    if (existingCommentId) {
      await context.octokit.rest.issues.updateComment({
        owner: context.owner,
        repo: context.repo,
        comment_id: existingCommentId,
        body: commentBody,
      });
    } else {
      await context.octokit.rest.issues.createComment({
        owner: context.owner,
        repo: context.repo,
        issue_number: context.pullNumber,
        body: commentBody,
      });
    }
  } catch (err) {
    log.error({ err }, "Failed to post/update PR comment");
  }

  // Tertiary — webhook notifications (fire-and-forget, never re-trigger the job)
  const notifConfig = context.vigiConfig?.notifications;
  if (notifConfig?.urls?.length) {
    const shouldNotify = notifConfig.on === "always" || conclusion !== "success";
    if (shouldNotify) {
      void notifyWebhooks({
        urls: notifConfig.urls,
        conclusion,
        summary,
        items,
        owner: context.owner,
        repo: context.repo,
        pullNumber: context.pullNumber,
        isRetry: Array.isArray(context.retryItemIds) && context.retryItemIds.length > 0,
      }).catch((err) => {
        log.error({ err }, "Webhook notification failed");
      });
    }
  }
}
