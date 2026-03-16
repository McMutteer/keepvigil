/**
 * Fetches PR diff and repo file listings via the GitHub API.
 *
 * The diff is used by multiple v2 signals (credential scanner, diff analyzer,
 * gap analyzer, coverage mapper). Fetched once per pipeline run and shared.
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
      // Truncate at last newline to avoid cutting mid-line (could split a secret pattern)
      const truncated = diff.slice(0, MAX_DIFF_SIZE);
      const lastNewline = truncated.lastIndexOf("\n");
      return lastNewline > 0 ? truncated.slice(0, lastNewline) : truncated;
    }

    return diff;
  } catch (err) {
    log.warn({ err, owner, repo, pullNumber }, "Could not fetch PR diff");
    return null;
  }
}

export interface FetchRepoFilesOptions {
  octokit: ProbotOctokit;
  owner: string;
  repo: string;
  headSha: string;
}

/**
 * Fetch the list of all files in the repo at a given SHA.
 *
 * Uses the Git tree API with recursive mode. Returns file paths only (not dirs).
 * Returns empty array on error — coverage mapper will produce a neutral signal.
 */
export async function fetchRepoFileList(options: FetchRepoFilesOptions): Promise<string[]> {
  const { octokit, owner, repo, headSha } = options;

  try {
    const { data } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: headSha,
      recursive: "true",
    });

    if (data.truncated) {
      log.warn({ owner, repo, headSha }, "Git tree truncated — coverage mapper may miss test files in large repos");
    }

    return data.tree
      .filter((entry) => entry.type === "blob" && entry.path)
      .map((entry) => entry.path!);
  } catch (err) {
    log.warn({ err, owner, repo, headSha }, "Could not fetch repo file list");
    return [];
  }
}
