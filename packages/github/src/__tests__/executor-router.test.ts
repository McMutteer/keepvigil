import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — executor functions from @vigil/executors
// ---------------------------------------------------------------------------

const mockExecuteShellItem = vi.hoisted(() => vi.fn());
const mockExecuteApiItem = vi.hoisted(() => vi.fn());
const mockExecuteBrowserItem = vi.hoisted(() => vi.fn());

vi.mock("@vigil/executors", () => ({
  executeShellItem: mockExecuteShellItem,
  executeApiItem: mockExecuteApiItem,
  executeBrowserItem: mockExecuteBrowserItem,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { routeToExecutors } from "../services/executor-router.js";
import type { ClassifiedItem } from "@vigil/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_KEY = "test-anthropic-key";

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("routeToExecutors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteShellItem.mockResolvedValue({ itemId: "tp-0", passed: true, duration: 50, evidence: {} });
    mockExecuteApiItem.mockResolvedValue({ itemId: "tp-1", passed: true, duration: 30, evidence: {} });
    mockExecuteBrowserItem.mockResolvedValue({ itemId: "tp-2", passed: true, duration: 200, evidence: {} });
  });

  it("routes shell items to executeShellItem", async () => {
    const shellItem = makeShellItem();
    await routeToExecutors({
      classifiedItems: [shellItem],
      repoPath: "/tmp/repo",
      previewUrl: null,
      groqApiKey: API_KEY,
    });

    expect(mockExecuteShellItem).toHaveBeenCalledWith(
      shellItem,
      expect.objectContaining({ repoPath: "/tmp/repo" }),
    );
  });

  it("routes api items to executeApiItem", async () => {
    const apiItem = makeApiItem();
    await routeToExecutors({
      classifiedItems: [apiItem],
      repoPath: null,
      previewUrl: "https://preview.example.com",
      groqApiKey: API_KEY,
    });

    expect(mockExecuteApiItem).toHaveBeenCalledWith(
      apiItem,
      expect.objectContaining({ baseUrl: "https://preview.example.com" }),
    );
  });

  it("routes browser items to executeBrowserItem", async () => {
    const browserItem = makeBrowserItem();
    await routeToExecutors({
      classifiedItems: [browserItem],
      repoPath: null,
      previewUrl: "https://preview.example.com",
      groqApiKey: API_KEY,
    });

    expect(mockExecuteBrowserItem).toHaveBeenCalledWith(
      browserItem,
      expect.objectContaining({ baseUrl: "https://preview.example.com" }),
    );
  });

  it("returns noPreviewResult for api items when previewUrl is null", async () => {
    const apiItem = makeApiItem();
    const results = await routeToExecutors({
      classifiedItems: [apiItem],
      repoPath: null,
      previewUrl: null,
      groqApiKey: API_KEY,
    });

    expect(results[0].passed).toBe(false);
    expect(results[0].evidence).toMatchObject({
      reason: expect.stringContaining("No preview deployment"),
    });
    expect(mockExecuteApiItem).not.toHaveBeenCalled();
  });

  it("returns noRepoResult for shell items when repoPath is null", async () => {
    const shellItem = makeShellItem();
    const results = await routeToExecutors({
      classifiedItems: [shellItem],
      repoPath: null,
      previewUrl: null,
      groqApiKey: API_KEY,
    });

    expect(results[0].passed).toBe(false);
    expect(results[0].evidence).toMatchObject({
      reason: expect.stringContaining("Repository could not be cloned"),
    });
    expect(mockExecuteShellItem).not.toHaveBeenCalled();
  });

  it("returns skipped result for SKIP confidence items", async () => {
    const skipItem: ClassifiedItem = {
      ...makeShellItem(),
      confidence: "SKIP",
      executorType: "none",
    };
    const results = await routeToExecutors({
      classifiedItems: [skipItem],
      repoPath: null,
      previewUrl: null,
      groqApiKey: API_KEY,
    });

    expect(results[0].passed).toBe(true);
    expect(results[0].evidence).toMatchObject({ skipped: true });
  });

  it("returns skipped result for none executorType", async () => {
    const noneItem: ClassifiedItem = {
      ...makeShellItem("tp-9"),
      confidence: "LOW",
      executorType: "none",
    };
    const results = await routeToExecutors({
      classifiedItems: [noneItem],
      repoPath: null,
      previewUrl: null,
      groqApiKey: API_KEY,
    });

    expect(results[0].passed).toBe(true);
    expect(results[0].evidence).toMatchObject({ skipped: true });
  });

  it("handles executor throw defensively", async () => {
    mockExecuteShellItem.mockRejectedValue(new Error("unexpected crash"));
    const shellItem = makeShellItem();
    const results = await routeToExecutors({
      classifiedItems: [shellItem],
      repoPath: "/tmp/repo",
      previewUrl: null,
      groqApiKey: API_KEY,
    });

    expect(results[0].passed).toBe(false);
    expect(results[0].evidence).toMatchObject({ error: "Error: unexpected crash" });
  });

  it("runs all items and returns results in order", async () => {
    const shellItem = makeShellItem("tp-0");
    const apiItem = makeApiItem("tp-1");
    mockExecuteShellItem.mockResolvedValue({ itemId: "tp-0", passed: true, duration: 100, evidence: {} });
    mockExecuteApiItem.mockResolvedValue({ itemId: "tp-1", passed: false, duration: 50, evidence: {} });

    const results = await routeToExecutors({
      classifiedItems: [shellItem, apiItem],
      repoPath: "/tmp/repo",
      previewUrl: "https://preview.example.com",
      groqApiKey: API_KEY,
    });

    expect(results).toHaveLength(2);
    expect(results[0].itemId).toBe("tp-0");
    expect(results[1].itemId).toBe("tp-1");
  });

  it("passes correct timeout to shell executor", async () => {
    const shellItem = makeShellItem();
    await routeToExecutors({
      classifiedItems: [shellItem],
      repoPath: "/tmp/repo",
      previewUrl: null,
      groqApiKey: API_KEY,
    });

    expect(mockExecuteShellItem).toHaveBeenCalledWith(
      shellItem,
      expect.objectContaining({ timeoutMs: 300_000 }),
    );
  });

  it("passes groqApiKey to api executor", async () => {
    const apiItem = makeApiItem();
    await routeToExecutors({
      classifiedItems: [apiItem],
      repoPath: null,
      previewUrl: "https://preview.example.com",
      groqApiKey: "sk-custom-key",
    });

    expect(mockExecuteApiItem).toHaveBeenCalledWith(
      apiItem,
      expect.objectContaining({ groqApiKey: "sk-custom-key" }),
    );
  });
});
