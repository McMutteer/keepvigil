import { describe, it, expect, vi } from "vitest";
import type { ProbotOctokit } from "probot";
import type { ConfidenceScore } from "@vigil/core";
import { maybeAutoApprove, type AutoApproveContext } from "../services/auto-approve.js";

function makeOctokit() {
  return {
    rest: {
      pulls: {
        createReview: vi.fn().mockResolvedValue({}),
      },
    },
  } as unknown as ProbotOctokit;
}

function makeScore(score: number): ConfidenceScore {
  return {
    score,
    recommendation: score >= 80 ? "safe" : "review",
    signals: [
      { id: "claims-verifier", name: "Claims Verifier", score: 90, weight: 30, passed: true, details: [], requiresLLM: true },
    ],
    skippedSignals: [],
  };
}

function makeCtx(overrides: Partial<AutoApproveContext> = {}): AutoApproveContext {
  return {
    octokit: makeOctokit(),
    owner: "org",
    repo: "repo",
    pullNumber: 1,
    headSha: "abc123",
    confidenceScore: makeScore(92),
    proEnabled: true,
    vigiConfig: { autoApprove: { threshold: 90 } },
    ...overrides,
  };
}

describe("maybeAutoApprove", () => {
  it("approves when score meets threshold", async () => {
    const ctx = makeCtx();
    const result = await maybeAutoApprove(ctx);

    expect(result).toBe(true);
    const octokit = ctx.octokit as any;
    expect(octokit.rest.pulls.createReview).toHaveBeenCalledOnce();
    const call = octokit.rest.pulls.createReview.mock.calls[0][0];
    expect(call.event).toBe("APPROVE");
    expect(call.pull_number).toBe(1);
    expect(call.body).toContain("92/100");
    expect(call.body).toContain("threshold: 90");
  });

  it("skips when score is below threshold", async () => {
    const ctx = makeCtx({ confidenceScore: makeScore(85) });
    const result = await maybeAutoApprove(ctx);

    expect(result).toBe(false);
    const octokit = ctx.octokit as any;
    expect(octokit.rest.pulls.createReview).not.toHaveBeenCalled();
  });

  it("skips when auto_approve is not configured", async () => {
    const ctx = makeCtx({ vigiConfig: {} });
    const result = await maybeAutoApprove(ctx);

    expect(result).toBe(false);
  });

  it("skips when vigiConfig is undefined", async () => {
    const ctx = makeCtx({ vigiConfig: undefined });
    const result = await maybeAutoApprove(ctx);

    expect(result).toBe(false);
  });

  it("skips when not on Pro tier", async () => {
    const ctx = makeCtx({ proEnabled: false });
    const result = await maybeAutoApprove(ctx);

    expect(result).toBe(false);
    const octokit = ctx.octokit as any;
    expect(octokit.rest.pulls.createReview).not.toHaveBeenCalled();
  });

  it("approves at exact threshold", async () => {
    const ctx = makeCtx({ confidenceScore: makeScore(90) });
    const result = await maybeAutoApprove(ctx);

    expect(result).toBe(true);
  });

  it("does not approve at threshold - 1", async () => {
    const ctx = makeCtx({ confidenceScore: makeScore(89) });
    const result = await maybeAutoApprove(ctx);

    expect(result).toBe(false);
  });
});
