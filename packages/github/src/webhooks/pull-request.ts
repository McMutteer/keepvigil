import type { Context } from "probot";
import { createPendingCheckRun } from "../services/check-run.js";
import { enqueueVerification } from "../services/queue.js";
import { parseVigilConfig } from "../services/vigil-config.js";
import type { VigilConfig } from "@vigil/core/types";

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
  } catch {
    // File not found (404) or permission error — use defaults
  }

  let checkRunId: number | undefined;

  try {
    checkRunId = await createPendingCheckRun(context.octokit, {
      owner,
      repo,
      headSha: pr.head.sha,
      pullNumber: pr.number,
    });

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
    });

    context.log.info(
      { pr: pr.number, checkRunId, jobId },
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
