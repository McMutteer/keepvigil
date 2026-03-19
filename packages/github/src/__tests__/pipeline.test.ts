import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockReportResults = vi.hoisted(() => vi.fn());

vi.mock("@vigil/core", () => ({
  createLLMClient: () => ({ model: "test-model", provider: "groq", chat: vi.fn() }),
  createLLMClientWithFallback: () => ({ model: "gpt-5.4-nano", provider: "openai", chat: vi.fn() }),
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn(), debug: vi.fn() }),
  runWithCorrelationId: (_id: string, fn: () => unknown) => fn(),
  scanCredentials: vi.fn().mockReturnValue({ id: "credential-scan", name: "Credential Scan", score: 100, weight: 20, passed: true, details: [], requiresLLM: false }),
  extractChangedFilesWithStatus: vi.fn().mockReturnValue([]),
  mapCoverage: vi.fn().mockReturnValue({ id: "coverage-mapper", name: "Coverage Mapper", score: 100, weight: 10, passed: true, details: [], requiresLLM: false }),
  getWeights: vi.fn().mockReturnValue({
    "ci-bridge": 0, "credential-scan": 20, "executor": 0, "plan-augmentor": 0,
    "contract-checker": 10, "diff-analyzer": 5, "coverage-mapper": 10, "gap-analyzer": 0,
    "claims-verifier": 30, "undocumented-changes": 25,
  }),
}));

vi.mock("../services/reporter.js", () => ({
  reportResults: mockReportResults,
}));

vi.mock("../services/subscription.js", () => ({
  checkPlan: vi.fn().mockResolvedValue("free"),
  isPro: vi.fn().mockReturnValue(false),
}));

vi.mock("../services/rate-limiter.js", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
}));

const mockFetchDiff = vi.hoisted(() => vi.fn());
const mockFetchRepoFiles = vi.hoisted(() => vi.fn());
vi.mock("../services/diff-fetcher.js", () => ({
  fetchPRDiff: mockFetchDiff,
  fetchRepoFileList: mockFetchRepoFiles,
}));

vi.mock("../services/claims-verifier.js", () => ({
  verifyClaims: vi.fn().mockResolvedValue({ id: "claims-verifier", name: "Claims Verifier", score: 90, weight: 30, passed: true, details: [], requiresLLM: true }),
}));

vi.mock("../services/undocumented-changes.js", () => ({
  detectUndocumentedChanges: vi.fn().mockResolvedValue({ id: "undocumented-changes", name: "Undocumented Changes", score: 100, weight: 25, passed: true, details: [], requiresLLM: true }),
}));

vi.mock("../services/diff-analyzer.js", () => ({
  analyzeDiff: vi.fn().mockResolvedValue({ id: "diff-analyzer", name: "Diff Analyzer", score: 80, weight: 5, passed: true, details: [], requiresLLM: true }),
}));

vi.mock("../services/contract-checker.js", () => ({
  checkContracts: vi.fn().mockResolvedValue({ signal: { id: "contract-checker", name: "Contract Checker", score: 100, weight: 10, passed: true, details: [], requiresLLM: true }, verifiedFiles: new Set() }),
}));

vi.mock("../services/repo-memory.js", () => ({
  loadRepoRules: vi.fn().mockResolvedValue([]),
  applyIgnoreRules: vi.fn().mockReturnValue(0),
}));

import type { VerifyTestPlanJob } from "@vigil/core";
import { runPipeline, setPipelineDb } from "../services/pipeline.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJob(overrides: Partial<VerifyTestPlanJob> = {}): VerifyTestPlanJob {
  return {
    installationId: "12345",
    owner: "org",
    repo: "repo",
    pullNumber: 1,
    headSha: "abc123",
    checkRunId: 42,
    prTitle: "feat: add feature",
    prBody: "This PR adds a feature.",
    ...overrides,
  };
}

function makeProbot() {
  return {
    auth: vi.fn().mockResolvedValue({
      rest: { pulls: { get: vi.fn() } },
    }),
  } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runPipeline (v2-only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchDiff.mockResolvedValue("diff --git a/file.ts\n+++ b/file.ts\n@@ -1 +1 @@\n+hello");
    mockFetchRepoFiles.mockResolvedValue(["file.ts"]);
    setPipelineDb(null as any);
  });

  it("runs v2 signals and reports results", async () => {
    const probot = makeProbot();

    await runPipeline(makeJob(), probot, { groqApiKey: "groq-key" });

    expect(mockReportResults).toHaveBeenCalledOnce();
    const ctx = mockReportResults.mock.calls[0][0];
    expect(ctx.pipelineMode).toBe("v2-only");
    expect(ctx.signals).toBeDefined();
    expect(ctx.signals.length).toBeGreaterThanOrEqual(4); // claims, undocumented, cred, coverage
  });

  it("reports pipeline error when diff is null", async () => {
    mockFetchDiff.mockResolvedValue(null);
    const probot = makeProbot();

    await runPipeline(makeJob(), probot, { groqApiKey: "groq-key" });

    expect(mockReportResults).toHaveBeenCalledOnce();
    const ctx = mockReportResults.mock.calls[0][0];
    expect(ctx.pipelineError).toBe("Could not fetch PR diff");
  });

  it("always passes empty classifiedItems and executionResults", async () => {
    const probot = makeProbot();

    await runPipeline(makeJob(), probot, { groqApiKey: "groq-key" });

    const ctx = mockReportResults.mock.calls[0][0];
    expect(ctx.classifiedItems).toEqual([]);
    expect(ctx.executionResults).toEqual([]);
  });

  it("reports even on pipeline error", async () => {
    mockFetchDiff.mockRejectedValue(new Error("network failure"));
    const probot = makeProbot();

    await runPipeline(makeJob(), probot, { groqApiKey: "groq-key" });

    expect(mockReportResults).toHaveBeenCalledOnce();
    const ctx = mockReportResults.mock.calls[0][0];
    expect(ctx.pipelineError).toContain("Pipeline error");
  });
});
