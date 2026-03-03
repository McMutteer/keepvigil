import type { Context } from "probot";
import { hasTestPlan } from "../utils/has-test-plan.js";
import { createPendingCheckRun } from "../services/check-run.js";
import { enqueueVerification } from "../services/queue.js";

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

  const prBody = pr.body ?? "";

  if (!hasTestPlan(prBody)) {
    context.log.info(
      { pr: pr.number, repo: repository.full_name },
      "No test plan found in PR body — skipping",
    );
    return;
  }

  const owner = repository.owner.login;
  const repo = repository.name;

  context.log.info(
    { pr: pr.number, repo: repository.full_name, action: context.payload.action },
    "Test plan detected — creating check run",
  );

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
      prBody,
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
