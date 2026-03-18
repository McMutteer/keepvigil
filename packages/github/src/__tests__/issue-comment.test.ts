import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleIssueComment } from "../webhooks/issue-comment.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: {
  body?: string;
  isPr?: boolean;
  authorAssociation?: string;
  prBody?: string;
  headSha?: string;
} = {}) {
  const {
    body = "/vigil retry",
    isPr = true,
    authorAssociation = "OWNER",
    prBody = "- [ ] run tests\n- [ ] check lint",
    headSha = "abc123",
  } = overrides;

  const getContent = vi.fn().mockRejectedValue(Object.assign(new Error("Not Found"), { status: 404 }));
  const getPull = vi.fn().mockResolvedValue({
    data: {
      title: "fix: some fix",
      body: prBody,
      head: { sha: headSha, repo: { full_name: "owner/repo" } },
    },
  });
  const createComment = vi.fn().mockResolvedValue({});

  const octokit = {
    rest: {
      pulls: { get: getPull },
      repos: { getContent },
      checks: { update: vi.fn().mockResolvedValue({}) },
      issues: { createComment },
    },
  };

  const context = {
    payload: {
      comment: {
        body,
        author_association: authorAssociation,
      },
      issue: {
        number: 7,
        pull_request: isPr ? { url: "https://..." } : undefined,
      },
      repository: {
        owner: { login: "owner" },
        name: "repo",
        full_name: "owner/repo",
        default_branch: "main",
      },
      installation: { id: 123 },
      sender: { login: "dev" },
    },
    octokit,
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };

  return { context, octokit, createComment };
}

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../services/queue.js", () => ({
  enqueueVerification: vi.fn().mockResolvedValue("job-id-1"),
}));

vi.mock("../services/check-run.js", () => ({
  createPendingCheckRun: vi.fn().mockResolvedValue(42),
}));

const mockChat = vi.fn().mockResolvedValue("This is an explanation of the finding.");
vi.mock("@vigil/core", () => ({
  createLLMClient: () => ({ model: "test", provider: "groq", chat: mockChat }),
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { enqueueVerification } from "../services/queue.js";
import { createPendingCheckRun } from "../services/check-run.js";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset GROQ_API_KEY for explain/verify tests
  process.env.GROQ_API_KEY = "test-key";
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleIssueComment", () => {
  // ---- Command parsing ----

  it("ignores comments on issues (not PRs)", async () => {
    const { context } = makeContext({ isPr: false });
    await handleIssueComment(context as never);
    expect(enqueueVerification).not.toHaveBeenCalled();
  });

  it("ignores comments without vigil prefix", async () => {
    const { context } = makeContext({ body: "LGTM!" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).not.toHaveBeenCalled();
  });

  it("ignores comments from untrusted authors", async () => {
    const { context } = makeContext({ authorAssociation: "NONE" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).not.toHaveBeenCalled();
  });

  it("ignores comments from CONTRIBUTOR association", async () => {
    const { context } = makeContext({ authorAssociation: "CONTRIBUTOR" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).not.toHaveBeenCalled();
  });

  it("accepts @vigil prefix", async () => {
    const { context } = makeContext({ body: "@vigil retry" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).toHaveBeenCalledOnce();
  });

  it("accepts /vigil prefix", async () => {
    const { context } = makeContext({ body: "/vigil retry" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).toHaveBeenCalledOnce();
  });

  it("ignores unknown commands", async () => {
    const { context } = makeContext({ body: "@vigil dance" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).not.toHaveBeenCalled();
  });

  // ---- Retry / Recheck ----

  it("enqueues full re-run for /vigil retry", async () => {
    const { context } = makeContext({ body: "/vigil retry" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).toHaveBeenCalledOnce();
    const job = (enqueueVerification as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(job.retryItemIds).toBeUndefined();
  });

  it("enqueues with retryItemIds for /vigil retry tp-1 tp-3", async () => {
    const { context } = makeContext({ body: "/vigil retry tp-1 tp-3" });
    await handleIssueComment(context as never);
    const job = (enqueueVerification as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(job.retryItemIds).toEqual(["tp-1", "tp-3"]);
  });

  it("@vigil recheck triggers full retry", async () => {
    const { context } = makeContext({ body: "@vigil recheck" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).toHaveBeenCalledOnce();
    const job = (enqueueVerification as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(job.retryItemIds).toBeUndefined();
  });

  it("creates pending check run before enqueuing", async () => {
    const { context } = makeContext();
    await handleIssueComment(context as never);
    expect(createPendingCheckRun).toHaveBeenCalledOnce();
    const job = (enqueueVerification as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(job.checkRunId).toBe(42);
  });

  it("marks check run as failed when enqueue throws", async () => {
    const { context } = makeContext();
    vi.mocked(enqueueVerification).mockRejectedValueOnce(new Error("queue down"));
    await handleIssueComment(context as never);
    expect(context.octokit.rest.checks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed", conclusion: "failure" }),
    );
  });

  it("does not throw when event has no installation", async () => {
    const { context } = makeContext();
    (context.payload as Record<string, unknown>).installation = undefined;
    await expect(handleIssueComment(context as never)).resolves.not.toThrow();
  });

  // ---- Explain ----

  it("replies with LLM explanation for @vigil explain", async () => {
    const { context, createComment } = makeContext({ body: "@vigil explain coverage gap in auth.ts" });
    await handleIssueComment(context as never);
    expect(mockChat).toHaveBeenCalledOnce();
    expect(createComment).toHaveBeenCalledOnce();
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("explanation"),
      }),
    );
  });

  it("replies with usage hint when @vigil explain has no args", async () => {
    const { context, createComment } = makeContext({ body: "@vigil explain" });
    await handleIssueComment(context as never);
    expect(mockChat).not.toHaveBeenCalled();
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("Usage"),
      }),
    );
  });

  // ---- Verify ----

  it("replies with verification for @vigil verify", async () => {
    const { context, createComment } = makeContext({ body: "@vigil verify the auth middleware handles expired tokens" });
    await handleIssueComment(context as never);
    expect(mockChat).toHaveBeenCalledOnce();
    expect(createComment).toHaveBeenCalledOnce();
  });

  it("replies with usage hint when @vigil verify has no args", async () => {
    const { context, createComment } = makeContext({ body: "@vigil verify" });
    await handleIssueComment(context as never);
    expect(mockChat).not.toHaveBeenCalled();
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("Usage"),
      }),
    );
  });

  // ---- Ignore ----

  it("acknowledges @vigil ignore command", async () => {
    const { context, createComment } = makeContext({ body: "@vigil ignore ioredis dependency warning" });
    await handleIssueComment(context as never);
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("can't save rules right now"),
      }),
    );
  });

  it("replies with usage hint when @vigil ignore has no args", async () => {
    const { context, createComment } = makeContext({ body: "@vigil ignore" });
    await handleIssueComment(context as never);
    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("Usage"),
      }),
    );
  });
});
