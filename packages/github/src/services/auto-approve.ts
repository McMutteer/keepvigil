/**
 * Auto-approve — submits an approving PR review when score exceeds threshold.
 *
 * Pro/Team only. Opt-in via .vigil.yml auto_approve.threshold.
 * Fire-and-forget: failures are logged but never propagate.
 */

import type { ProbotOctokit } from "probot";
import type { ConfidenceScore, VigilConfig } from "@vigil/core";
import { createLogger } from "@vigil/core";

const log = createLogger("auto-approve");

export interface AutoApproveContext {
  octokit: ProbotOctokit;
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  confidenceScore: ConfidenceScore;
  vigiConfig?: VigilConfig;
  proEnabled: boolean;
}

/**
 * Submit an approving review if the score meets the auto-approve threshold.
 * Returns true if an approval was submitted, false otherwise.
 */
export async function maybeAutoApprove(ctx: AutoApproveContext): Promise<boolean> {
  const threshold = ctx.vigiConfig?.autoApprove?.threshold;

  // Not configured — skip
  if (!threshold) return false;

  // Pro/Team only
  if (!ctx.proEnabled) {
    log.info({ owner: ctx.owner, repo: ctx.repo, pullNumber: ctx.pullNumber }, "Auto-approve skipped — requires Pro or Team tier");
    return false;
  }

  const score = ctx.confidenceScore.score;

  if (score < threshold) {
    log.info({ owner: ctx.owner, repo: ctx.repo, pullNumber: ctx.pullNumber, score, threshold }, "Auto-approve skipped — score below threshold");
    return false;
  }

  // Build approval message
  const signalSummary = ctx.confidenceScore.signals
    .map((s) => `${s.passed ? "pass" : "fail"} ${s.name} (${s.score})`)
    .join(", ");

  const body = [
    `**Vigil auto-approved** — score ${score}/100 (threshold: ${threshold})`,
    "",
    `Recommendation: ${ctx.confidenceScore.recommendation}`,
    `Signals: ${signalSummary}`,
    "",
    "_This approval was submitted automatically based on your `.vigil.yml` configuration._",
  ].join("\n");

  await ctx.octokit.rest.pulls.createReview({
    owner: ctx.owner,
    repo: ctx.repo,
    pull_number: ctx.pullNumber,
    commit_id: ctx.headSha,
    event: "APPROVE",
    body,
  });

  log.info({ owner: ctx.owner, repo: ctx.repo, pullNumber: ctx.pullNumber, score, threshold }, "PR auto-approved");

  return true;
}
