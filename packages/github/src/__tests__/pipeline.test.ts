import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockParseTestPlan = vi.hoisted(() => vi.fn());
const mockClassifyItems = vi.hoisted(() => vi.fn());
const mockReportResults = vi.hoisted(() => vi.fn());
const mockCloneRepo = vi.hoisted(() => vi.fn());
const mockCleanupRepo = vi.hoisted(() => vi.fn());
const mockDetectPreviewUrl = vi.hoisted(() => vi.fn());
const mockRouteToExecutors = vi.hoisted(() => vi.fn());

vi.mock("@vigil/core", () => ({
  parseTestPlan: mockParseTestPlan,
  classifyItems: mockClassifyItems,
}));

vi.mock("../services/reporter.js", () => ({
  reportResults: mockReportResults,
}));

vi.mock("../services/repo-clone.js", () => ({
  cloneRepo: mockCloneRepo,
  cleanupRepo: mockCleanupRepo,
}));

vi.mock("../services/preview-url.js", () => ({
  detectPreviewUrl: mockDetectPreviewUrl,
}));

vi.mock("../services/executor-router.js", () => ({
  routeToExecutors: mockRouteToExecutors,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { runPipeline } from "../services/pipeline.js";
import type { VerifyTestPlanJob, ClassifiedItem, ExecutionResult } from "@vigil/core";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const API_KEY = "test-anthropic-key";

function makeJob(overrides: Partial<VerifyTestPlanJob> = {}): VerifyTestPlanJob {
  return {
    installationId: "123",
    owner: "acme",
    repo: "webapp",
    pullNumber: 42,
    headSha: "abc123",
    checkRunId: 1001,
    prBody: "## Test Plan\n- [ ] echo hello\n- [ ] GET / returns 200",
    ...overrides,
  };
}

function makeShellItem(id = "tp-0"): ClassifiedItem {
  return {
    item: {
      id,
      text: "echo hello",
      checked: false,
      raw: "- [ ] echo hello",
      indent: 0,
      hints: { isManual: false, codeBlocks: ["echo hello"], urls: [] },
    },
    confidence: "DETERMINISTIC",
    executorType: "shell",
    category: "build",
    reasoning: "has code block",
  };
}

function makeApiItem(id = "tp-1"): ClassifiedItem {
  return {
    item: {
      id,
      text: "GET / returns 200",
      checked: false,
      raw: "- [ ] GET / returns 200",
      indent: 0,
      hints: { isManual: false, codeBlocks: [], urls: [] },
    },
    confidence: "HIGH",
    executorType: "api",
    category: "api",
    reasoning: "HTTP pattern",
  };
}

function makeBrowserItem(id = "tp-2"): ClassifiedItem {
  return {
    item: {
      id,
      text: "Click login button",
      checked: false,
      raw: "- [ ] Click login button",
      indent: 0,
      hints: { isManual: false, codeBlocks: [], urls: [] },
    },
    confidence: "HIGH",
    executorType: "browser",
    category: "ui-flow",
    reasoning: "UI interaction",
  };
}

function makePassResult(itemId: string): ExecutionResult {
  return { itemId, passed: true, duration: 100, evidence: {} };
}

function makeMockOctokit() {
  return {
    auth: vi.fn().mockResolvedValue({ token: "ghs_test_token" }),
  };
}

function makeProbot(octokit = makeMockOctokit()) {
  return {
    auth: vi.fn().mockResolvedValue(octokit),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParseTestPlan.mockReturnValue({ items: [], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([]);
    mockReportResults.mockResolvedValue(undefined);
    mockCloneRepo.mockResolvedValue("/tmp/vigil-acme-webapp");
    mockCleanupRepo.mockResolvedValue(undefined);
    mockDetectPreviewUrl.mockResolvedValue(null);
    mockRouteToExecutors.mockResolvedValue([]);
  });

  // ---- Empty test plan ----

  it("reports with empty results when no items are found", async () => {
    mockParseTestPlan.mockReturnValue({ items: [], sectionTitle: "Test Plan", raw: "" });
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockReportResults).toHaveBeenCalledOnce();
    expect(mockReportResults).toHaveBeenCalledWith(
      expect.objectContaining({ classifiedItems: [], executionResults: [] }),
    );
  });

  it("does not classify or execute when there are no items", async () => {
    mockParseTestPlan.mockReturnValue({ items: [], sectionTitle: "Test Plan", raw: "" });
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockClassifyItems).not.toHaveBeenCalled();
    expect(mockCloneRepo).not.toHaveBeenCalled();
    expect(mockRouteToExecutors).not.toHaveBeenCalled();
  });

  // ---- Happy path: shell-only ----

  it("clones repo when there are shell items", async () => {
    const shellItem = makeShellItem();
    mockParseTestPlan.mockReturnValue({ items: [shellItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([shellItem]);
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-0")]);
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockCloneRepo).toHaveBeenCalledOnce();
    expect(mockCloneRepo).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "acme", repo: "webapp", sha: "abc123" }),
    );
  });

  it("passes repoPath to executor-router for shell items", async () => {
    const shellItem = makeShellItem();
    mockParseTestPlan.mockReturnValue({ items: [shellItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([shellItem]);
    mockCloneRepo.mockResolvedValue("/tmp/vigil-acme-webapp");
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-0")]);
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockRouteToExecutors).toHaveBeenCalledWith(
      expect.objectContaining({ repoPath: "/tmp/vigil-acme-webapp" }),
    );
  });

  it("cleans up cloned repo after execution", async () => {
    const shellItem = makeShellItem();
    mockParseTestPlan.mockReturnValue({ items: [shellItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([shellItem]);
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-0")]);
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockCleanupRepo).toHaveBeenCalledWith("/tmp/vigil-acme-webapp");
  });

  // ---- Happy path: api + browser ----

  it("detects preview URL when there are api items", async () => {
    const apiItem = makeApiItem();
    mockParseTestPlan.mockReturnValue({ items: [apiItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([apiItem]);
    mockDetectPreviewUrl.mockResolvedValue("https://pr-42.preview.com");
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-1")]);
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockDetectPreviewUrl).toHaveBeenCalledOnce();
    expect(mockRouteToExecutors).toHaveBeenCalledWith(
      expect.objectContaining({ previewUrl: "https://pr-42.preview.com" }),
    );
  });

  it("detects preview URL when there are browser items", async () => {
    const browserItem = makeBrowserItem();
    mockParseTestPlan.mockReturnValue({ items: [browserItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([browserItem]);
    mockDetectPreviewUrl.mockResolvedValue("https://pr-42.preview.com");
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-2")]);
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockDetectPreviewUrl).toHaveBeenCalledOnce();
  });

  it("skips preview URL detection when there are only shell items", async () => {
    const shellItem = makeShellItem();
    mockParseTestPlan.mockReturnValue({ items: [shellItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([shellItem]);
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-0")]);
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockDetectPreviewUrl).not.toHaveBeenCalled();
  });

  it("passes null previewUrl to router when no deployment is detected", async () => {
    const apiItem = makeApiItem();
    mockParseTestPlan.mockReturnValue({ items: [apiItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([apiItem]);
    mockDetectPreviewUrl.mockResolvedValue(null);
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-1")]);
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockRouteToExecutors).toHaveBeenCalledWith(
      expect.objectContaining({ previewUrl: null }),
    );
  });

  it("does not clone repo when there are no shell items", async () => {
    const apiItem = makeApiItem();
    mockParseTestPlan.mockReturnValue({ items: [apiItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([apiItem]);
    mockDetectPreviewUrl.mockResolvedValue("https://preview.example.com");
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-1")]);
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockCloneRepo).not.toHaveBeenCalled();
  });

  // ---- Full pipeline ----

  it("reports final results after execution", async () => {
    const shellItem = makeShellItem();
    const apiItem = makeApiItem();
    const results = [makePassResult("tp-0"), makePassResult("tp-1")];
    mockParseTestPlan.mockReturnValue({
      items: [shellItem.item, apiItem.item],
      sectionTitle: "Test Plan",
      raw: "",
    });
    mockClassifyItems.mockResolvedValue([shellItem, apiItem]);
    mockDetectPreviewUrl.mockResolvedValue("https://preview.example.com");
    mockRouteToExecutors.mockResolvedValue(results);
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockReportResults).toHaveBeenCalledWith(
      expect.objectContaining({
        classifiedItems: [shellItem, apiItem],
        executionResults: results,
      }),
    );
  });

  it("passes groqApiKey to router", async () => {
    const apiItem = makeApiItem();
    mockParseTestPlan.mockReturnValue({ items: [apiItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([apiItem]);
    mockDetectPreviewUrl.mockResolvedValue("https://preview.example.com");
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-1")]);
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockRouteToExecutors).toHaveBeenCalledWith(
      expect.objectContaining({ groqApiKey: API_KEY }),
    );
  });

  // ---- Error handling ----

  it("reports partial results when classification fails", async () => {
    const shellItem = makeShellItem();
    mockParseTestPlan.mockReturnValue({ items: [shellItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockRejectedValue(new Error("Claude API timeout"));
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockReportResults).toHaveBeenCalledOnce();
    expect(mockReportResults).toHaveBeenCalledWith(
      expect.objectContaining({ classifiedItems: [], executionResults: [] }),
    );
  });

  it("cleans up repo even when execution throws", async () => {
    const shellItem = makeShellItem();
    mockParseTestPlan.mockReturnValue({ items: [shellItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([shellItem]);
    mockCloneRepo.mockResolvedValue("/tmp/vigil-acme-webapp");
    mockRouteToExecutors.mockRejectedValue(new Error("executor crashed"));
    const probot = makeProbot();

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockCleanupRepo).toHaveBeenCalledWith("/tmp/vigil-acme-webapp");
  });

  it("does not throw when cleanupRepo fails", async () => {
    const shellItem = makeShellItem();
    mockParseTestPlan.mockReturnValue({ items: [shellItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([shellItem]);
    mockCloneRepo.mockResolvedValue("/tmp/vigil-acme-webapp");
    mockCleanupRepo.mockRejectedValue(new Error("ENOENT"));
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-0")]);
    const probot = makeProbot();

    await expect(runPipeline(makeJob(), probot as never, API_KEY)).resolves.toBeUndefined();
  });

  it("does not throw when reportResults fails", async () => {
    mockParseTestPlan.mockReturnValue({ items: [], sectionTitle: "Test Plan", raw: "" });
    mockReportResults.mockRejectedValue(new Error("GitHub API error"));
    const probot = makeProbot();

    await expect(runPipeline(makeJob(), probot as never, API_KEY)).resolves.toBeUndefined();
  });

  // ---- GitHub token for clone ----

  it("passes github token from probot auth to cloneRepo", async () => {
    const shellItem = makeShellItem();
    mockParseTestPlan.mockReturnValue({ items: [shellItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([shellItem]);
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-0")]);

    const octokit = { auth: vi.fn().mockResolvedValue({ token: "ghs_installation_token" }) };
    const probot = makeProbot(octokit);

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockCloneRepo).toHaveBeenCalledWith(
      expect.objectContaining({ githubToken: "ghs_installation_token" }),
    );
  });

  it("falls back to unauthenticated clone when auth() throws", async () => {
    const shellItem = makeShellItem();
    mockParseTestPlan.mockReturnValue({ items: [shellItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([shellItem]);
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-0")]);

    const octokit = { auth: vi.fn().mockRejectedValue(new Error("auth failed")) };
    const probot = makeProbot(octokit);

    await runPipeline(makeJob(), probot as never, API_KEY);

    expect(mockCloneRepo).toHaveBeenCalledWith(
      expect.objectContaining({ githubToken: undefined }),
    );
  });

  // ---- Job data propagation ----

  it("uses job owner/repo/headSha in cloneRepo", async () => {
    const shellItem = makeShellItem();
    const job = makeJob({ owner: "myorg", repo: "myrepo", headSha: "deadbeef" });
    mockParseTestPlan.mockReturnValue({ items: [shellItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([shellItem]);
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-0")]);
    const probot = makeProbot();

    await runPipeline(job, probot as never, API_KEY);

    expect(mockCloneRepo).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "myorg", repo: "myrepo", sha: "deadbeef" }),
    );
  });

  it("uses job pullNumber in detectPreviewUrl", async () => {
    const apiItem = makeApiItem();
    const job = makeJob({ pullNumber: 99 });
    mockParseTestPlan.mockReturnValue({ items: [apiItem.item], sectionTitle: "Test Plan", raw: "" });
    mockClassifyItems.mockResolvedValue([apiItem]);
    mockDetectPreviewUrl.mockResolvedValue(null);
    mockRouteToExecutors.mockResolvedValue([makePassResult("tp-1")]);
    const probot = makeProbot();

    await runPipeline(job, probot as never, API_KEY);

    expect(mockDetectPreviewUrl).toHaveBeenCalledWith(
      expect.objectContaining({ pullNumber: 99 }),
    );
  });

  it("uses job checkRunId in reportResults", async () => {
    mockParseTestPlan.mockReturnValue({ items: [], sectionTitle: "Test Plan", raw: "" });
    const probot = makeProbot();

    await runPipeline(makeJob({ checkRunId: 9999 }), probot as never, API_KEY);

    expect(mockReportResults).toHaveBeenCalledWith(
      expect.objectContaining({ checkRunId: 9999 }),
    );
  });
});
