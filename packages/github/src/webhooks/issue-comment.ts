import type { Context } from "probot";
import { createPendingCheckRun } from "../services/check-run.js";
import { enqueueVerification } from "../services/queue.js";
import { parseVigilConfig } from "../services/vigil-config.js";
import { hasTestPlan } from "../utils/has-test-plan.js";
import { createLogger } from "@vigil/core";

const log = createLogger("issue-comment");

type IssueCommentContext = Context<"issue_comment.created">;

/** Prefix that triggers a Vigil retry. */
const RETRY_COMMAND = "/vigil retry";

/**
 * Handle issue_comment.created events.
 * Triggers a retry run when a trusted collaborator comments `/vigil retry [id...]` on a PR.
 *
 * Trust model: only OWNER, MEMBER, and COLLABORATOR can trigger retries.
 * This prevents fork contributors or external users from spawning arbitrary
 * sandbox executions via PR comments.
 *
 * Command syntax:
 *   /vigil retry           → re-run all items
 *   /vigil retry tp-1 tp-3 → re-run only tp-1 and tp-3
 */
export async function handleIssueComment(context: IssueCommentContext): Promise<void> {
  const { comment, issue, repository, installation, sender } = context.payload;

  // Only act on PR comments (issues don't have a pull_request field)
  if (!issue.pull_request) return;

  // Only act on /vigil retry commands
  const body = comment.body.trim();
  if (!body.startsWith(RETRY_COMMAND)) return;

  if (!installation) {
    log.warn("Received comment event without installation — skipping");
    return;
  }

  // Trust gate: only repo members/owners/collaborators can trigger retries
  const trustedRoles = ["OWNER", "MEMBER", "COLLABORATOR"];
  const authorAssociation = comment.author_association as string;
  if (!trustedRoles.includes(authorAssociation)) {
    log.info(
      { pr: issue.number, user: sender.login, association: authorAssociation },
      "Retry command from untrusted author — ignoring",
    );
    return;
  }

  // Parse optional item IDs from the command: /vigil retry tp-1 tp-3
  // If the user supplied tokens but none matched the tp-N format, fall back to
  // undefined (full re-run) rather than skipping all items.
  const afterCommand = body.slice(RETRY_COMMAND.length).trim();
  const parsed = afterCommand.length > 0
    ? afterCommand.split(/\s+/).filter((s) => /^tp-\d+$/.test(s))
    : [];
  const retryItemIds = parsed.length > 0 ? parsed : undefined; // undefined = re-run all

  const owner = repository.owner.login;
  const repo = repository.name;
  const pullNumber = issue.number;

  log.info({ owner, repo, pullNumber, retryItemIds }, "Retry command received");

  try {
    // Fetch the current PR to get head SHA and body
    const octokit = context.octokit;
    const { data: pr } = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber });

    const prBody = pr.body ?? "";
    if (!hasTestPlan(prBody)) {
      log.info({ owner, repo, pullNumber }, "PR has no test plan — skipping retry");
      return;
    }

    const headSha = pr.head.sha;

    // Fetch .vigil.yml config (same trust model as PR open: use head ref for same-repo trusted authors)
    let vigiConfig = undefined;
    let configWarnings = undefined;
    try {
      const isSameRepoPr = pr.head.repo?.full_name === repository.full_name;
      const configRef = isSameRepoPr ? headSha : repository.default_branch;
      const response = await octokit.rest.repos.getContent({
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
      // File not found or permission error — use defaults
    }

    // Create a new pending check run for this retry
    const checkRunId = await createPendingCheckRun(octokit, {
      owner,
      repo,
      headSha,
      pullNumber,
    });

    const jobId = await enqueueVerification({
      installationId: String(installation.id),
      owner,
      repo,
      pullNumber,
      headSha,
      checkRunId,
      prBody,
      vigiConfig,
      configWarnings,
      retryItemIds,
    });

    log.info({ owner, repo, pullNumber, jobId, retryItemIds }, "Retry job enqueued");
  } catch (err) {
    log.error({ err, owner, repo, pullNumber }, "Failed to enqueue retry");
  }
}
