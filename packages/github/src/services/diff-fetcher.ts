/**
 * Fetches the unified diff for a pull request via the GitHub API.
 *
 * The diff is used by multiple v2 signals (credential scanner, diff analyzer,
 * gap analyzer). Fetched once per pipeline run and shared across signals.
 */

import type { ProbotOctokit } from "probot";
import { createLogger } from "@vigil/core";

const log = createLogger("diff-fetcher");

/** Maximum diff size to process (1MB) — prevents memory issues on massive PRs */
const MAX_DIFF_SIZE = 1_048_576;

export interface FetchDiffOptions {
  octokit: ProbotOctokit;
  owner: string;
  repo: string;
  pullNumber: number;
}

/**
 * Fetch the unified diff for a PR.
 *
 * Uses the `application/vnd.github.diff` media type to get the raw diff.
 * Returns null if the API call fails — the pipeline continues without
 * diff-dependent signals.
 */
export async function fetchPRDiff(options: FetchDiffOptions): Promise<string | null> {
  const { octokit, owner, repo, pullNumber } = options;

  try {
    const { data } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      mediaType: { format: "diff" },
    });

    // The diff media type returns a string, but TypeScript types it as PR data
    const diff = data as unknown as string;
    if (typeof diff !== "string") {
      log.warn({ owner, repo, pullNumber }, "GitHub API returned non-string diff");
      return null;
    }

    if (diff.length > MAX_DIFF_SIZE) {
      log.info({ owner, repo, pullNumber, size: diff.length, max: MAX_DIFF_SIZE }, "Diff truncated to max size");
      return diff.slice(0, MAX_DIFF_SIZE);
    }

    return diff;
  } catch (err) {
    log.warn({ err, owner, repo, pullNumber }, "Could not fetch PR diff");
    return null;
  }
}
