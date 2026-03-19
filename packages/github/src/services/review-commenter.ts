/**
 * Review Commenter — posts inline comments on specific diff lines.
 *
 * Converts signal details that have file/line info into GitHub review comments,
 * then posts them as a single review via the Pulls API.
 *
 * This is a Pro feature — free tier only gets the summary issue comment.
 */

import type { ProbotOctokit } from "probot";
import type { Signal } from "@vigil/core";
import { buildDiffPositionMap, mapToReviewComment, createLogger } from "@vigil/core";

const log = createLogger("review-commenter");

/** Maximum inline comments per review (GitHub API limit is 50+, we stay conservative) */
const MAX_INLINE_COMMENTS = 30;

export interface ReviewCommenterOptions {
  octokit: ProbotOctokit;
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  diff: string;
  signals: Signal[];
}

interface InlineComment {
  path: string;
  position: number;
  body: string;
}

/** Map signal detail status to an icon for the inline comment */
function statusIcon(status: string): string {
  switch (status) {
    case "fail": return "\u274C";
    case "warn": return "\u26A0\uFE0F";
    default: return "\u2139\uFE0F";
  }
}

/**
 * Post inline review comments for signal findings that have file/line info.
 *
 * Only posts for findings with status "fail" or "warn" — passing findings
 * don't need inline attention.
 *
 * Returns the number of inline comments posted (0 if none qualified).
 */
export async function postReviewComments(options: ReviewCommenterOptions): Promise<number> {
  const { octokit, owner, repo, pullNumber, headSha, diff, signals } = options;

  if (!diff) return 0;

  const positionMap = buildDiffPositionMap(diff);
  const comments: InlineComment[] = [];

  for (const signal of signals) {
    for (const detail of signal.details) {
      // Only post inline comments for findings, not passing items
      if (detail.status !== "fail" && detail.status !== "warn") continue;
      // Must have file info
      if (!detail.file) continue;

      const location = mapToReviewComment(
        positionMap,
        detail.file,
        detail.line ?? 1,
      );
      if (!location) continue;

      const icon = statusIcon(detail.status);
      const body = `${icon} **${signal.name}:** ${detail.message}`;

      comments.push({
        path: location.path,
        position: location.position,
        body,
      });
    }
  }

  if (comments.length === 0) return 0;

  // Deduplicate: if multiple findings point to the same file+position, merge them
  const dedupMap = new Map<string, InlineComment>();
  for (const comment of comments) {
    const key = `${comment.path}:${comment.position}`;
    const existing = dedupMap.get(key);
    if (existing) {
      existing.body += `\n\n${comment.body}`;
    } else {
      dedupMap.set(key, { ...comment });
    }
  }

  const dedupedComments = [...dedupMap.values()].slice(0, MAX_INLINE_COMMENTS);

  try {
    // Fetch existing review comments from the bot to avoid duplicates across re-reviews
    const existingComments = await fetchExistingBotComments(octokit, owner, repo, pullNumber);
    const newComments = dedupedComments.filter((c) => {
      const key = `${c.path}:${c.position}`;
      return !existingComments.has(key);
    });

    if (newComments.length === 0) {
      log.info({ owner, repo, pullNumber }, "All inline comments already posted — skipping");
      return 0;
    }

    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: pullNumber,
      commit_id: headSha,
      event: "COMMENT",
      comments: newComments,
    });

    log.info({ owner, repo, pullNumber, count: newComments.length, skipped: dedupedComments.length - newComments.length }, "Review comments posted");
    return newComments.length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ error: msg.replace(/ghs_[A-Za-z0-9]+/g, "***"), owner, repo, pullNumber }, "Failed to post review comments — findings are still in the issue comment");
    return 0;
  }
}

/**
 * Fetch existing review comments from the bot on this PR.
 * Returns a Set of "path:position" keys for deduplication.
 */
async function fetchExistingBotComments(
  octokit: ProbotOctokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<Set<string>> {
  const keys = new Set<string>();
  try {
    const comments = await octokit.paginate(octokit.rest.pulls.listReviewComments, {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });
    for (const c of comments) {
      if (c.user?.type !== "Bot") continue;
      if (c.position != null && c.path) {
        keys.add(`${c.path}:${c.position}`);
      }
    }
  } catch (err) {
    log.warn({ err, owner, repo, pullNumber }, "Failed to fetch existing review comments — proceeding without dedup");
  }
  return keys;
}
