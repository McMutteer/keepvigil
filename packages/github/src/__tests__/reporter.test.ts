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
import type { ConfidenceScore, Signal } from "@vigil/core";
import { createSignal } from "@vigil/core";
import {
  buildReportItems,
  computeSummary,
  reportResults,
} from "../services/reporter.js";
import type { ReportItem, ReportSummary, ReportContext } from "../services/reporter.js";
import { updateCheckRun as updateCheckRunFn, determineConclusion, conclusionFromScore, buildCheckRunTitle, buildCheckRunSummary, buildCheckRunText, truncateToBytes } from "../services/check-run-updater.js";
import { buildCommentBody, buildSummaryLine, buildResultsTable, buildEvidenceBlock, formatEvidence, buildConfigBlock, COMMENT_MARKER } from "../services/comment-builder.js";

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

  it("escapes pipe characters in item text", () => {
    const items: ReportItem[] = [
      { classified: makeClassified("check a | b", { id: "tp-0" }), result: makeResult("tp-0", true), verdict: "passed" },
    ];
    const table = buildResultsTable(items);
    expect(table).toContain("check a \\| b");
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

  it("includes both actions and metadata evidence for browser executor", () => {
    const item: ReportItem = {
      classified: makeClassified("seo check", { executorType: "browser", category: "seo" }),
      result: makeResult("tp-0", false, {
        actions: [
          { description: "Navigate to /home", passed: true },
          { description: "Check OG tags", passed: false, failReason: "Missing og:image" },
        ],
        ogTags: { "og:title": "My Site" },
        missingOgTags: ["og:image"],
      }),
      verdict: "failed",
    };
    const text = formatEvidence(item);
    expect(text).toContain("Navigate to /home");
    expect(text).toContain("Missing og:image");
    expect(text).toContain("Missing OG tags");
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

  it("includes config block when vigiConfig is provided", () => {
    const items: ReportItem[] = [];
    const summary: ReportSummary = { total: 0, passed: 0, failed: 0, skipped: 0, needsReview: 0 };
    const body = buildCommentBody(items, summary, undefined, undefined, { timeouts: { shell: 120 } });
    expect(body).toContain("⚙️ Config applied");
    expect(body).toContain("120s");
  });

  it("omits config block when vigiConfig is undefined", () => {
    const items: ReportItem[] = [];
    const summary: ReportSummary = { total: 0, passed: 0, failed: 0, skipped: 0, needsReview: 0 };
    const body = buildCommentBody(items, summary);
    expect(body).not.toContain("⚙️ Config applied");
  });
});

// ---------------------------------------------------------------------------
// buildConfigBlock
// ---------------------------------------------------------------------------

describe("buildConfigBlock", () => {
  it("returns empty string for undefined", () => {
    expect(buildConfigBlock(undefined)).toBe("");
  });

  it("returns empty string for empty config object", () => {
    expect(buildConfigBlock({})).toBe("");
  });

  it("renders shell timeout", () => {
    const block = buildConfigBlock({ timeouts: { shell: 120 } });
    expect(block).toContain("Shell timeout");
    expect(block).toContain("120s");
  });

  it("renders api and browser timeouts", () => {
    const block = buildConfigBlock({ timeouts: { api: 15, browser: 90 } });
    expect(block).toContain("API timeout");
    expect(block).toContain("15s");
    expect(block).toContain("Browser timeout");
    expect(block).toContain("90s");
  });

  it("renders skip categories", () => {
    const block = buildConfigBlock({ skip: { categories: ["visual", "metadata"] } });
    expect(block).toContain("Skip categories");
    expect(block).toContain("visual, metadata");
  });

  it("renders viewports with dimensions", () => {
    const block = buildConfigBlock({
      viewports: [
        { label: "mobile", width: 390, height: 844 },
        { label: "desktop", width: 1440, height: 900 },
      ],
    });
    expect(block).toContain("Viewports");
    expect(block).toContain("mobile (390×844)");
    expect(block).toContain("desktop (1440×900)");
  });

  it("renders shell allowlist with singular label for 1 prefix", () => {
    const block = buildConfigBlock({ shell: { allow: ["npm test"] } });
    expect(block).toContain("Shell allowlist");
    expect(block).toContain("+1 custom prefix");
    expect(block).not.toContain("prefixes");
  });

  it("renders shell allowlist with plural label for multiple prefixes", () => {
    const block = buildConfigBlock({ shell: { allow: ["npm test", "bundle exec rspec"] } });
    expect(block).toContain("+2 custom prefixes");
  });

  it("wraps output in a collapsible details block", () => {
    const block = buildConfigBlock({ timeouts: { shell: 60 } });
    expect(block).toContain("<details>");
    expect(block).toContain("</details>");
    expect(block).toContain("<summary>");
  });

  it("escapes pipe characters in viewport labels", () => {
    const block = buildConfigBlock({
      viewports: [{ label: "pipe|label", width: 800, height: 600 }],
    });
    expect(block).toContain("pipe\\|label");
  });

  it("returns empty string when config is undefined and no warnings", () => {
    expect(buildConfigBlock(undefined, undefined)).toBe("");
    expect(buildConfigBlock(undefined, [])).toBe("");
  });

  it("renders warnings section when config is valid but has warnings", () => {
    const block = buildConfigBlock(
      { timeouts: { shell: 120 } },
      ["`timeouts.api`: 999 is invalid (must be 1–300s) — using default"],
    );
    expect(block).toContain("Config warnings");
    expect(block).toContain("timeouts.api");
    expect(block).toContain("Shell timeout");
  });

  it("renders warnings-only block when no settings were applied", () => {
    const block = buildConfigBlock(undefined, ["`timeouts.shell`: 9999 is invalid — using default"]);
    expect(block).toContain("no valid settings applied");
    expect(block).toContain("Config warnings");
    expect(block).toContain("timeouts.shell");
  });

  it("renders multiple warnings as a list", () => {
    const warnings = [
      "`timeouts.shell`: 9999 is invalid — using default",
      "`timeouts.api`: -1 is invalid — using default",
    ];
    const block = buildConfigBlock(undefined, warnings);
    expect(block).toContain("timeouts.shell");
    expect(block).toContain("timeouts.api");
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

  it("updates existing comment when marker found from bot", async () => {
    const updateFn = vi.fn().mockResolvedValue({});
    const createComment = vi.fn().mockResolvedValue({});
    const updateComment = vi.fn().mockResolvedValue({});
    const listComments = vi.fn().mockResolvedValue([
      { id: 99, body: `${COMMENT_MARKER}\nold results`, user: { type: "Bot" } },
    ]);
    const octokit = makeMockOctokit({ updateCheckRun: updateFn, listComments, createComment, updateComment });

    const classified = [makeClassified("build passes", { id: "tp-0" })];
    const results = [makeResult("tp-0", true)];

    await reportResults(makeReportContext(octokit, classified, results));

    expect(createComment).not.toHaveBeenCalled();
    expect(updateComment).toHaveBeenCalledOnce();
    expect(updateComment.mock.calls[0][0].comment_id).toBe(99);
  });

  it("ignores marker in non-bot comments and creates new", async () => {
    const createComment = vi.fn().mockResolvedValue({});
    const updateComment = vi.fn().mockResolvedValue({});
    const listComments = vi.fn().mockResolvedValue([
      { id: 99, body: `${COMMENT_MARKER}\nold results`, user: { type: "User" } },
    ]);
    const octokit = makeMockOctokit({ listComments, createComment, updateComment });

    await reportResults(makeReportContext(octokit, [makeClassified("test")], [makeResult("tp-0", true)]));

    expect(updateComment).not.toHaveBeenCalled();
    expect(createComment).toHaveBeenCalledOnce();
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

    // Errors in comment posting are caught so BullMQ does not retry the whole job
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

// ---------------------------------------------------------------------------
// Array.isArray guards — defensive formatting with malformed evidence (L9)
// ---------------------------------------------------------------------------

describe("formatEvidence — defensive type guards", () => {
  it("shell: does not crash when commands is not an array", () => {
    const item: ReportItem = {
      classified: makeClassified("build", { executorType: "shell" }),
      result: makeResult("tp-0", false, { commands: "npm run build" as unknown as string[], exitCode: 1 }),
      verdict: "failed",
    };
    expect(() => formatEvidence(item)).not.toThrow();
    const text = formatEvidence(item);
    // commands guard: string is not an array → falls through, exit code still shown
    expect(text).toContain("Exit code");
  });

  it("shell: does not crash when commands is a number", () => {
    const item: ReportItem = {
      classified: makeClassified("build", { executorType: "shell" }),
      result: makeResult("tp-0", false, { commands: 42 as unknown as string[], exitCode: 0 }),
      verdict: "failed",
    };
    expect(() => formatEvidence(item)).not.toThrow();
  });

  it("api: returns error string when requests is not an array", () => {
    const item: ReportItem = {
      classified: makeClassified("api test", { executorType: "api", category: "api" }),
      result: makeResult("tp-0", false, { requests: { some: "object" } as unknown as Array<Record<string, unknown>>, error: "timeout" }),
      verdict: "failed",
    };
    expect(() => formatEvidence(item)).not.toThrow();
    const text = formatEvidence(item);
    expect(text).toContain("timeout");
  });

  it("api: returns no evidence when requests is missing entirely", () => {
    const item: ReportItem = {
      classified: makeClassified("api test", { executorType: "api", category: "api" }),
      result: makeResult("tp-0", false, {}),
      verdict: "failed",
    };
    expect(() => formatEvidence(item)).not.toThrow();
    const text = formatEvidence(item);
    expect(text).toBe("No evidence captured.");
  });

  it("browser: does not crash when actions is not an array", () => {
    const item: ReportItem = {
      classified: makeClassified("ui test", { executorType: "browser", category: "ui-flow" }),
      result: makeResult("tp-0", false, { actions: "click button" as unknown as Array<Record<string, unknown>>, consoleErrors: [] }),
      verdict: "failed",
    };
    expect(() => formatEvidence(item)).not.toThrow();
  });

  it("browser: does not crash when consoleErrors is not an array", () => {
    const item: ReportItem = {
      classified: makeClassified("ui test", { executorType: "browser", category: "ui-flow" }),
      result: makeResult("tp-0", false, { actions: [], consoleErrors: "error string" as unknown as string[] }),
      verdict: "failed",
    };
    expect(() => formatEvidence(item)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// truncateToBytes — byte-aware truncation (L8)
// ---------------------------------------------------------------------------

describe("truncateToBytes", () => {
  it("returns the string unchanged when within byte limit", () => {
    expect(truncateToBytes("hello", 100)).toBe("hello");
  });

  it("truncates ASCII string to byte limit with suffix", () => {
    const result = truncateToBytes("a".repeat(100), 50, "...");
    expect(Buffer.byteLength(result, "utf8")).toBeLessThanOrEqual(50);
    expect(result).toContain("...");
  });

  it("handles multi-byte emoji correctly — does not exceed byte limit", () => {
    // Each emoji is 4 bytes in UTF-8
    const str = "🔥".repeat(20); // 80 bytes
    const result = truncateToBytes(str, 40, "...");
    expect(Buffer.byteLength(result, "utf8")).toBeLessThanOrEqual(40);
  });

  it("does not produce replacement characters from split codepoints", () => {
    // Create a string where naive byte-slicing would split a multi-byte char
    const str = "hello" + "ñ".repeat(10) + "world"; // ñ is 2 bytes
    const result = truncateToBytes(str, 8, "");
    expect(result).not.toContain("\uFFFD");
  });

  it("returns string as-is when empty suffix and within limit", () => {
    expect(truncateToBytes("abc", 10, "")).toBe("abc");
  });

  it("buildCommentBody byte count stays within 60,000 bytes with emoji content", () => {
    // Items with emoji in text — each emoji = 4 bytes
    const items: ReportItem[] = Array.from({ length: 20 }, (_, i) => ({
      classified: makeClassified(`🔥 test item ${"🚀".repeat(50)} ${i}`, { id: `tp-${i}`, executorType: "shell" }),
      result: makeResult(`tp-${i}`, false, { stdout: "🎯".repeat(500), exitCode: 1, commands: ["test"] }),
      verdict: "failed" as const,
    }));
    const summary: ReportSummary = { total: 20, passed: 0, failed: 20, skipped: 0, needsReview: 0 };
    const body = buildCommentBody(items, summary);
    expect(Buffer.byteLength(body, "utf8")).toBeLessThanOrEqual(60_000);
  });

  it("buildCheckRunText byte count stays within 60,000 bytes with emoji content", () => {
    const items: ReportItem[] = Array.from({ length: 30 }, (_, i) => ({
      classified: makeClassified(`🔥 item ${i}`, { id: `tp-${i}`, confidence: "HIGH" as const, executorType: "api" as const }),
      result: makeResult(`tp-${i}`, false, { data: "🎯".repeat(1000) }),
      verdict: "failed" as const,
    }));
    const text = buildCheckRunText(items);
    expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(60_000);
  });
});

// ---------------------------------------------------------------------------
// Signal helpers for score-based tests
// ---------------------------------------------------------------------------

function makeSignal(id: Signal["id"], name: string, score: number, passed: boolean, details: Signal["details"] = []): Signal {
  return createSignal({ id, name, score, passed, details });
}

function makeConfidenceScore(overrides: Partial<ConfidenceScore> = {}): ConfidenceScore {
  return {
    score: 85,
    recommendation: "safe",
    signals: [
      makeSignal("ci-bridge", "CI Bridge", 100, true, [
        { label: "npm run build", status: "pass" },
        { label: "npm test", status: "pass" },
      ]),
      makeSignal("credential-scan", "Credential Scan", 100, true, []),
      makeSignal("executor", "Test Plan Executor", 60, true, [
        { label: "tp-0", status: "pass" },
        { label: "tp-1", status: "fail" },
      ]),
    ],
    skippedSignals: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// conclusionFromScore
// ---------------------------------------------------------------------------

describe("conclusionFromScore", () => {
  it("returns success for safe recommendation", () => {
    expect(conclusionFromScore(makeConfidenceScore({ recommendation: "safe" }))).toBe("success");
  });

  it("returns neutral for review recommendation", () => {
    expect(conclusionFromScore(makeConfidenceScore({ recommendation: "review" }))).toBe("neutral");
  });

  it("returns failure for caution recommendation", () => {
    expect(conclusionFromScore(makeConfidenceScore({ recommendation: "caution" }))).toBe("failure");
  });
});

// ---------------------------------------------------------------------------
// buildCheckRunTitle with confidenceScore
// ---------------------------------------------------------------------------

describe("buildCheckRunTitle — score-based", () => {
  it("returns confidence title when score is provided", () => {
    const score = makeConfidenceScore({ score: 82, recommendation: "safe" });
    const title = buildCheckRunTitle({ total: 3, passed: 2, failed: 1, skipped: 0, needsReview: 0 }, score);
    expect(title).toBe("Confidence: 82/100 — safe");
  });

  it("falls back to v1 title when score is undefined", () => {
    const title = buildCheckRunTitle({ total: 3, passed: 3, failed: 0, skipped: 0, needsReview: 0 });
    expect(title).toBe("All 3 items verified successfully");
  });
});

// ---------------------------------------------------------------------------
// buildCheckRunSummary with confidenceScore
// ---------------------------------------------------------------------------

describe("buildCheckRunSummary — score-based", () => {
  it("includes signal breakdown table when score is provided", () => {
    const score = makeConfidenceScore();
    const summary: ReportSummary = { total: 3, passed: 2, failed: 1, skipped: 0, needsReview: 0 };
    const md = buildCheckRunSummary(summary, "success", undefined, undefined, score);
    expect(md).toContain("Vigil Confidence Score: 85/100");
    expect(md).toContain("CI Bridge");
    expect(md).toContain("Credential Scan");
    expect(md).toContain("Test Plan Executor");
    // Should also contain the v1 test plan results table
    expect(md).toContain("Vigil Test Plan Results");
  });

  it("does not include signal table when score is undefined", () => {
    const summary: ReportSummary = { total: 3, passed: 3, failed: 0, skipped: 0, needsReview: 0 };
    const md = buildCheckRunSummary(summary, "success");
    expect(md).not.toContain("Confidence Score");
    expect(md).toContain("Vigil Test Plan Results");
  });
});

// ---------------------------------------------------------------------------
// buildCommentBody with confidenceScore
// ---------------------------------------------------------------------------

describe("buildCommentBody — score-based format", () => {
  const items: ReportItem[] = [
    {
      classified: makeClassified("build passes", { id: "tp-0" }),
      result: makeResult("tp-0", true),
      verdict: "passed",
    },
    {
      classified: makeClassified("lint passes", { id: "tp-1" }),
      result: makeResult("tp-1", false, { exitCode: 1 }),
      verdict: "failed",
    },
  ];
  const summary: ReportSummary = { total: 2, passed: 1, failed: 1, skipped: 0, needsReview: 0 };

  it("renders score-based format when confidenceScore is provided", () => {
    const score = makeConfidenceScore({ score: 82, recommendation: "safe" });
    const body = buildCommentBody(items, summary, undefined, undefined, undefined, undefined, undefined, score);

    expect(body).toContain(COMMENT_MARKER);
    expect(body).toContain("Vigil Confidence Score: 82/100");
    expect(body).toContain("Safe to merge");
    expect(body).toContain("| Signal | Score | Status |");
    expect(body).toContain("CI Bridge");
    expect(body).toContain("100/100");
    expect(body).toContain("<details>");
    expect(body).toContain("Test plan results");
  });

  it("renders review recommendation with warning emoji", () => {
    const score = makeConfidenceScore({ score: 65, recommendation: "review" });
    const body = buildCommentBody(items, summary, undefined, undefined, undefined, undefined, undefined, score);

    expect(body).toContain("Review recommended");
    expect(body).toContain("\u26A0\uFE0F");
  });

  it("renders caution recommendation with red circle emoji", () => {
    const score = makeConfidenceScore({ score: 30, recommendation: "caution" });
    const body = buildCommentBody(items, summary, undefined, undefined, undefined, undefined, undefined, score);

    expect(body).toContain("Merge with caution");
  });

  it("preserves v1 format when confidenceScore is undefined", () => {
    const body = buildCommentBody(items, summary);

    expect(body).toContain(COMMENT_MARKER);
    expect(body).toContain("Vigil Test Plan Results");
    expect(body).not.toContain("Confidence Score");
    expect(body).not.toContain("Signal");
  });

  it("includes retry banner in score-based format", () => {
    const score = makeConfidenceScore();
    const body = buildCommentBody(items, summary, undefined, undefined, undefined, undefined, ["tp-1"], score);

    expect(body).toContain("_(retry)_");
    expect(body).toContain("re-ran tp-1");
  });

  it("includes pipeline error in score-based format", () => {
    const score = makeConfidenceScore();
    const body = buildCommentBody(items, summary, "Clone failed", undefined, undefined, undefined, undefined, score);

    expect(body).toContain("Clone failed");
  });

  it("includes config block in score-based format", () => {
    const score = makeConfidenceScore();
    const config = { timeouts: { shell: 30 } };
    const body = buildCommentBody(items, summary, undefined, undefined, config, undefined, undefined, score);

    expect(body).toContain("Config applied");
    expect(body).toContain("Shell timeout");
  });

  it("includes correlation ID in footer", () => {
    const score = makeConfidenceScore();
    const body = buildCommentBody(items, summary, undefined, "abc-123", undefined, undefined, undefined, score);

    expect(body).toContain("abc-123");
  });

  it("signal status summary shows pass/fail/warn counts", () => {
    const score = makeConfidenceScore({
      signals: [
        makeSignal("ci-bridge", "CI Bridge", 100, true, [
          { label: "build", status: "pass" },
          { label: "test", status: "pass" },
          { label: "lint", status: "pass" },
        ]),
        makeSignal("credential-scan", "Credentials", 100, true, []),
        makeSignal("executor", "Executor", 50, false, [
          { label: "tp-0", status: "pass" },
          { label: "tp-1", status: "fail" },
          { label: "tp-2", status: "warn" },
        ]),
      ],
    });
    const body = buildCommentBody(items, summary, undefined, undefined, undefined, undefined, undefined, score);

    expect(body).toContain("3 passed");
    expect(body).toContain("1 failed");
    expect(body).toContain("1 warning");
  });

  it("stays within 60KB byte limit with score format", () => {
    const bigItems: ReportItem[] = Array.from({ length: 20 }, (_, i) => ({
      classified: makeClassified(`test item ${"x".repeat(50)} ${i}`, { id: `tp-${i}` }),
      result: makeResult(`tp-${i}`, false, { stdout: "a".repeat(500), exitCode: 1, commands: ["test"] }),
      verdict: "failed" as const,
    }));
    const bigSummary: ReportSummary = { total: 20, passed: 0, failed: 20, skipped: 0, needsReview: 0 };
    const score = makeConfidenceScore();
    const body = buildCommentBody(bigItems, bigSummary, undefined, undefined, undefined, undefined, undefined, score);
    expect(Buffer.byteLength(body, "utf8")).toBeLessThanOrEqual(60_000);
  });
});

// ---------------------------------------------------------------------------
// reportResults — score-based integration
// ---------------------------------------------------------------------------

describe("reportResults — score-based paths", () => {
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

  it("uses conclusionFromScore when signals are provided", async () => {
    const updateFn = vi.fn().mockResolvedValue({});
    const createComment = vi.fn().mockResolvedValue({});
    const listComments = vi.fn().mockResolvedValue([]);
    const octokit = makeMockOctokit({ updateCheckRun: updateFn, listComments, createComment });

    const classified = [makeClassified("build passes", { id: "tp-0" })];
    const results = [makeResult("tp-0", true)];
    const signals: Signal[] = [
      makeSignal("ci-bridge", "CI Bridge", 100, true),
      makeSignal("credential-scan", "Credentials", 100, true),
    ];

    await reportResults({
      octokit,
      owner: "owner",
      repo: "repo",
      pullNumber: 7,
      headSha: "abc123",
      checkRunId: 42,
      classifiedItems: classified,
      executionResults: results,
      signals,
    });

    const checkCall = updateFn.mock.calls[0][0];
    // Score is high enough → "safe" → "success"
    expect(checkCall.conclusion).toBe("success");
    // confidenceScore should be passed through
    expect(checkCall.output.title).toContain("Confidence:");

    // Comment should contain score-based format
    const commentBody = createComment.mock.calls[0][0].body;
    expect(commentBody).toContain("Confidence Score");
  });

  it("uses determineConclusion when no signals are provided", async () => {
    const updateFn = vi.fn().mockResolvedValue({});
    const createComment = vi.fn().mockResolvedValue({});
    const listComments = vi.fn().mockResolvedValue([]);
    const octokit = makeMockOctokit({ updateCheckRun: updateFn, listComments, createComment });

    const classified = [makeClassified("build passes", { id: "tp-0" })];
    const results = [makeResult("tp-0", true)];

    await reportResults({
      octokit,
      owner: "owner",
      repo: "repo",
      pullNumber: 7,
      headSha: "abc123",
      checkRunId: 42,
      classifiedItems: classified,
      executionResults: results,
      // no signals
    });

    const checkCall = updateFn.mock.calls[0][0];
    expect(checkCall.conclusion).toBe("success");
    expect(checkCall.output.title).not.toContain("Confidence:");

    const commentBody = createComment.mock.calls[0][0].body;
    expect(commentBody).toContain("Vigil Test Plan Results");
    expect(commentBody).not.toContain("Confidence Score");
  });

  it("uses determineConclusion when signals array is empty", async () => {
    const updateFn = vi.fn().mockResolvedValue({});
    const createComment = vi.fn().mockResolvedValue({});
    const listComments = vi.fn().mockResolvedValue([]);
    const octokit = makeMockOctokit({ updateCheckRun: updateFn, listComments, createComment });

    const classified = [makeClassified("build passes", { id: "tp-0" })];
    const results = [makeResult("tp-0", true)];

    await reportResults({
      octokit,
      owner: "owner",
      repo: "repo",
      pullNumber: 7,
      headSha: "abc123",
      checkRunId: 42,
      classifiedItems: classified,
      executionResults: results,
      signals: [],
    });

    const checkCall = updateFn.mock.calls[0][0];
    expect(checkCall.conclusion).toBe("success");
    expect(checkCall.output.title).not.toContain("Confidence:");
  });
});
