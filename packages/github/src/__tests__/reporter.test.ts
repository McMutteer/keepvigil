import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProbotOctokit } from "probot";
import type {
  ClassifiedItem,
  ExecutionResult,
  TestPlanItem,
  TestPlanHints,
  ConfidenceTier,
  ExecutorType,
  CategoryLabel,
} from "@vigil/core";
import {
  buildReportItems,
  computeSummary,
  reportResults,
} from "../services/reporter.js";
import type { ReportItem, ReportSummary, ReportContext } from "../services/reporter.js";
import { updateCheckRun as updateCheckRunFn, determineConclusion, buildCheckRunTitle, buildCheckRunSummary, buildCheckRunText } from "../services/check-run-updater.js";
import { buildCommentBody, buildSummaryLine, buildResultsTable, buildEvidenceBlock, formatEvidence, COMMENT_MARKER } from "../services/comment-builder.js";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeHints(overrides: Partial<TestPlanHints> = {}): TestPlanHints {
  return { isManual: false, codeBlocks: [], urls: [], ...overrides };
}

function makeItem(text: string, id = "tp-0"): TestPlanItem {
  return { id, text, checked: false, raw: `- [ ] ${text}`, indent: 0, hints: makeHints() };
}

function makeClassified(
  text: string,
  overrides: {
    id?: string;
    confidence?: ConfidenceTier;
    executorType?: ExecutorType;
    category?: CategoryLabel;
  } = {},
): ClassifiedItem {
  const {
    id = "tp-0",
    confidence = "DETERMINISTIC",
    executorType = "shell",
    category = "build",
  } = overrides;
  return {
    item: makeItem(text, id),
    confidence,
    executorType,
    category,
    reasoning: "test",
  };
}

function makeResult(itemId: string, passed: boolean, evidence: Record<string, unknown> = {}): ExecutionResult {
  return { itemId, passed, duration: 1234, evidence };
}

// ---------------------------------------------------------------------------
// buildReportItems
// ---------------------------------------------------------------------------

describe("buildReportItems", () => {
  it("matches classified items to execution results by itemId", () => {
    const classified = [makeClassified("build passes", { id: "tp-0" })];
    const results = [makeResult("tp-0", true)];
    const items = buildReportItems(classified, results);

    expect(items).toHaveLength(1);
    expect(items[0].verdict).toBe("passed");
    expect(items[0].result).toBe(results[0]);
    expect(items[0].classified).toBe(classified[0]);
  });

  it("sets SKIP items to verdict skipped with null result", () => {
    const classified = [makeClassified("manual test", { id: "tp-0", confidence: "SKIP", executorType: "none" })];
    const items = buildReportItems(classified, []);

    expect(items[0].verdict).toBe("skipped");
    expect(items[0].result).toBeNull();
  });

  it("sets items with no matching result to verdict error", () => {
    const classified = [makeClassified("build passes", { id: "tp-0" })];
    const items = buildReportItems(classified, []);

    expect(items[0].verdict).toBe("error");
    expect(items[0].result).toBeNull();
  });

  it("maps passed execution results to verdict passed", () => {
    const classified = [makeClassified("test", { id: "tp-0" })];
    const results = [makeResult("tp-0", true)];
    const items = buildReportItems(classified, results);
    expect(items[0].verdict).toBe("passed");
  });

  it("maps failed execution results to verdict failed", () => {
    const classified = [makeClassified("test", { id: "tp-0" })];
    const results = [makeResult("tp-0", false)];
    const items = buildReportItems(classified, results);
    expect(items[0].verdict).toBe("failed");
  });

  it("handles empty arrays", () => {
    expect(buildReportItems([], [])).toEqual([]);
  });

  it("handles multiple items with different verdicts", () => {
    const classified = [
      makeClassified("build", { id: "tp-0" }),
      makeClassified("api test", { id: "tp-1", confidence: "HIGH", executorType: "api" }),
      makeClassified("manual", { id: "tp-2", confidence: "SKIP", executorType: "none" }),
    ];
    const results = [makeResult("tp-0", true), makeResult("tp-1", false)];
    const items = buildReportItems(classified, results);

    expect(items[0].verdict).toBe("passed");
    expect(items[1].verdict).toBe("failed");
    expect(items[2].verdict).toBe("skipped");
  });
});

// ---------------------------------------------------------------------------
// computeSummary
// ---------------------------------------------------------------------------

describe("computeSummary", () => {
  it("counts passed, failed, skipped correctly", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("a", { id: "tp-0" }), result: makeResult("tp-0", true), verdict: "passed" },
      { classified: makeClassified("b", { id: "tp-1" }), result: makeResult("tp-1", false), verdict: "failed" },
      { classified: makeClassified("c", { id: "tp-2", confidence: "SKIP", executorType: "none" }), result: null, verdict: "skipped" },
    ];
    const summary = computeSummary(items);
    expect(summary).toEqual({ total: 3, passed: 1, failed: 1, skipped: 1, needsReview: 0 });
  });

  it("counts MEDIUM/LOW failures as needsReview", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("a", { id: "tp-0" }), result: makeResult("tp-0", true), verdict: "passed" },
      { classified: makeClassified("b", { id: "tp-1", confidence: "MEDIUM", executorType: "browser" }), result: makeResult("tp-1", false), verdict: "failed" },
      { classified: makeClassified("c", { id: "tp-2", confidence: "LOW", executorType: "browser" }), result: makeResult("tp-2", false), verdict: "failed" },
    ];
    const summary = computeSummary(items);
    expect(summary).toEqual({ total: 3, passed: 1, failed: 0, skipped: 0, needsReview: 2 });
  });

  it("returns all zeros for empty items", () => {
    expect(computeSummary([])).toEqual({ total: 0, passed: 0, failed: 0, skipped: 0, needsReview: 0 });
  });
});

// ---------------------------------------------------------------------------
// determineConclusion
// ---------------------------------------------------------------------------

describe("determineConclusion", () => {
  it("returns success when all DETERMINISTIC items pass", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("a", { confidence: "DETERMINISTIC" }), result: makeResult("tp-0", true), verdict: "passed" },
    ];
    expect(determineConclusion(items)).toBe("success");
  });

  it("returns failure when a DETERMINISTIC item fails", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("a", { confidence: "DETERMINISTIC" }), result: makeResult("tp-0", false), verdict: "failed" },
    ];
    expect(determineConclusion(items)).toBe("failure");
  });

  it("returns failure when a HIGH item fails", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("a", { confidence: "HIGH", executorType: "api" }), result: makeResult("tp-0", false), verdict: "failed" },
    ];
    expect(determineConclusion(items)).toBe("failure");
  });

  it("returns neutral when only MEDIUM items fail", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("a", { confidence: "DETERMINISTIC" }), result: makeResult("tp-0", true), verdict: "passed" },
      { classified: makeClassified("b", { id: "tp-1", confidence: "MEDIUM", executorType: "browser" }), result: makeResult("tp-1", false), verdict: "failed" },
    ];
    expect(determineConclusion(items)).toBe("neutral");
  });

  it("returns neutral when only LOW items fail", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("a", { confidence: "LOW", executorType: "browser" }), result: makeResult("tp-0", false), verdict: "failed" },
    ];
    expect(determineConclusion(items)).toBe("neutral");
  });

  it("returns neutral when all items are SKIP", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("a", { confidence: "SKIP", executorType: "none" }), result: null, verdict: "skipped" },
    ];
    expect(determineConclusion(items)).toBe("neutral");
  });

  it("returns failure when DETERMINISTIC fails and MEDIUM passes", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("a", { confidence: "DETERMINISTIC" }), result: makeResult("tp-0", false), verdict: "failed" },
      { classified: makeClassified("b", { id: "tp-1", confidence: "MEDIUM", executorType: "browser" }), result: makeResult("tp-1", true), verdict: "passed" },
    ];
    expect(determineConclusion(items)).toBe("failure");
  });

  it("returns neutral when DETERMINISTIC passes and MEDIUM fails", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("a", { confidence: "DETERMINISTIC" }), result: makeResult("tp-0", true), verdict: "passed" },
      { classified: makeClassified("b", { id: "tp-1", confidence: "MEDIUM", executorType: "browser" }), result: makeResult("tp-1", false), verdict: "failed" },
    ];
    expect(determineConclusion(items)).toBe("neutral");
  });

  it("returns neutral for empty items", () => {
    expect(determineConclusion([])).toBe("neutral");
  });

  it("returns failure when an item has verdict error and is blocking", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("a", { confidence: "DETERMINISTIC" }), result: null, verdict: "error" },
    ];
    expect(determineConclusion(items)).toBe("failure");
  });
});

// ---------------------------------------------------------------------------
// buildCheckRunTitle
// ---------------------------------------------------------------------------

describe("buildCheckRunTitle", () => {
  it("shows all verified successfully when no failures", () => {
    const summary: ReportSummary = { total: 5, passed: 5, failed: 0, skipped: 0, needsReview: 0 };
    expect(buildCheckRunTitle(summary)).toBe("All 5 items verified successfully");
  });

  it("shows mixed counts", () => {
    const summary: ReportSummary = { total: 12, passed: 9, failed: 1, skipped: 1, needsReview: 2 };
    expect(buildCheckRunTitle(summary)).toBe("9 passed, 1 failed, 2 need review");
  });

  it("shows no verifiable items when all are skipped", () => {
    const summary: ReportSummary = { total: 3, passed: 0, failed: 0, skipped: 3, needsReview: 0 };
    expect(buildCheckRunTitle(summary)).toBe("No verifiable items found");
  });

  it("shows no items found when total is zero", () => {
    const summary: ReportSummary = { total: 0, passed: 0, failed: 0, skipped: 0, needsReview: 0 };
    expect(buildCheckRunTitle(summary)).toBe("No test plan items found");
  });

  it("includes skipped in verifiable count", () => {
    const summary: ReportSummary = { total: 4, passed: 3, failed: 0, skipped: 1, needsReview: 0 };
    expect(buildCheckRunTitle(summary)).toBe("All 3 items verified successfully");
  });
});

// ---------------------------------------------------------------------------
// buildCheckRunSummary
// ---------------------------------------------------------------------------

describe("buildCheckRunSummary", () => {
  it("produces valid markdown with counts", () => {
    const summary: ReportSummary = { total: 5, passed: 3, failed: 1, skipped: 0, needsReview: 1 };
    const md = buildCheckRunSummary(summary, "failure");

    expect(md).toContain("| Passed | 3 |");
    expect(md).toContain("| Failed | 1 |");
    expect(md).toContain("| **Total** | **5** |");
    expect(md).toContain("`failure`");
  });

  it("includes conclusion explanation for success", () => {
    const summary: ReportSummary = { total: 2, passed: 2, failed: 0, skipped: 0, needsReview: 0 };
    const md = buildCheckRunSummary(summary, "success");
    expect(md).toContain("All high-confidence items passed");
  });
});

// ---------------------------------------------------------------------------
// buildCheckRunText
// ---------------------------------------------------------------------------

describe("buildCheckRunText", () => {
  it("produces results table with all items", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("build passes"), result: makeResult("tp-0", true), verdict: "passed" },
      { classified: makeClassified("api works", { id: "tp-1", confidence: "HIGH", executorType: "api" }), result: makeResult("tp-1", false), verdict: "failed" },
    ];
    const text = buildCheckRunText(items);

    expect(text).toContain("build passes");
    expect(text).toContain("api works");
    expect(text).toContain("DETERMINISTIC");
    expect(text).toContain("HIGH");
  });

  it("includes evidence for failed items", () => {
    const items: ReportItem[] = [
      {
        classified: makeClassified("api test", { id: "tp-0", confidence: "HIGH", executorType: "api" }),
        result: makeResult("tp-0", false, { error: "timeout" }),
        verdict: "failed",
      },
    ];
    const text = buildCheckRunText(items);
    expect(text).toContain("Evidence");
    expect(text).toContain("timeout");
  });

  it("returns message for empty items", () => {
    expect(buildCheckRunText([])).toBe("No test plan items to report.");
  });

  it("truncates when exceeding max length", () => {
    const items: ReportItem[] = Array.from({ length: 30 }, (_, i) => ({
      classified: makeClassified(`test item ${i}`, { id: `tp-${i}`, confidence: "HIGH" as const, executorType: "api" as const }),
      result: makeResult(`tp-${i}`, false, { data: "x".repeat(5000) }),
      verdict: "failed" as const,
    }));
    const text = buildCheckRunText(items);
    expect(text.length).toBeLessThanOrEqual(60_000);
    expect(text).toContain("truncated");
  });
});

// ---------------------------------------------------------------------------
// buildSummaryLine
// ---------------------------------------------------------------------------

describe("buildSummaryLine", () => {
  it("shows all non-zero counts separated by pipes", () => {
    const summary: ReportSummary = { total: 10, passed: 6, failed: 2, skipped: 1, needsReview: 1 };
    expect(buildSummaryLine(summary)).toBe("**6** passed | **2** failed | **1** need review | **1** skipped");
  });

  it("omits zero counts", () => {
    const summary: ReportSummary = { total: 5, passed: 5, failed: 0, skipped: 0, needsReview: 0 };
    expect(buildSummaryLine(summary)).toBe("**5** passed");
  });

  it("returns message when all counts are zero", () => {
    const summary: ReportSummary = { total: 0, passed: 0, failed: 0, skipped: 0, needsReview: 0 };
    expect(buildSummaryLine(summary)).toBe("No test plan items found.");
  });
});

// ---------------------------------------------------------------------------
// buildResultsTable
// ---------------------------------------------------------------------------

describe("buildResultsTable", () => {
  it("builds a markdown table with header and rows", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("build passes"), result: makeResult("tp-0", true), verdict: "passed" },
    ];
    const table = buildResultsTable(items);
    expect(table).toContain("| # | Item | Confidence | Status |");
    expect(table).toContain("| 1 | build passes | DETERMINISTIC | :white_check_mark: Passed |");
  });

  it("shows correct status icons for all verdicts", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("a", { id: "tp-0" }), result: makeResult("tp-0", true), verdict: "passed" },
      { classified: makeClassified("b", { id: "tp-1" }), result: makeResult("tp-1", false), verdict: "failed" },
      { classified: makeClassified("c", { id: "tp-2", confidence: "MEDIUM" }), result: makeResult("tp-2", false), verdict: "failed" },
      { classified: makeClassified("d", { id: "tp-3", confidence: "SKIP", executorType: "none" }), result: null, verdict: "skipped" },
    ];
    const table = buildResultsTable(items);
    expect(table).toContain(":white_check_mark: Passed");
    expect(table).toContain(":x: Failed");
    expect(table).toContain(":warning: Needs Review");
    expect(table).toContain(":construction: Human");
  });
});

// ---------------------------------------------------------------------------
// buildEvidenceBlock
// ---------------------------------------------------------------------------

describe("buildEvidenceBlock", () => {
  it("returns empty string for passed items", () => {
    const item: ReportItem = {
      classified: makeClassified("test"),
      result: makeResult("tp-0", true),
      verdict: "passed",
    };
    expect(buildEvidenceBlock(item)).toBe("");
  });

  it("returns empty string for skipped items", () => {
    const item: ReportItem = {
      classified: makeClassified("test", { confidence: "SKIP", executorType: "none" }),
      result: null,
      verdict: "skipped",
    };
    expect(buildEvidenceBlock(item)).toBe("");
  });

  it("includes evidence for failed items", () => {
    const item: ReportItem = {
      classified: makeClassified("build fails", { executorType: "shell" }),
      result: makeResult("tp-0", false, { commands: ["npm run build"], exitCode: 1, stdout: "error output", stderr: "" }),
      verdict: "failed",
    };
    const block = buildEvidenceBlock(item);
    expect(block).toContain("<details>");
    expect(block).toContain("build fails");
    expect(block).toContain("shell");
    expect(block).toContain("</details>");
  });

  it("handles error items with no result", () => {
    const item: ReportItem = {
      classified: makeClassified("test"),
      result: null,
      verdict: "error",
    };
    const block = buildEvidenceBlock(item);
    expect(block).toContain("No execution result available");
  });

  it("truncates long evidence blocks", () => {
    const item: ReportItem = {
      classified: makeClassified("test", { executorType: "browser", category: "ui-flow" }),
      result: makeResult("tp-0", false, {
        actions: Array.from({ length: 40 }, (_, i) => ({
          description: `Action step ${i} with a long description that fills up space quickly`,
          passed: false,
          failReason: "Element not found in the DOM after waiting for timeout",
        })),
      }),
      verdict: "failed",
    };
    const block = buildEvidenceBlock(item);
    expect(block.length).toBeLessThanOrEqual(2000);
    expect(block).toContain("truncated");
  });
});

// ---------------------------------------------------------------------------
// formatEvidence
// ---------------------------------------------------------------------------

describe("formatEvidence", () => {
  it("formats shell evidence with commands and exit code", () => {
    const item: ReportItem = {
      classified: makeClassified("build", { executorType: "shell" }),
      result: makeResult("tp-0", false, {
        commands: ["npm run build"],
        exitCode: 1,
        stdout: "build failed",
        stderr: "error detail",
      }),
      verdict: "failed",
    };
    const text = formatEvidence(item);
    expect(text).toContain("npm run build");
    expect(text).toContain("Exit code");
    expect(text).toContain("build failed");
    expect(text).toContain("stderr");
  });

  it("formats API evidence with requests", () => {
    const item: ReportItem = {
      classified: makeClassified("api test", { executorType: "api", category: "api" }),
      result: makeResult("tp-0", false, {
        requests: [{
          spec: { method: "POST", path: "/api/users" },
          status: 500,
          body: { error: "Internal Server Error" },
          durationMs: 120,
          passed: false,
          failReason: "Expected 201, got 500",
        }],
      }),
      verdict: "failed",
    };
    const text = formatEvidence(item);
    expect(text).toContain("POST");
    expect(text).toContain("/api/users");
    expect(text).toContain("500");
    expect(text).toContain("Expected 201, got 500");
  });

  it("formats browser evidence with actions", () => {
    const item: ReportItem = {
      classified: makeClassified("ui test", { executorType: "browser", category: "ui-flow" }),
      result: makeResult("tp-0", false, {
        actions: [
          { description: "Navigate to /login", passed: true },
          { description: "Fill username", passed: false, failReason: "Element not found" },
        ],
        consoleErrors: ["Uncaught TypeError"],
      }),
      verdict: "failed",
    };
    const text = formatEvidence(item);
    expect(text).toContain("Navigate to /login");
    expect(text).toContain("Element not found");
    expect(text).toContain("Console errors");
  });

  it("formats generic evidence as JSON for unknown executor", () => {
    const item: ReportItem = {
      classified: makeClassified("test", { executorType: "none" as ExecutorType }),
      result: makeResult("tp-0", false, { custom: "data" }),
      verdict: "failed",
    };
    const text = formatEvidence(item);
    expect(text).toContain("custom");
    expect(text).toContain("data");
  });

  it("returns empty string when no result", () => {
    const item: ReportItem = {
      classified: makeClassified("test"),
      result: null,
      verdict: "error",
    };
    expect(formatEvidence(item)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// buildCommentBody
// ---------------------------------------------------------------------------

describe("buildCommentBody", () => {
  it("includes the hidden marker at the top", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("build"), result: makeResult("tp-0", true), verdict: "passed" },
    ];
    const summary: ReportSummary = { total: 1, passed: 1, failed: 0, skipped: 0, needsReview: 0 };
    const body = buildCommentBody(items, summary);
    expect(body.startsWith(COMMENT_MARKER)).toBe(true);
  });

  it("includes summary line", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("build"), result: makeResult("tp-0", true), verdict: "passed" },
    ];
    const summary: ReportSummary = { total: 1, passed: 1, failed: 0, skipped: 0, needsReview: 0 };
    const body = buildCommentBody(items, summary);
    expect(body).toContain("**1** passed");
  });

  it("includes results table", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("build passes"), result: makeResult("tp-0", true), verdict: "passed" },
    ];
    const summary: ReportSummary = { total: 1, passed: 1, failed: 0, skipped: 0, needsReview: 0 };
    const body = buildCommentBody(items, summary);
    expect(body).toContain("build passes");
    expect(body).toContain("DETERMINISTIC");
  });

  it("includes evidence only for failed items", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("passes", { id: "tp-0" }), result: makeResult("tp-0", true), verdict: "passed" },
      {
        classified: makeClassified("fails", { id: "tp-1", executorType: "shell" }),
        result: makeResult("tp-1", false, { commands: ["npm test"], exitCode: 1, stdout: "fail", stderr: "" }),
        verdict: "failed",
      },
    ];
    const summary: ReportSummary = { total: 2, passed: 1, failed: 1, skipped: 0, needsReview: 0 };
    const body = buildCommentBody(items, summary);
    expect(body).toContain("<details>");
    expect(body).toContain("fails");
    expect(body).not.toContain("tp-0:");
  });

  it("shows SKIP items as Human in the table", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("manual check", { confidence: "SKIP", executorType: "none" }), result: null, verdict: "skipped" },
    ];
    const summary: ReportSummary = { total: 1, passed: 0, failed: 0, skipped: 1, needsReview: 0 };
    const body = buildCommentBody(items, summary);
    expect(body).toContain(":construction: Human");
  });

  it("includes needs-review evidence for MEDIUM failures", () => {
    const items: ReportItem[] = [
      {
        classified: makeClassified("visual check", { confidence: "MEDIUM", executorType: "browser" }),
        result: makeResult("tp-0", false, { screenshots: [] }),
        verdict: "failed",
      },
    ];
    const summary: ReportSummary = { total: 1, passed: 0, failed: 0, skipped: 0, needsReview: 1 };
    const body = buildCommentBody(items, summary);
    expect(body).toContain("<details>");
    expect(body).toContain("visual check");
  });

  it("caps total body at 60000 chars", () => {
    const items: ReportItem[] = Array.from({ length: 50 }, (_, i) => ({
      classified: makeClassified(`item ${i}`, { id: `tp-${i}`, executorType: "shell" }),
      result: makeResult(`tp-${i}`, false, { stdout: "x".repeat(2000), exitCode: 1, commands: ["test"] }),
      verdict: "failed" as const,
    }));
    const summary: ReportSummary = { total: 50, passed: 0, failed: 50, skipped: 0, needsReview: 0 };
    const body = buildCommentBody(items, summary);
    expect(body.length).toBeLessThanOrEqual(60_000);
  });

  it("includes footer with version", () => {
    const items: ReportItem[] = [];
    const summary: ReportSummary = { total: 0, passed: 0, failed: 0, skipped: 0, needsReview: 0 };
    const body = buildCommentBody(items, summary);
    expect(body).toContain("keepvigil.dev");
  });
});

// ---------------------------------------------------------------------------
// updateCheckRun (mocked octokit)
// ---------------------------------------------------------------------------

describe("updateCheckRun", () => {
  it("calls octokit.rest.checks.update with correct params", async () => {
    const mockUpdate = vi.fn().mockResolvedValue({});
    const octokit = { rest: { checks: { update: mockUpdate } } } as unknown as ProbotOctokit;

    const items: ReportItem[] = [
      { classified: makeClassified("build"), result: makeResult("tp-0", true), verdict: "passed" },
    ];
    const summary: ReportSummary = { total: 1, passed: 1, failed: 0, skipped: 0, needsReview: 0 };

    await updateCheckRunFn({
      octokit,
      owner: "owner",
      repo: "repo",
      checkRunId: 42,
      conclusion: "success",
      summary,
      items,
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    const call = mockUpdate.mock.calls[0][0];
    expect(call.owner).toBe("owner");
    expect(call.repo).toBe("repo");
    expect(call.check_run_id).toBe(42);
    expect(call.status).toBe("completed");
    expect(call.conclusion).toBe("success");
    expect(call.completed_at).toBeDefined();
    expect(call.output.title).toContain("verified successfully");
  });
});

// ---------------------------------------------------------------------------
// reportResults integration (mocked octokit)
// ---------------------------------------------------------------------------

describe("reportResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeMockOctokit(overrides: {
    updateCheckRun?: ReturnType<typeof vi.fn>;
    listComments?: ReturnType<typeof vi.fn>;
    createComment?: ReturnType<typeof vi.fn>;
    updateComment?: ReturnType<typeof vi.fn>;
  } = {}) {
    const updateFn = overrides.updateCheckRun ?? vi.fn().mockResolvedValue({});
    const listComments = overrides.listComments ?? vi.fn().mockResolvedValue([]);
    const createComment = overrides.createComment ?? vi.fn().mockResolvedValue({});
    const updateComment = overrides.updateComment ?? vi.fn().mockResolvedValue({});

    return {
      rest: {
        checks: { update: updateFn },
        issues: {
          listComments: { endpoint: { merge: vi.fn().mockReturnValue({}) } },
          createComment,
          updateComment,
        },
      },
      paginate: listComments,
    } as unknown as ProbotOctokit;
  }

  function makeReportContext(
    octokit: ProbotOctokit,
    classifiedItems: ClassifiedItem[] = [],
    executionResults: ExecutionResult[] = [],
  ): ReportContext {
    return {
      octokit,
      owner: "owner",
      repo: "repo",
      pullNumber: 7,
      headSha: "abc123",
      checkRunId: 42,
      classifiedItems,
      executionResults,
    };
  }

  it("updates check run and creates comment on full flow", async () => {
    const updateFn = vi.fn().mockResolvedValue({});
    const createComment = vi.fn().mockResolvedValue({});
    const listComments = vi.fn().mockResolvedValue([]);
    const octokit = makeMockOctokit({ updateCheckRun: updateFn, listComments, createComment });

    const classified = [makeClassified("build passes", { id: "tp-0" })];
    const results = [makeResult("tp-0", true)];

    await reportResults(makeReportContext(octokit, classified, results));

    expect(updateFn).toHaveBeenCalledOnce();
    expect(createComment).toHaveBeenCalledOnce();
    const commentBody = createComment.mock.calls[0][0].body;
    expect(commentBody).toContain(COMMENT_MARKER);
  });

  it("updates existing comment when marker found", async () => {
    const updateFn = vi.fn().mockResolvedValue({});
    const createComment = vi.fn().mockResolvedValue({});
    const updateComment = vi.fn().mockResolvedValue({});
    const listComments = vi.fn().mockResolvedValue([
      { id: 99, body: `${COMMENT_MARKER}\nold results` },
    ]);
    const octokit = makeMockOctokit({ updateCheckRun: updateFn, listComments, createComment, updateComment });

    const classified = [makeClassified("build passes", { id: "tp-0" })];
    const results = [makeResult("tp-0", true)];

    await reportResults(makeReportContext(octokit, classified, results));

    expect(createComment).not.toHaveBeenCalled();
    expect(updateComment).toHaveBeenCalledOnce();
    expect(updateComment.mock.calls[0][0].comment_id).toBe(99);
  });

  it("creates new comment when no existing marker found", async () => {
    const createComment = vi.fn().mockResolvedValue({});
    const listComments = vi.fn().mockResolvedValue([
      { id: 50, body: "some other comment" },
    ]);
    const octokit = makeMockOctokit({ listComments, createComment });

    await reportResults(makeReportContext(octokit, [makeClassified("test")], [makeResult("tp-0", true)]));

    expect(createComment).toHaveBeenCalledOnce();
  });

  it("propagates check run update errors", async () => {
    const updateFn = vi.fn().mockRejectedValue(new Error("GitHub API error"));
    const octokit = makeMockOctokit({ updateCheckRun: updateFn });

    await expect(
      reportResults(makeReportContext(octokit, [makeClassified("test")], [makeResult("tp-0", true)])),
    ).rejects.toThrow("GitHub API error");
  });

  it("swallows comment errors without throwing", async () => {
    const updateFn = vi.fn().mockResolvedValue({});
    const listComments = vi.fn().mockRejectedValue(new Error("Comment API error"));
    const octokit = makeMockOctokit({ updateCheckRun: updateFn, listComments });

    await expect(
      reportResults(makeReportContext(octokit, [makeClassified("test")], [makeResult("tp-0", true)])),
    ).resolves.toBeUndefined();
  });

  it("handles empty execution results (all items become error)", async () => {
    const updateFn = vi.fn().mockResolvedValue({});
    const listComments = vi.fn().mockResolvedValue([]);
    const createComment = vi.fn().mockResolvedValue({});
    const octokit = makeMockOctokit({ updateCheckRun: updateFn, listComments, createComment });

    const classified = [makeClassified("build passes")];
    await reportResults(makeReportContext(octokit, classified, []));

    const checkCall = updateFn.mock.calls[0][0];
    expect(checkCall.conclusion).toBe("failure");
  });

  it("handles all-SKIP scenario", async () => {
    const updateFn = vi.fn().mockResolvedValue({});
    const listComments = vi.fn().mockResolvedValue([]);
    const createComment = vi.fn().mockResolvedValue({});
    const octokit = makeMockOctokit({ updateCheckRun: updateFn, listComments, createComment });

    const classified = [
      makeClassified("manual test", { confidence: "SKIP", executorType: "none" }),
    ];
    await reportResults(makeReportContext(octokit, classified, []));

    const checkCall = updateFn.mock.calls[0][0];
    expect(checkCall.conclusion).toBe("neutral");
  });
});
