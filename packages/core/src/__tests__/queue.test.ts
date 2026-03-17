import { describe, it, expect, expectTypeOf } from "vitest";
import { QUEUE_NAMES, type VerifyTestPlanJob } from "../queue.js";
import type { VigilConfig } from "../types.js";

describe("QUEUE_NAMES", () => {
  it("exports VERIFY_TEST_PLAN constant", () => {
    expect(QUEUE_NAMES.VERIFY_TEST_PLAN).toBe("verify-test-plan");
  });

  it("is readonly (frozen-like shape)", () => {
    // The `as const` assertion makes the type literal; verify the value is stable
    const name: "verify-test-plan" = QUEUE_NAMES.VERIFY_TEST_PLAN;
    expect(name).toBe("verify-test-plan");
  });
});

describe("VerifyTestPlanJob type", () => {
  it("accepts a minimal valid job payload", () => {
    const job: VerifyTestPlanJob = {
      installationId: "12345",
      owner: "McMutteer",
      repo: "keepvigil",
      pullNumber: 42,
      headSha: "abc123def456",
      checkRunId: 789,
      prBody: "## Test Plan\n- [ ] Run tests",
    };

    expect(job.installationId).toBe("12345");
    expect(job.owner).toBe("McMutteer");
    expect(job.repo).toBe("keepvigil");
    expect(job.pullNumber).toBe(42);
    expect(job.headSha).toBe("abc123def456");
    expect(job.checkRunId).toBe(789);
    expect(job.prBody).toContain("Test Plan");
  });

  it("accepts optional vigiConfig field", () => {
    const job: VerifyTestPlanJob = {
      installationId: "1",
      owner: "org",
      repo: "app",
      pullNumber: 1,
      headSha: "aaa",
      checkRunId: 1,
      prBody: "body",
      vigiConfig: {} as VigilConfig,
    };

    expect(job.vigiConfig).toBeDefined();
  });

  it("accepts optional configWarnings field", () => {
    const job: VerifyTestPlanJob = {
      installationId: "1",
      owner: "org",
      repo: "app",
      pullNumber: 1,
      headSha: "aaa",
      checkRunId: 1,
      prBody: "body",
      configWarnings: ["Unknown key 'foo' — ignored"],
    };

    expect(job.configWarnings).toHaveLength(1);
    expect(job.configWarnings![0]).toContain("ignored");
  });

  it("accepts optional retryItemIds field", () => {
    const job: VerifyTestPlanJob = {
      installationId: "1",
      owner: "org",
      repo: "app",
      pullNumber: 1,
      headSha: "aaa",
      checkRunId: 1,
      prBody: "body",
      retryItemIds: ["tp-1", "tp-3"],
    };

    expect(job.retryItemIds).toEqual(["tp-1", "tp-3"]);
  });

  it("optional fields default to undefined when omitted", () => {
    const job: VerifyTestPlanJob = {
      installationId: "1",
      owner: "org",
      repo: "app",
      pullNumber: 1,
      headSha: "aaa",
      checkRunId: 1,
      prBody: "body",
    };

    expect(job.vigiConfig).toBeUndefined();
    expect(job.configWarnings).toBeUndefined();
    expect(job.retryItemIds).toBeUndefined();
  });

  it("installationId is a string (not number)", () => {
    const job: VerifyTestPlanJob = {
      installationId: "99999",
      owner: "org",
      repo: "app",
      pullNumber: 1,
      headSha: "sha",
      checkRunId: 1,
      prBody: "",
    };

    expectTypeOf(job.installationId).toBeString();
    expect(typeof job.installationId).toBe("string");
  });

  it("retryItemIds can be an empty array (re-run nothing)", () => {
    const job: VerifyTestPlanJob = {
      installationId: "1",
      owner: "org",
      repo: "app",
      pullNumber: 1,
      headSha: "sha",
      checkRunId: 1,
      prBody: "",
      retryItemIds: [],
    };

    expect(job.retryItemIds).toEqual([]);
  });
});
