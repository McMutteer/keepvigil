/**
 * Clones a GitHub repository at a specific SHA into a temporary directory
 * for use by the shell executor. Callers must call cleanupRepo() afterwards.
 */

import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Maximum time for any single git operation (clone, fetch, checkout) */
const GIT_TIMEOUT_MS = 120_000;

export interface CloneOptions {
  owner: string;
  repo: string;
  sha: string;
  /** Installation access token for private repos. Omit for public repos. */
  githubToken?: string;
}

/**
 * Validates a repo path segment to prevent directory traversal or injection.
 * Each path segment must contain only safe characters.
 */
function validateRepoPath(repoPath: string): void {
  const safeSegment = /^[a-zA-Z0-9._-]+$/;
  const segments = repoPath.split("/").filter(Boolean);
  for (const segment of segments) {
    if (!safeSegment.test(segment)) {
      throw new Error(`Invalid repo path segment: ${segment}`);
    }
  }
  if (repoPath.includes("..") || repoPath.includes("\0")) {
    throw new Error(`Path traversal detected in repo path: ${repoPath}`);
  }
}

/**
 * Clone the repository at the given SHA into a temporary directory.
 * Returns the absolute path to the cloned repo.
 */
export async function cloneRepo(options: CloneOptions): Promise<string> {
  const { owner, repo, sha, githubToken } = options;

  const tmpDir = await mkdtemp(join(tmpdir(), "vigil-"));
  const repoPath = join(tmpDir, `${owner}-${repo}`);

  // Validate before any filesystem or network operation
  validateRepoPath(repoPath);

  const cloneUrl = githubToken
    ? `https://x-access-token:${githubToken}@github.com/${owner}/${repo}.git`
    : `https://github.com/${owner}/${repo}.git`;

  try {
    await execFileAsync("git", [
      "clone",
      "--depth",
      "1",
      "--no-tags",
      cloneUrl,
      repoPath,
    ], { timeout: GIT_TIMEOUT_MS });

    // Checkout the specific commit (shallow clone may not have it if it's old)
    await execFileAsync("git", ["fetch", "--depth", "1", "origin", sha], {
      cwd: repoPath,
      timeout: GIT_TIMEOUT_MS,
    });
    await execFileAsync("git", ["checkout", sha], {
      cwd: repoPath,
      timeout: GIT_TIMEOUT_MS,
    });

    return repoPath;
  } catch (err) {
    // Clean up the temp directory if git operations fail
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}

/** Remove the cloned repository directory. Non-fatal — log errors rather than throw. */
export async function cleanupRepo(repoPath: string): Promise<void> {
  await rm(repoPath, { recursive: true, force: true });
}
