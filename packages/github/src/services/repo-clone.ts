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

export interface CloneOptions {
  owner: string;
  repo: string;
  sha: string;
  /** Installation access token for private repos. Omit for public repos. */
  githubToken?: string;
}

/**
 * Validates a repo path to prevent directory traversal or injection.
 * Same character set as the shell executor's allowlist.
 */
function validateRepoPath(repoPath: string): void {
  if (!/^[a-zA-Z0-9_\-/:.]+$/.test(repoPath)) {
    throw new Error(`Invalid repo path characters: ${repoPath}`);
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

  const cloneUrl = githubToken
    ? `https://x-access-token:${githubToken}@github.com/${owner}/${repo}.git`
    : `https://github.com/${owner}/${repo}.git`;

  await execFileAsync("git", [
    "clone",
    "--depth",
    "1",
    "--no-tags",
    cloneUrl,
    repoPath,
  ]);

  // Checkout the specific commit (shallow clone may not have it if it's old)
  await execFileAsync("git", ["fetch", "--depth", "1", "origin", sha], {
    cwd: repoPath,
  });
  await execFileAsync("git", ["checkout", sha], { cwd: repoPath });

  validateRepoPath(repoPath);
  return repoPath;
}

/** Remove the cloned repository directory. Non-fatal — log errors rather than throw. */
export async function cleanupRepo(repoPath: string): Promise<void> {
  await rm(repoPath, { recursive: true, force: true });
}
