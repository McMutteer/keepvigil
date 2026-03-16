import { describe, it, expect, vi } from "vitest";
import { fetchPRDiff } from "../services/diff-fetcher.js";

function makeOctokit(response: unknown, shouldThrow = false) {
  return {
    rest: {
      pulls: {
        get: shouldThrow
          ? vi.fn().mockRejectedValue(response)
          : vi.fn().mockResolvedValue({ data: response }),
      },
    },
  } as unknown as Parameters<typeof fetchPRDiff>[0]["octokit"];
}

describe("fetchPRDiff", () => {
  it("returns diff text from GitHub API", async () => {
    const diff = "diff --git a/file.ts b/file.ts\n+++ b/file.ts\n+hello";
    const octokit = makeOctokit(diff);

    const result = await fetchPRDiff({ octokit, owner: "org", repo: "repo", pullNumber: 1 });
    expect(result).toBe(diff);
    expect(octokit.rest.pulls.get).toHaveBeenCalledWith({
      owner: "org",
      repo: "repo",
      pull_number: 1,
      mediaType: { format: "diff" },
    });
  });

  it("returns null when API call fails", async () => {
    const octokit = makeOctokit(new Error("Not Found"), true);
    const result = await fetchPRDiff({ octokit, owner: "org", repo: "repo", pullNumber: 1 });
    expect(result).toBeNull();
  });

  it("returns null when API returns non-string", async () => {
    const octokit = makeOctokit({ id: 123, title: "not a diff" });
    const result = await fetchPRDiff({ octokit, owner: "org", repo: "repo", pullNumber: 1 });
    expect(result).toBeNull();
  });

  it("truncates diff larger than 1MB at last newline boundary", async () => {
    // Build a diff that exceeds max with newlines near the boundary
    const line = "x".repeat(100) + "\n";
    const lineCount = Math.ceil(1_048_576 / line.length) + 10;
    const largeDiff = line.repeat(lineCount);
    const octokit = makeOctokit(largeDiff);
    const result = await fetchPRDiff({ octokit, owner: "org", repo: "repo", pullNumber: 1 });
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(1_048_576);
    expect(result!.endsWith("\n")).toBe(false); // lastIndexOf strips trailing newline
  });

  it("returns full diff when exactly at max size", async () => {
    const exactDiff = "y".repeat(1_048_576);
    const octokit = makeOctokit(exactDiff);
    const result = await fetchPRDiff({ octokit, owner: "org", repo: "repo", pullNumber: 1 });
    expect(result).toBe(exactDiff);
  });
});
