import { describe, it, expect, vi } from "vitest";
import { postReviewComments } from "../services/review-commenter.js";
import type { Signal } from "@vigil/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAMPLE_DIFF = `diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,6 +10,8 @@ export function authenticate() {
   const token = getToken();
   if (!token) return null;
+  // Rate limit check
+  if (isRateLimited(token)) return null;
   return validateToken(token);
 }
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -10,6 +10,7 @@
   "dependencies": {
+    "ioredis": "^5.0.0"
   }`;

function makeSignal(overrides: Partial<Signal> & Pick<Signal, "id" | "details">): Signal {
  return {
    name: overrides.name ?? overrides.id,
    score: 100,
    weight: 10,
    passed: true,
    requiresLLM: false,
    ...overrides,
  };
}

function makeOctokit(createReviewMock = vi.fn().mockResolvedValue({})) {
  return {
    rest: {
      pulls: { createReview: createReviewMock },
    },
  } as unknown as Parameters<typeof postReviewComments>[0]["octokit"];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("postReviewComments", () => {
  it("posts review comments for findings with file/line info", async () => {
    const createReview = vi.fn().mockResolvedValue({});
    const octokit = makeOctokit(createReview);

    const signals: Signal[] = [
      makeSignal({
        id: "credential-scan",
        name: "Credential Scan",
        details: [{
          label: "AWS Key in src/auth.ts:12",
          status: "fail",
          message: "Possible AWS Access Key detected",
          file: "src/auth.ts",
          line: 12,
        }],
      }),
    ];

    const count = await postReviewComments({
      octokit,
      owner: "acme",
      repo: "webapp",
      pullNumber: 42,
      headSha: "abc123",
      diff: SAMPLE_DIFF,
      signals,
    });

    expect(count).toBe(1);
    expect(createReview).toHaveBeenCalledOnce();
    expect(createReview).toHaveBeenCalledWith(expect.objectContaining({
      owner: "acme",
      repo: "webapp",
      pull_number: 42,
      commit_id: "abc123",
      event: "COMMENT",
      comments: expect.arrayContaining([
        expect.objectContaining({
          path: "src/auth.ts",
          body: expect.stringContaining("Credential Scan"),
        }),
      ]),
    }));
  });

  it("skips findings without file info", async () => {
    const createReview = vi.fn().mockResolvedValue({});
    const octokit = makeOctokit(createReview);

    const signals: Signal[] = [
      makeSignal({
        id: "claims-verifier",
        details: [{
          label: "Add auth",
          status: "warn",
          message: "Claim unverified",
          // no file or line
        }],
      }),
    ];

    const count = await postReviewComments({
      octokit, owner: "acme", repo: "webapp", pullNumber: 42,
      headSha: "abc123", diff: SAMPLE_DIFF, signals,
    });

    expect(count).toBe(0);
    expect(createReview).not.toHaveBeenCalled();
  });

  it("skips passing findings (only warn/fail get inline comments)", async () => {
    const createReview = vi.fn().mockResolvedValue({});
    const octokit = makeOctokit(createReview);

    const signals: Signal[] = [
      makeSignal({
        id: "coverage-mapper",
        details: [{
          label: "src/auth.ts",
          status: "pass",
          message: "Test file found",
          file: "src/auth.ts",
          line: 1,
        }],
      }),
    ];

    const count = await postReviewComments({
      octokit, owner: "acme", repo: "webapp", pullNumber: 42,
      headSha: "abc123", diff: SAMPLE_DIFF, signals,
    });

    expect(count).toBe(0);
  });

  it("deduplicates comments at the same file+position", async () => {
    const createReview = vi.fn().mockResolvedValue({});
    const octokit = makeOctokit(createReview);

    const signals: Signal[] = [
      makeSignal({
        id: "credential-scan",
        name: "Credential Scan",
        details: [{
          label: "Finding 1",
          status: "fail",
          message: "Secret A",
          file: "src/auth.ts",
          line: 12,
        }],
      }),
      makeSignal({
        id: "coverage-mapper",
        name: "Coverage Mapper",
        details: [{
          label: "Finding 2",
          status: "fail",
          message: "No test file",
          file: "src/auth.ts",
          line: 12,
        }],
      }),
    ];

    const count = await postReviewComments({
      octokit, owner: "acme", repo: "webapp", pullNumber: 42,
      headSha: "abc123", diff: SAMPLE_DIFF, signals,
    });

    expect(count).toBe(1); // deduplicated to one comment
    const call = createReview.mock.calls[0][0];
    expect(call.comments).toHaveLength(1);
    expect(call.comments[0].body).toContain("Credential Scan");
    expect(call.comments[0].body).toContain("Coverage Mapper");
  });

  it("returns 0 when diff is empty", async () => {
    const createReview = vi.fn();
    const octokit = makeOctokit(createReview);

    const count = await postReviewComments({
      octokit, owner: "acme", repo: "webapp", pullNumber: 42,
      headSha: "abc123", diff: "", signals: [],
    });

    expect(count).toBe(0);
    expect(createReview).not.toHaveBeenCalled();
  });

  it("handles API failure gracefully", async () => {
    const createReview = vi.fn().mockRejectedValue(new Error("GitHub API down"));
    const octokit = makeOctokit(createReview);

    const signals: Signal[] = [
      makeSignal({
        id: "credential-scan",
        details: [{
          label: "Secret",
          status: "fail",
          message: "Found secret",
          file: "src/auth.ts",
          line: 12,
        }],
      }),
    ];

    const count = await postReviewComments({
      octokit, owner: "acme", repo: "webapp", pullNumber: 42,
      headSha: "abc123", diff: SAMPLE_DIFF, signals,
    });

    expect(count).toBe(0); // graceful degradation
  });

  it("skips lines not in the diff", async () => {
    const createReview = vi.fn().mockResolvedValue({});
    const octokit = makeOctokit(createReview);

    const signals: Signal[] = [
      makeSignal({
        id: "coverage-mapper",
        details: [{
          label: "src/unknown.ts",
          status: "fail",
          message: "No test file",
          file: "src/unknown.ts",
          line: 50,
        }],
      }),
    ];

    const count = await postReviewComments({
      octokit, owner: "acme", repo: "webapp", pullNumber: 42,
      headSha: "abc123", diff: SAMPLE_DIFF, signals,
    });

    expect(count).toBe(0);
  });
});
