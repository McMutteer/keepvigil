import type { ProbotOctokit } from "probot";
import type { ClassifiedItem, ExecutionResult, VigilConfig } from "@vigil/core";
import { createLogger } from "@vigil/core";
import { updateCheckRun, determineConclusion } from "./check-run-updater.js";
import { buildCommentBody, COMMENT_MARKER } from "./comment-builder.js";

const log = createLogger("reporter");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Status of a single item after matching classification with execution. */
export type ItemVerdict = "passed" | "failed" | "skipped" | "error";

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

  for (const item of items) {
    if (item.verdict === "skipped") {
      skipped++;
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
  const conclusion = context.pipelineError && items.length === 0 ? "neutral" : determineConclusion(items);

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
  });

  // Secondary — catch errors so a comment failure doesn't re-trigger the whole job
  try {
    const commentBody = buildCommentBody(
      items,
      summary,
      context.pipelineError ?? undefined,
      context.correlationId,
      context.vigiConfig,
      context.configWarnings,
      context.retryItemIds,
    );
    await postOrUpdateComment(
      context.octokit,
      context.owner,
      context.repo,
      context.pullNumber,
      commentBody,
    );
  } catch (err) {
    log.error({ err }, "Failed to post/update PR comment");
  }
}
