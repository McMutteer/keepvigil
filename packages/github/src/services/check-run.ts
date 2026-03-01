import type { ProbotOctokit } from "probot";

export interface CreateCheckRunParams {
  owner: string;
  repo: string;
  headSha: string;
  pullNumber: number;
}

/**
 * Create a pending Check Run on a PR. Returns the check run ID
 * for later updates by the result reporter (Section 8).
 */
export async function createPendingCheckRun(
  octokit: ProbotOctokit,
  params: CreateCheckRunParams,
): Promise<number> {
  const { data } = await octokit.rest.checks.create({
    owner: params.owner,
    repo: params.repo,
    name: "Vigil — Test Plan Verification",
    head_sha: params.headSha,
    status: "queued",
    output: {
      title: "Test plan verification queued",
      summary: `Vigil is verifying the test plan for PR #${params.pullNumber}. Results will appear here once complete.`,
    },
  });
  return data.id;
}
