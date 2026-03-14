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
      body: prBody,
      head: { sha: headSha, repo: { full_name: "owner/repo" } },
    },
  });

  const octokit = {
    rest: {
      pulls: { get: getPull },
      repos: { getContent },
      checks: { update: vi.fn().mockResolvedValue({}) },
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

  return { context, octokit };
}

// ---------------------------------------------------------------------------
// We test through the handler but mock the service layer via module mocks.
// ---------------------------------------------------------------------------

vi.mock("../services/queue.js", () => ({
  enqueueVerification: vi.fn().mockResolvedValue("job-id-1"),
}));

vi.mock("../services/check-run.js", () => ({
  createPendingCheckRun: vi.fn().mockResolvedValue(42),
}));

import { enqueueVerification } from "../services/queue.js";
import { createPendingCheckRun } from "../services/check-run.js";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleIssueComment", () => {
  it("ignores comments on issues (not PRs)", async () => {
    const { context } = makeContext({ isPr: false });
    await handleIssueComment(context as never);
    expect(enqueueVerification).not.toHaveBeenCalled();
  });

  it("ignores comments that don't start with /vigil retry", async () => {
    const { context } = makeContext({ body: "LGTM!" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).not.toHaveBeenCalled();
  });

  it("ignores near-prefix commands like /vigil retrying", async () => {
    const { context } = makeContext({ body: "/vigil retrying" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).not.toHaveBeenCalled();
  });

  it("ignores near-prefix commands like /vigil retry-foo", async () => {
    const { context } = makeContext({ body: "/vigil retry-foo" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).not.toHaveBeenCalled();
  });

  it("ignores comments from untrusted authors (NONE association)", async () => {
    const { context } = makeContext({ authorAssociation: "NONE" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).not.toHaveBeenCalled();
  });

  it("ignores comments from CONTRIBUTOR association", async () => {
    const { context } = makeContext({ authorAssociation: "CONTRIBUTOR" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).not.toHaveBeenCalled();
  });

  it("enqueues a full re-run for /vigil retry (no item IDs)", async () => {
    const { context } = makeContext({ body: "/vigil retry", authorAssociation: "OWNER" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).toHaveBeenCalledOnce();
    const job = (enqueueVerification as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(job.retryItemIds).toBeUndefined();
    expect(job.pullNumber).toBe(7);
  });

  it("enqueues with retryItemIds for /vigil retry tp-1 tp-3", async () => {
    const { context } = makeContext({ body: "/vigil retry tp-1 tp-3", authorAssociation: "MEMBER" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).toHaveBeenCalledOnce();
    const job = (enqueueVerification as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(job.retryItemIds).toEqual(["tp-1", "tp-3"]);
  });

  it("filters out invalid item IDs (only tp-N format accepted)", async () => {
    const { context } = makeContext({ body: "/vigil retry tp-1 badid tp-5", authorAssociation: "COLLABORATOR" });
    await handleIssueComment(context as never);
    const job = (enqueueVerification as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(job.retryItemIds).toEqual(["tp-1", "tp-5"]);
  });

  it("falls back to full re-run when all supplied IDs are invalid", async () => {
    const { context } = makeContext({ body: "/vigil retry badid1 badid2", authorAssociation: "OWNER" });
    await handleIssueComment(context as never);
    const job = (enqueueVerification as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(job.retryItemIds).toBeUndefined();
  });

  it("accepts MEMBER association", async () => {
    const { context } = makeContext({ authorAssociation: "MEMBER" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).toHaveBeenCalledOnce();
  });

  it("accepts COLLABORATOR association", async () => {
    const { context } = makeContext({ authorAssociation: "COLLABORATOR" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).toHaveBeenCalledOnce();
  });

  it("skips retry when PR has no test plan", async () => {
    const { context } = makeContext({ prBody: "Just a regular PR description" });
    await handleIssueComment(context as never);
    expect(enqueueVerification).not.toHaveBeenCalled();
  });

  it("creates a new pending check run before enqueuing", async () => {
    const { context } = makeContext();
    await handleIssueComment(context as never);
    expect(createPendingCheckRun).toHaveBeenCalledOnce();
    expect(enqueueVerification).toHaveBeenCalledOnce();
    // checkRunId from createPendingCheckRun (42) must be in the job
    const job = (enqueueVerification as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(job.checkRunId).toBe(42);
  });

  it("does not throw when event has no installation", async () => {
    const { context } = makeContext();
    (context.payload as Record<string, unknown>).installation = undefined;
    await expect(handleIssueComment(context as never)).resolves.not.toThrow();
    expect(enqueueVerification).not.toHaveBeenCalled();
  });

  it("marks check run as failed when enqueue throws", async () => {
    const { context } = makeContext();
    vi.mocked(enqueueVerification).mockRejectedValueOnce(new Error("queue down"));

    await expect(handleIssueComment(context as never)).resolves.not.toThrow();

    expect(context.octokit.rest.checks.update).toHaveBeenCalledOnce();
    expect(context.octokit.rest.checks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed", conclusion: "failure" }),
    );
  });
});
