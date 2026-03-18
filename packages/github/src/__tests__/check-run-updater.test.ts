import { describe, it, expect } from "vitest";
import type {
  ClassifiedItem,
  ExecutionResult,
  TestPlanItem,
  TestPlanHints,
  ConfidenceTier,
  ExecutorType,
  CategoryLabel,
  ConfidenceScore,
} from "@vigil/core";
import type { ReportItem, ReportSummary } from "../services/reporter.js";
import {
  determineConclusion,
  conclusionFromScore,
  buildCheckRunTitle,
  buildCheckRunSummary,
  buildCheckRunText,
  truncateToBytes,
} from "../services/check-run-updater.js";

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

function makeReportItem(
  text: string,
  verdict: ReportItem["verdict"],
  overrides: {
    id?: string;
    confidence?: ConfidenceTier;
    executorType?: ExecutorType;
    passed?: boolean;
    hasResult?: boolean;
  } = {},
): ReportItem {
  const { id = "tp-0", confidence = "DETERMINISTIC", executorType = "shell", passed = true, hasResult = true } = overrides;
  return {
    classified: makeClassified(text, { id, confidence, executorType }),
    result: hasResult ? makeResult(id, passed) : null,
    verdict,
  };
}

function makeSummary(overrides: Partial<ReportSummary> = {}): ReportSummary {
  return { total: 0, passed: 0, failed: 0, skipped: 0, needsReview: 0, ...overrides };
}

// ---------------------------------------------------------------------------
// determineConclusion
// ---------------------------------------------------------------------------

describe("determineConclusion", () => {
  it("returns neutral for empty items", () => {
    expect(determineConclusion([])).toBe("neutral");
  });

  it("returns neutral when all items are SKIP", () => {
    const items: ReportItem[] = [
      makeReportItem("manual check", "skipped", { confidence: "SKIP" as ConfidenceTier, hasResult: false }),
    ];
    expect(determineConclusion(items)).toBe("neutral");
  });

  it("returns neutral when all items are infra-skipped", () => {
    const items: ReportItem[] = [
      makeReportItem("skipped item", "infra-skipped", { confidence: "DETERMINISTIC" }),
    ];
    expect(determineConclusion(items)).toBe("neutral");
  });

  it("returns success when all executed items pass", () => {
    const items: ReportItem[] = [
      makeReportItem("build passes", "passed", { confidence: "DETERMINISTIC" }),
      makeReportItem("tests pass", "passed", { confidence: "HIGH" }),
    ];
    expect(determineConclusion(items)).toBe("success");
  });

  it("returns failure when a DETERMINISTIC item fails", () => {
    const items: ReportItem[] = [
      makeReportItem("build passes", "failed", { confidence: "DETERMINISTIC", passed: false }),
    ];
    expect(determineConclusion(items)).toBe("failure");
  });

  it("returns failure when a HIGH confidence item errors", () => {
    const items: ReportItem[] = [
      makeReportItem("lint passes", "error", { confidence: "HIGH", passed: false }),
    ];
    expect(determineConclusion(items)).toBe("failure");
  });

  it("returns neutral when a MEDIUM item fails (non-blocking)", () => {
    const items: ReportItem[] = [
      makeReportItem("coverage check", "failed", { confidence: "MEDIUM", passed: false }),
    ];
    expect(determineConclusion(items)).toBe("neutral");
  });

  it("returns neutral when a LOW item errors (non-blocking)", () => {
    const items: ReportItem[] = [
      makeReportItem("optional check", "error", { confidence: "LOW", passed: false }),
    ];
    expect(determineConclusion(items)).toBe("neutral");
  });

  it("returns success when blocking items pass even if SKIP items exist", () => {
    const items: ReportItem[] = [
      makeReportItem("build passes", "passed", { id: "tp-1", confidence: "DETERMINISTIC" }),
      makeReportItem("manual check", "skipped", { id: "tp-2", confidence: "SKIP" as ConfidenceTier, hasResult: false }),
    ];
    expect(determineConclusion(items)).toBe("success");
  });

  it("returns failure even if some MEDIUM items pass when a DETERMINISTIC item fails", () => {
    const items: ReportItem[] = [
      makeReportItem("build", "failed", { id: "tp-1", confidence: "DETERMINISTIC", passed: false }),
      makeReportItem("optional", "passed", { id: "tp-2", confidence: "MEDIUM" }),
    ];
    expect(determineConclusion(items)).toBe("failure");
  });
});

// ---------------------------------------------------------------------------
// conclusionFromScore
// ---------------------------------------------------------------------------

describe("conclusionFromScore", () => {
  it("maps safe to success", () => {
    const score = { score: 90, recommendation: "safe", signals: [] } as unknown as ConfidenceScore;
    expect(conclusionFromScore(score)).toBe("success");
  });

  it("maps review to neutral", () => {
    const score = { score: 60, recommendation: "review", signals: [] } as unknown as ConfidenceScore;
    expect(conclusionFromScore(score)).toBe("neutral");
  });

  it("maps block to failure", () => {
    const score = { score: 30, recommendation: "block", signals: [] } as unknown as ConfidenceScore;
    expect(conclusionFromScore(score)).toBe("failure");
  });
});

// ---------------------------------------------------------------------------
// buildCheckRunTitle
// ---------------------------------------------------------------------------

describe("buildCheckRunTitle", () => {
  it("returns confidence score title when confidenceScore is provided", () => {
    const score = { score: 85, recommendation: "safe", signals: [] } as unknown as ConfidenceScore;
    expect(buildCheckRunTitle(makeSummary(), score)).toBe("Confidence: 85/100 — safe");
  });

  it("returns 'No test plan items found' when total is 0", () => {
    expect(buildCheckRunTitle(makeSummary({ total: 0 }))).toBe("No test plan items found");
  });

  it("returns 'No verifiable items found' when all items are skipped", () => {
    expect(buildCheckRunTitle(makeSummary({ total: 3, skipped: 3 }))).toBe("No verifiable items found");
  });

  it("returns all-passed message when no failures or reviews", () => {
    expect(buildCheckRunTitle(makeSummary({ total: 5, passed: 5 }))).toBe("All 5 items verified successfully");
  });

  it("builds composite title with mixed results", () => {
    const title = buildCheckRunTitle(makeSummary({ total: 6, passed: 3, failed: 2, needsReview: 1 }));
    expect(title).toBe("3 passed, 2 failed, 1 need review");
  });

  it("shows only failed when no passed or review", () => {
    const title = buildCheckRunTitle(makeSummary({ total: 2, failed: 2 }));
    expect(title).toBe("2 failed");
  });
});

// ---------------------------------------------------------------------------
// buildCheckRunSummary
// ---------------------------------------------------------------------------

describe("buildCheckRunSummary", () => {
  it("includes summary table with correct counts", () => {
    const summary = makeSummary({ total: 4, passed: 3, failed: 1 });
    const md = buildCheckRunSummary(summary, "failure");
    expect(md).toContain("| Passed | 3 |");
    expect(md).toContain("| Failed | 1 |");
    expect(md).toContain("| **Total** | **4** |");
  });

  it("includes conclusion explanation for success", () => {
    const md = buildCheckRunSummary(makeSummary({ total: 2, passed: 2 }), "success");
    expect(md).toContain("All high-confidence items passed verification.");
  });

  it("includes pipeline error note when provided", () => {
    const md = buildCheckRunSummary(makeSummary(), "neutral", "Something broke");
    expect(md).toContain("> **Note:** Something broke");
  });

  it("includes correlation ID when provided", () => {
    const md = buildCheckRunSummary(makeSummary(), "neutral", undefined, "abc-123");
    expect(md).toContain("<sub>Run ID: abc-123</sub>");
  });

  it("includes confidence score table when provided", () => {
    const score: ConfidenceScore = {
      score: 75,
      recommendation: "review",
      signals: [
        { name: "ci-bridge", score: 80, weight: 25, passed: true, details: {} },
      ],
    } as ConfidenceScore;
    const md = buildCheckRunSummary(makeSummary({ total: 1, passed: 1 }), "neutral", undefined, undefined, score);
    expect(md).toContain("## Vigil Confidence Score: 75/100");
    expect(md).toContain("| ci-bridge | 80/100 | 25 | Yes |");
  });

  it("uses score-based explanation when confidenceScore is provided", () => {
    const score = { score: 90, recommendation: "safe", signals: [] } as unknown as ConfidenceScore;
    const md = buildCheckRunSummary(makeSummary(), "success", undefined, undefined, score);
    expect(md).toContain("Score-based signals indicate this PR is safe to merge.");
  });
});

// ---------------------------------------------------------------------------
// truncateToBytes
// ---------------------------------------------------------------------------

describe("truncateToBytes", () => {
  it("returns original string when within byte limit", () => {
    expect(truncateToBytes("hello", 100)).toBe("hello");
  });

  it("truncates ASCII string to byte limit", () => {
    const str = "a".repeat(200);
    const result = truncateToBytes(str, 100, "...");
    expect(Buffer.byteLength(result, "utf8")).toBeLessThanOrEqual(100);
    expect(result.endsWith("...")).toBe(true);
  });

  it("handles multi-byte characters without splitting codepoints", () => {
    // Each emoji is 4 bytes in UTF-8
    const str = "Hello 🔥🔥🔥🔥🔥";
    const result = truncateToBytes(str, 15, "...");
    expect(Buffer.byteLength(result, "utf8")).toBeLessThanOrEqual(15);
    // Should not contain replacement character U+FFFD
    expect(result).not.toContain("\uFFFD");
  });

  it("handles CJK characters correctly", () => {
    // Each CJK char is 3 bytes
    const str = "漢字漢字漢字漢字";
    const result = truncateToBytes(str, 10, "!");
    expect(Buffer.byteLength(result, "utf8")).toBeLessThanOrEqual(10);
    expect(result).not.toContain("\uFFFD");
    expect(result.endsWith("!")).toBe(true);
  });

  it("returns safe suffix slice when suffix alone exceeds maxBytes", () => {
    const result = truncateToBytes("anything", 3, "long suffix here");
    expect(Buffer.byteLength(result, "utf8")).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// buildCheckRunText
// ---------------------------------------------------------------------------

describe("buildCheckRunText", () => {
  it("returns placeholder for empty items", () => {
    expect(buildCheckRunText([])).toBe("No test plan items to report.");
  });

  it("renders a results table with item details", () => {
    const items: ReportItem[] = [
      makeReportItem("build passes", "passed", { id: "tp-1", confidence: "DETERMINISTIC", executorType: "shell" }),
    ];
    const text = buildCheckRunText(items);
    expect(text).toContain("### Results by Item");
    expect(text).toContain("| 1 |");
    expect(text).toContain("build passes");
    expect(text).toContain("DETERMINISTIC");
    expect(text).toContain(":white_check_mark: Passed");
  });

  it("escapes pipe characters in item text", () => {
    const items: ReportItem[] = [
      makeReportItem("check a | b result", "passed", { id: "tp-1" }),
    ];
    const text = buildCheckRunText(items);
    expect(text).toContain("check a \\| b result");
  });

  it("includes evidence section for failed items", () => {
    const items: ReportItem[] = [
      makeReportItem("build fails", "failed", { id: "tp-1", confidence: "DETERMINISTIC", passed: false }),
    ];
    // Set evidence on the result
    items[0].result = makeResult("tp-1", false, { error: "exit code 1" });
    const text = buildCheckRunText(items);
    expect(text).toContain("### Evidence");
    expect(text).toContain("<details>");
    expect(text).toContain("exit code 1");
  });

  it("shows executor type or -- for none", () => {
    const items: ReportItem[] = [
      makeReportItem("manual item", "skipped", { id: "tp-1", confidence: "SKIP" as ConfidenceTier, executorType: "none", hasResult: false }),
    ];
    const text = buildCheckRunText(items);
    expect(text).toContain("| -- |");
  });

  it("formats duration correctly", () => {
    const items: ReportItem[] = [
      makeReportItem("fast check", "passed", { id: "tp-1" }),
    ];
    // Default result has duration 1234ms → "1.2s"
    const text = buildCheckRunText(items);
    expect(text).toContain("1.2s");
  });

  it("shows -- for duration when no result", () => {
    const items: ReportItem[] = [
      makeReportItem("skipped", "skipped", { id: "tp-1", confidence: "SKIP" as ConfidenceTier, hasResult: false }),
    ];
    const text = buildCheckRunText(items);
    // Duration column should have --
    expect(text).toMatch(/\| -- \|$/m);
  });
});
