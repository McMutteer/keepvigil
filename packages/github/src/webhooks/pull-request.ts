import type { Context } from "probot";
import { createLogger } from "@vigil/core";
import { createPendingCheckRun } from "../services/check-run.js";
import { enqueueVerification } from "../services/queue.js";
import { parseVigilConfig } from "../services/vigil-config.js";
import { buildPlaceholderBody, COMMENT_MARKER } from "../services/comment-builder.js";
import type { VigilConfig } from "@vigil/core/types";

const log = createLogger("pull-request");

type PullRequestContext = Context<
  "pull_request.opened" | "pull_request.synchronize" | "pull_request.edited"
>;

/**
 * Handle pull_request.opened, .synchronize, and .edited events.
 * If the PR body contains a test plan (markdown checkboxes), creates
 * a pending Check Run and enqueues a verification job.
 */
export async function handlePullRequest(context: PullRequestContext): Promise<void> {
  const { pull_request: pr, repository, installation } = context.payload;

  if (!installation) {
    context.log.warn("Received PR event without installation — skipping");
    return;
  }

  const prTitle = pr.title ?? "";
  const prBody = pr.body ?? "";

  const owner = repository.owner.login;
  const repo = repository.name;

  context.log.info(
    { pr: pr.number, repo: repository.full_name, action: context.payload.action },
    "Processing PR — creating check run",
  );

  // Fetch .vigil.yml (best-effort — never blocks the job).
  // Trust policy: only load config from the PR head ref when the PR comes from
  // the same repo AND the author has explicit repo permissions. Fork PRs and
  // untrusted contributors read from the default branch instead, so they cannot
  // expand the shell allowlist via their own PR.
  let vigiConfig: VigilConfig | undefined;
  let configWarnings: string[] | undefined;
  try {
    const isSameRepoPr = pr.head.repo?.full_name === repository.full_name;
    const isTrustedAuthor = ["OWNER", "MEMBER", "COLLABORATOR"].includes(
      pr.author_association,
    );
    const configRef =
      isSameRepoPr && isTrustedAuthor
        ? pr.head.sha
        : repository.default_branch;

    const response = await context.octokit.rest.repos.getContent({
      owner,
      repo,
      path: ".vigil.yml",
      ref: configRef,
    });
    const data = response.data;
    if (!Array.isArray(data) && data.type === "file" && "content" in data) {
      const yaml = Buffer.from(data.content, "base64").toString("utf-8");
      const result = parseVigilConfig(yaml);
      vigiConfig = result.config;
      if (result.warnings.length > 0) configWarnings = result.warnings;
    }
  } catch (err) {
    // 404 = file not found (expected), anything else = log warning
    const status = (err as { status?: number })?.status;
    if (status !== 404) {
      log.warn({ owner, repo, error: String(err) }, "Failed to load .vigil.yml — using defaults");
    }
  }

  let checkRunId: number | undefined;
  let commentId: number | undefined;

  try {
    checkRunId = await createPendingCheckRun(context.octokit, {
      owner,
      repo,
      headSha: pr.head.sha,
      pullNumber: pr.number,
    });

    // Post or update placeholder comment immediately (before enqueue)
    const correlationId = crypto.randomUUID();
    const placeholderBody = buildPlaceholderBody({
      changedFiles: pr.changed_files,
      additions: pr.additions,
      deletions: pr.deletions,
      correlationId,
    });

    try {
      // Check for existing Vigil comment (re-push case)
      const comments = await context.octokit.paginate(context.octokit.rest.issues.listComments, {
        owner, repo, issue_number: pr.number, per_page: 100,
      });
      const existing = comments.find(
        c => c.body?.includes(COMMENT_MARKER) && c.user?.type === "Bot",
      );

      if (existing) {
        await context.octokit.rest.issues.updateComment({
          owner, repo, comment_id: existing.id, body: placeholderBody,
        });
        commentId = existing.id;
      } else {
        const { data } = await context.octokit.rest.issues.createComment({
          owner, repo, issue_number: pr.number, body: placeholderBody,
        });
        commentId = data.id;
      }
    } catch (placeholderErr) {
      // Non-fatal — if placeholder fails, the pipeline still runs and posts results
      log.warn({ err: placeholderErr }, "Failed to post placeholder comment");
    }

    const jobId = await enqueueVerification({
      installationId: String(installation.id),
      owner,
      repo,
      pullNumber: pr.number,
      headSha: pr.head.sha,
      checkRunId,
      prTitle,
      prBody,
      vigiConfig,
      configWarnings,
      prAuthor: pr.user?.login,
      prAuthorId: pr.user?.id,
      commentId,
      prChangedFiles: pr.changed_files,
      prAdditions: pr.additions,
      prDeletions: pr.deletions,
    });

    context.log.info(
      { pr: pr.number, checkRunId, commentId, jobId },
      "Verification job enqueued",
    );
  } catch (error) {
    context.log.error(
      { pr: pr.number, checkRunId, err: error },
      "Failed to process test plan verification",
    );

    // If the check run was created but enqueue failed, mark it as cancelled
    // to avoid an orphaned "pending" check run on the PR.
    if (checkRunId) {
      try {
        await context.octokit.rest.checks.update({
          owner,
          repo,
          check_run_id: checkRunId,
          status: "completed",
          conclusion: "cancelled",
          output: {
            title: "Verification failed to start",
            summary: "Vigil could not enqueue the verification job. This check run has been cancelled to avoid a stale pending status.",
          },
        });
      } catch (cleanupError) {
        context.log.error(
          { pr: pr.number, checkRunId, err: cleanupError },
          "Failed to cancel orphaned check run",
        );
      }
    }
  }
}
