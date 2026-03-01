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

  const checkRunId = await createPendingCheckRun(context.octokit, {
    owner,
    repo,
    headSha: pr.head.sha,
    pullNumber: pr.number,
  });

  const jobId = await enqueueVerification({
    installationId: installation.id,
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
}
