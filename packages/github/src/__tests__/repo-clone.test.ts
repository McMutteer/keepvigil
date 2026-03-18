import { describe, it, expect, vi, beforeEach } from "vitest";
import { VigilSecurityError } from "@vigil/core";

// Mock node:fs/promises
vi.mock("node:fs/promises", () => ({
  mkdtemp: vi.fn().mockResolvedValue("/tmp/vigil-abc123"),
  rm: vi.fn().mockResolvedValue(undefined),
}));

// Mock node:child_process
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

// Mock node:os
vi.mock("node:os", () => ({
  tmpdir: vi.fn(() => "/tmp"),
}));

import { cloneRepo, cleanupRepo } from "../services/repo-clone.js";
import { mkdtemp, rm } from "node:fs/promises";
import { execFile } from "node:child_process";

// execFile is used via promisify, so we need to make it call the callback
function mockExecFileSuccess() {
  vi.mocked(execFile).mockImplementation(
    (_cmd: string, _args?: unknown, _opts?: unknown, cb?: unknown) => {
      // promisify expects (err, result) callback as last arg
      const callback = typeof _opts === "function" ? _opts : cb;
      if (typeof callback === "function") {
        (callback as (err: null, result: { stdout: string; stderr: string }) => void)(null, { stdout: "", stderr: "" });
      }
      return {} as ReturnType<typeof execFile>;
    },
  );
}

function mockExecFileFailure(error: Error) {
  vi.mocked(execFile).mockImplementation(
    (_cmd: string, _args?: unknown, _opts?: unknown, cb?: unknown) => {
      const callback = typeof _opts === "function" ? _opts : cb;
      if (typeof callback === "function") {
        (callback as (err: Error) => void)(error);
      }
      return {} as ReturnType<typeof execFile>;
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mkdtemp).mockResolvedValue("/tmp/vigil-abc123");
  vi.mocked(rm).mockResolvedValue(undefined);
});

describe("cloneRepo", () => {
  // --- path validation ---

  it("rejects owner with path traversal (..) via regex", async () => {
    mockExecFileSuccess();
    await expect(
      cloneRepo({ owner: "..", repo: "safe-repo", sha: "abc123" }),
    ).rejects.toThrow(VigilSecurityError);
  });

  it("rejects repo with path traversal (..) via regex", async () => {
    mockExecFileSuccess();
    await expect(
      cloneRepo({ owner: "valid-owner", repo: "..", sha: "abc123" }),
    ).rejects.toThrow(VigilSecurityError);
  });

  it("rejects repo with null bytes", async () => {
    mockExecFileSuccess();
    await expect(
      cloneRepo({ owner: "valid-owner", repo: "repo\0evil", sha: "abc123" }),
    ).rejects.toThrow(VigilSecurityError);
  });

  it("rejects owner containing invalid characters", async () => {
    mockExecFileSuccess();
    await expect(
      cloneRepo({ owner: "owner;rm -rf /", repo: "repo", sha: "abc123" }),
    ).rejects.toThrow(VigilSecurityError);
  });

  it("rejects repo containing spaces", async () => {
    mockExecFileSuccess();
    await expect(
      cloneRepo({ owner: "owner", repo: "my repo", sha: "abc123" }),
    ).rejects.toThrow(VigilSecurityError);
  });

  // --- valid names ---

  it("accepts valid owner and repo names", async () => {
    mockExecFileSuccess();
    const result = await cloneRepo({
      owner: "McMutteer",
      repo: "keepvigil",
      sha: "abc123def",
    });
    expect(result).toBe("/tmp/vigil-abc123/McMutteer-keepvigil");
  });

  it("accepts owner and repo with dots, hyphens, and underscores", async () => {
    mockExecFileSuccess();
    const result = await cloneRepo({
      owner: "my-org.v2",
      repo: "my_repo-name.js",
      sha: "deadbeef",
    });
    expect(result).toBe("/tmp/vigil-abc123/my-org.v2-my_repo-name.js");
  });

  // --- clone URL format ---

  it("builds clone URL without token for public repos", async () => {
    mockExecFileSuccess();
    await cloneRepo({ owner: "org", repo: "repo", sha: "abc123" });
    expect(execFile).toHaveBeenCalledWith(
      "git",
      ["clone", "--depth", "1", "--no-tags", "https://github.com/org/repo.git", expect.stringContaining("org-repo")],
      expect.objectContaining({ timeout: 120_000 }),
      expect.any(Function),
    );
  });

  it("builds clone URL with token for private repos", async () => {
    mockExecFileSuccess();
    await cloneRepo({ owner: "org", repo: "repo", sha: "abc123", githubToken: "ghs_secret" });
    expect(execFile).toHaveBeenCalledWith(
      "git",
      [
        "clone", "--depth", "1", "--no-tags",
        "https://x-access-token:ghs_secret@github.com/org/repo.git",
        expect.stringContaining("org-repo"),
      ],
      expect.objectContaining({ timeout: 120_000 }),
      expect.any(Function),
    );
  });

  // --- cleanup on failure ---

  it("cleans up temp directory when git clone fails", async () => {
    mockExecFileFailure(new Error("fatal: repository not found"));
    await expect(
      cloneRepo({ owner: "org", repo: "repo", sha: "abc123" }),
    ).rejects.toThrow("fatal: repository not found");
    expect(rm).toHaveBeenCalledWith("/tmp/vigil-abc123", { recursive: true, force: true });
  });
});

describe("cleanupRepo", () => {
  it("removes the given directory recursively", async () => {
    await cleanupRepo("/tmp/vigil-abc123/org-repo");
    expect(rm).toHaveBeenCalledWith("/tmp/vigil-abc123/org-repo", { recursive: true, force: true });
  });
});
