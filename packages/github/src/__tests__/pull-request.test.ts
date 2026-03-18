import { describe, it, expect, vi, beforeEach } from "vitest";
import { handlePullRequest } from "../webhooks/pull-request.js";

// Mock services
vi.mock("../services/check-run.js", () => ({
  createPendingCheckRun: vi.fn().mockResolvedValue(42),
}));

vi.mock("../services/queue.js", () => ({
  enqueueVerification: vi.fn().mockResolvedValue("job-123"),
}));

import { createPendingCheckRun } from "../services/check-run.js";
import { enqueueVerification } from "../services/queue.js";

const mockChecksUpdate = vi.fn().mockResolvedValue({});

function makeContext(overrides: {
  title?: string;
  body?: string | null;
  action?: string;
  installationId?: number | null;
} = {}) {
  const {
    title = "feat: add login feature",
    body = "## Test Plan\n- [ ] Verify login\n- [x] Build passes",
    action = "opened",
    installationId = 12345,
  } = overrides;

  return {
    payload: {
      action,
      pull_request: {
        number: 7,
        title,
        body,
        head: {
          sha: "abc123",
          repo: { full_name: "owner/my-repo" },
        },
        author_association: "OWNER",
      },
      repository: {
        name: "my-repo",
        full_name: "owner/my-repo",
        owner: { login: "owner" },
        default_branch: "main",
      },
      installation: installationId ? { id: installationId } : null,
    },
    octokit: {
      rest: {
        checks: { update: mockChecksUpdate },
        repos: { getContent: vi.fn().mockRejectedValue(new Error("404")) },
      },
    } as unknown,
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as unknown as Parameters<typeof handlePullRequest>[0];
}

describe("handlePullRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates check run and enqueues job when test plan exists", async () => {
    const context = makeContext();
    await handlePullRequest(context);

    expect(createPendingCheckRun).toHaveBeenCalledWith(context.octokit, {
      owner: "owner",
      repo: "my-repo",
      headSha: "abc123",
      pullNumber: 7,
    });

    expect(enqueueVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        installationId: "12345",
        owner: "owner",
        repo: "my-repo",
        pullNumber: 7,
        headSha: "abc123",
        checkRunId: 42,
        prTitle: "feat: add login feature",
        prBody: "## Test Plan\n- [ ] Verify login\n- [x] Build passes",
      }),
    );
  });

  it("processes PR without test plan (v2 mode)", async () => {
    const context = makeContext({ body: "Just a regular PR description." });
    await handlePullRequest(context);

    expect(createPendingCheckRun).toHaveBeenCalled();
    expect(enqueueVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        prTitle: "feat: add login feature",
        prBody: "Just a regular PR description.",
      }),
    );
  });

  it("processes PR with null body (v2 mode)", async () => {
    const context = makeContext({ body: null });
    await handlePullRequest(context);

    expect(createPendingCheckRun).toHaveBeenCalled();
    expect(enqueueVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        prTitle: "feat: add login feature",
        prBody: "",
      }),
    );
  });

  it("includes prTitle in enqueued job", async () => {
    const context = makeContext({ title: "fix: resolve timeout in auth middleware" });
    await handlePullRequest(context);

    expect(enqueueVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        prTitle: "fix: resolve timeout in auth middleware",
      }),
    );
  });

  it("skips when no installation on event", async () => {
    const context = makeContext({ installationId: null });
    await handlePullRequest(context);

    expect(createPendingCheckRun).not.toHaveBeenCalled();
    expect(context.log.warn).toHaveBeenCalled();
  });

  it("works for synchronize events", async () => {
    const context = makeContext({ action: "synchronize" });
    await handlePullRequest(context);

    expect(createPendingCheckRun).toHaveBeenCalled();
    expect(enqueueVerification).toHaveBeenCalled();
  });

  it("works for edited events", async () => {
    const context = makeContext({ action: "edited" });
    await handlePullRequest(context);

    expect(createPendingCheckRun).toHaveBeenCalled();
    expect(enqueueVerification).toHaveBeenCalled();
  });

  it("cancels check run when enqueue fails after check run creation", async () => {
    vi.mocked(enqueueVerification).mockRejectedValueOnce(new Error("Redis unavailable"));
    const context = makeContext();

    await handlePullRequest(context);

    expect(context.log.error).toHaveBeenCalled();
    expect(mockChecksUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: "owner",
        repo: "my-repo",
        check_run_id: 42,
        status: "completed",
        conclusion: "cancelled",
      }),
    );
  });

  it("logs error but does not throw when check run creation fails", async () => {
    vi.mocked(createPendingCheckRun).mockRejectedValueOnce(new Error("GitHub API down"));
    const context = makeContext();

    await handlePullRequest(context);

    expect(context.log.error).toHaveBeenCalled();
    expect(enqueueVerification).not.toHaveBeenCalled();
    expect(mockChecksUpdate).not.toHaveBeenCalled();
  });

  it("logs cleanup error if cancelling orphaned check run also fails", async () => {
    vi.mocked(enqueueVerification).mockRejectedValueOnce(new Error("Redis unavailable"));
    mockChecksUpdate.mockRejectedValueOnce(new Error("GitHub API down"));
    const context = makeContext();

    await handlePullRequest(context);

    expect(context.log.error).toHaveBeenCalledTimes(2);
  });
});
