import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecFile = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ execFile: mockExecFile }));

import { runInSandbox } from "../sandbox.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockExecSuccess(stdout = "done", stderr = ""): void {
  mockExecFile.mockImplementation(
    (_file: string, _args: string[], _opts: unknown, cb: (e: null, out: string, err: string) => void) => {
      cb(null, stdout, stderr);
      return { pid: 1 };
    },
  );
}

// ---------------------------------------------------------------------------
// Image name validation
// ---------------------------------------------------------------------------

describe("sandbox — image name validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["node:22-alpine"],
    ["python:3.12-slim"],
    ["mcr.microsoft.com/dotnet/sdk:8.0"],
    ["ghcr.io/owner/image:latest"],
    ["myimage"],
    ["registry.example.com/org/repo:v1.2.3"],
    ["node@sha256:" + "a".repeat(64)],
  ])("accepts valid image name: %s", async (image) => {
    mockExecSuccess();
    await expect(
      runInSandbox("echo ok", { repoPath: "/tmp/repo", sandboxImage: image }),
    ).resolves.toBeDefined();
  });

  it.each([
    ["image with spaces", "spaces in name"],
    ["--privileged", "leading dash (flag injection)"],
    ["-v /:/host node", "leading dash short flag"],
    ["image;rm -rf /", "semicolon injection"],
    ["image\necho pwned", "newline injection"],
    ["image`whoami`", "backtick injection"],
    ["image$(id)", "command substitution"],
    ["image|cat", "pipe character"],
  ])("rejects invalid image name: %s (%s)", async (image) => {
    await expect(
      runInSandbox("echo ok", { repoPath: "/tmp/repo", sandboxImage: image }),
    ).rejects.toThrow("Invalid Docker image name");
  });

  it("rejects image names longer than 255 characters", async () => {
    const longName = "a".repeat(256);
    await expect(
      runInSandbox("echo ok", { repoPath: "/tmp/repo", sandboxImage: longName }),
    ).rejects.toThrow("too long");
  });

  it("accepts image name at exactly 255 characters", async () => {
    mockExecSuccess();
    const name = "a".repeat(255);
    await expect(
      runInSandbox("echo ok", { repoPath: "/tmp/repo", sandboxImage: name }),
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Repo path validation
// ---------------------------------------------------------------------------

describe("sandbox — repo path validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["/tmp/repo"],
    ["/home/user/project"],
    ["/var/lib/vigil/repos/abc_123"],
    ["/tmp/vigil/repo.with.dots"],
  ])("accepts valid repo path: %s", async (repoPath) => {
    mockExecSuccess();
    await expect(
      runInSandbox("echo ok", { repoPath }),
    ).resolves.toBeDefined();
  });

  it.each([
    ["/tmp/repo name", "path with spaces"],
    ['/tmp" --privileged', "quote injection"],
    ["/tmp/repo;rm -rf /", "semicolon in path"],
    ["relative/path", "relative path"],
    ["", "empty path"],
    ["/tmp/$(whoami)", "command substitution"],
    ["/tmp/repo\necho pwned", "newline injection"],
    ["/tmp/repo`id`", "backtick injection"],
    ["/tmp/repo<test", "angle bracket"],
  ])("rejects invalid repo path: %s (%s)", async (repoPath) => {
    await expect(
      runInSandbox("echo ok", { repoPath }),
    ).rejects.toThrow("Invalid repoPath");
  });

  it("rejects repo paths longer than 512 characters", async () => {
    const longPath = "/" + "a".repeat(512);
    await expect(
      runInSandbox("echo ok", { repoPath: longPath }),
    ).rejects.toThrow("too long");
  });

  it("accepts repo path at exactly 512 characters", async () => {
    mockExecSuccess();
    const path = "/" + "a".repeat(511);
    expect(path.length).toBe(512);
    await expect(
      runInSandbox("echo ok", { repoPath: path }),
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Timeout validation
// ---------------------------------------------------------------------------

describe("sandbox — timeout validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [0, "zero"],
    [-1, "negative"],
    [-Infinity, "negative infinity"],
    [NaN, "NaN"],
    [Infinity, "positive infinity"],
  ])("rejects invalid timeoutMs: %s (%s)", async (ms) => {
    await expect(
      runInSandbox("echo ok", { repoPath: "/tmp/repo", timeoutMs: ms }),
    ).rejects.toThrow("Invalid timeoutMs");
  });

  it("accepts a valid positive timeout", async () => {
    mockExecSuccess();
    await expect(
      runInSandbox("echo ok", { repoPath: "/tmp/repo", timeoutMs: 10_000 }),
    ).resolves.toBeDefined();
  });

  it("uses default timeout when not specified", async () => {
    mockExecSuccess();
    await runInSandbox("echo ok", { repoPath: "/tmp/repo" });
    const opts = mockExecFile.mock.calls[0][2] as { timeout: number };
    expect(opts.timeout).toBe(300_000);
  });
});

// ---------------------------------------------------------------------------
// Docker args construction (no actual Docker execution)
// ---------------------------------------------------------------------------

describe("sandbox — docker args construction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes --network none for isolation", async () => {
    mockExecSuccess();
    await runInSandbox("npm test", { repoPath: "/tmp/repo" });
    const args = mockExecFile.mock.calls[0][1] as string[];
    const netIdx = args.indexOf("--network");
    expect(netIdx).toBeGreaterThan(-1);
    expect(args[netIdx + 1]).toBe("none");
  });

  it("passes --memory 512m", async () => {
    mockExecSuccess();
    await runInSandbox("npm test", { repoPath: "/tmp/repo" });
    const args = mockExecFile.mock.calls[0][1] as string[];
    const memIdx = args.indexOf("--memory");
    expect(memIdx).toBeGreaterThan(-1);
    expect(args[memIdx + 1]).toBe("512m");
  });

  it("passes --cpus 1", async () => {
    mockExecSuccess();
    await runInSandbox("npm test", { repoPath: "/tmp/repo" });
    const args = mockExecFile.mock.calls[0][1] as string[];
    const cpuIdx = args.indexOf("--cpus");
    expect(cpuIdx).toBeGreaterThan(-1);
    expect(args[cpuIdx + 1]).toBe("1");
  });

  it("passes --rm for auto-cleanup", async () => {
    mockExecSuccess();
    await runInSandbox("npm test", { repoPath: "/tmp/repo" });
    const args = mockExecFile.mock.calls[0][1] as string[];
    expect(args).toContain("--rm");
  });

  it("mounts repoPath as /workspace volume", async () => {
    mockExecSuccess();
    await runInSandbox("npm test", { repoPath: "/my/project" });
    const args = mockExecFile.mock.calls[0][1] as string[];
    expect(args).toContain("/my/project:/workspace");
  });

  it("sets /workspace as the working directory", async () => {
    mockExecSuccess();
    await runInSandbox("npm test", { repoPath: "/tmp/repo" });
    const args = mockExecFile.mock.calls[0][1] as string[];
    const wdIdx = args.indexOf("--workdir");
    expect(wdIdx).toBeGreaterThan(-1);
    expect(args[wdIdx + 1]).toBe("/workspace");
  });

  it("wraps the command in sh -c", async () => {
    mockExecSuccess();
    await runInSandbox("npm run build", { repoPath: "/tmp/repo" });
    const args = mockExecFile.mock.calls[0][1] as string[];
    const shIdx = args.indexOf("sh");
    expect(shIdx).toBeGreaterThan(-1);
    expect(args[shIdx + 1]).toBe("-c");
    expect(args[shIdx + 2]).toBe("npm run build");
  });
});
