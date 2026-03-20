import { describe, it, expect } from "vitest";
import type {
  TestPlanHints,
  TestPlanItem,
  ClassifiedItem,
  ExecutionResult,
  ConfidenceTier,
  ExecutorType,
  CategoryLabel,
  ConfidenceScore,
  Signal,
  VigilConfig,
} from "@vigil/core";
import {
  buildCommentBody,
  buildSummaryLine,
  buildResultsTable,
  buildEvidenceBlock,
  formatEvidence,
  buildConfigBlock,
  buildOnboardingTips,
  buildReviewSummary,
  COMMENT_MARKER,
} from "../services/comment-builder.js";
import type { ReportItem, ReportSummary } from "../services/reporter.js";

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
  return {
    item: makeItem(text, overrides.id ?? "tp-0"),
    confidence: overrides.confidence ?? "DETERMINISTIC",
    executorType: overrides.executorType ?? "shell",
    category: overrides.category ?? "build",
    reasoning: "test",
  };
}

function makeReportItem(
  text: string,
  verdict: "passed" | "failed" | "error" | "skipped" | "infra-skipped",
  overrides: {
    id?: string;
    confidence?: ConfidenceTier;
    executorType?: ExecutorType;
    evidence?: Record<string, unknown>;
    duration?: number;
  } = {},
): ReportItem {
  const id = overrides.id ?? "tp-0";
  const result: ExecutionResult | null =
    verdict === "skipped"
      ? null
      : {
          itemId: id,
          passed: verdict === "passed",
          duration: overrides.duration ?? 100,
          evidence: overrides.evidence ?? {},
        };
  return {
    classified: makeClassified(text, {
      id,
      confidence: overrides.confidence,
      executorType: overrides.executorType,
    }),
    result,
    verdict,
  };
}

function makeSummary(overrides: Partial<ReportSummary> = {}): ReportSummary {
  return {
    total: 3,
    passed: 2,
    failed: 1,
    skipped: 0,
    needsReview: 0,
    ...overrides,
  };
}

function makeSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: "ci-bridge",
    name: "CI Bridge",
    score: 100,
    weight: 25,
    passed: true,
    details: [],
    requiresLLM: false,
    ...overrides,
  } as Signal;
}

function makeConfidenceScore(overrides: Partial<ConfidenceScore> = {}): ConfidenceScore {
  return {
    score: 85,
    recommendation: "safe",
    signals: [
      makeSignal({ id: "ci-bridge", name: "CI Bridge", score: 100, weight: 25, passed: true }),
      makeSignal({ id: "credential-scan", name: "Credential Scan", score: 100, weight: 20, passed: true }),
    ],
    skippedSignals: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// COMMENT_MARKER
// ---------------------------------------------------------------------------

describe("COMMENT_MARKER", () => {
  it("is an HTML comment for idempotent comment detection", () => {
    expect(COMMENT_MARKER).toBe("<!-- vigil-results -->");
  });
});

// ---------------------------------------------------------------------------
// buildSummaryLine
// ---------------------------------------------------------------------------

describe("buildSummaryLine", () => {
  it("renders passed and failed counts", () => {
    const line = buildSummaryLine(makeSummary({ passed: 3, failed: 1, skipped: 0, needsReview: 0 }));
    expect(line).toContain("**3** passed");
    expect(line).toContain("**1** failed");
  });

  it("includes needs-review and skipped when present", () => {
    const line = buildSummaryLine(makeSummary({ passed: 1, failed: 0, skipped: 2, needsReview: 1 }));
    expect(line).toContain("**1** need review");
    expect(line).toContain("**2** skipped");
  });

  it("returns fallback text when all counts are zero", () => {
    const line = buildSummaryLine(makeSummary({ passed: 0, failed: 0, skipped: 0, needsReview: 0 }));
    expect(line).toBe("No test plan items found.");
  });

  it("omits zero-count categories", () => {
    const line = buildSummaryLine(makeSummary({ passed: 5, failed: 0, skipped: 0, needsReview: 0 }));
    expect(line).not.toContain("failed");
    expect(line).not.toContain("skipped");
  });
});

// ---------------------------------------------------------------------------
// buildResultsTable
// ---------------------------------------------------------------------------

describe("buildResultsTable", () => {
  it("renders a markdown table with header and rows", () => {
    const items = [
      makeReportItem("npm run build", "passed", { id: "tp-1" }),
      makeReportItem("API health check", "failed", { id: "tp-2" }),
    ];
    const table = buildResultsTable(items);
    expect(table).toContain("| # | Item | Confidence | Status |");
    expect(table).toContain("| 1 | npm run build");
    expect(table).toContain("| 2 | API health check");
    expect(table).toContain("Passed");
    expect(table).toContain("Failed");
  });

  it("escapes pipe characters in item text", () => {
    const items = [makeReportItem("check a | b", "passed")];
    const table = buildResultsTable(items);
    expect(table).toContain("check a \\| b");
  });

  it("truncates long item text", () => {
    const longText = "A".repeat(200);
    const items = [makeReportItem(longText, "passed")];
    const table = buildResultsTable(items);
    // Should be truncated (80 chars max)
    expect(table).toContain("...");
  });

  it("shows 'Human' status for skipped items", () => {
    const items = [makeReportItem("Manual check", "skipped")];
    const table = buildResultsTable(items);
    expect(table).toContain("Human");
  });

  it("shows 'Needs Review' for failed items with MEDIUM confidence", () => {
    const items = [makeReportItem("API test", "failed", { confidence: "MEDIUM" })];
    const table = buildResultsTable(items);
    expect(table).toContain("Needs Review");
  });

  it("shows 'Skipped' for infra-skipped items", () => {
    const items = [makeReportItem("Docker test", "infra-skipped", { evidence: { reason: "No Docker" } })];
    const table = buildResultsTable(items);
    expect(table).toContain("Skipped");
  });
});

// ---------------------------------------------------------------------------
// buildEvidenceBlock
// ---------------------------------------------------------------------------

describe("buildEvidenceBlock", () => {
  it("returns empty string for passed items", () => {
    const item = makeReportItem("ok", "passed");
    expect(buildEvidenceBlock(item)).toBe("");
  });

  it("returns empty string for skipped items", () => {
    const item = makeReportItem("manual", "skipped");
    expect(buildEvidenceBlock(item)).toBe("");
  });

  it("returns empty string for infra-skipped items", () => {
    const item = makeReportItem("docker", "infra-skipped");
    expect(buildEvidenceBlock(item)).toBe("");
  });

  it("returns a details block for failed items", () => {
    const item = makeReportItem("build fails", "failed", {
      evidence: { exitCode: 1, stdout: "Error: build failed" },
      executorType: "shell",
    });
    const block = buildEvidenceBlock(item);
    expect(block).toContain("<details>");
    expect(block).toContain("</details>");
    expect(block).toContain("build fails");
    expect(block).toContain("Executor");
  });

  it("returns a details block for error items", () => {
    const item = makeReportItem("broken", "error", {
      evidence: { error: "timeout" },
    });
    const block = buildEvidenceBlock(item);
    expect(block).toContain("<details>");
    expect(block).toContain(":x:");
  });

  it("includes needs-review items (failed + MEDIUM confidence)", () => {
    const item = makeReportItem("maybe ok", "failed", { confidence: "MEDIUM" });
    const block = buildEvidenceBlock(item);
    expect(block).toContain("<details>");
  });
});

// ---------------------------------------------------------------------------
// formatEvidence — by executor type
// ---------------------------------------------------------------------------

describe("formatEvidence", () => {
  it("formats shell evidence with commands, exit code, stdout", () => {
    const item = makeReportItem("build", "failed", {
      executorType: "shell",
      evidence: {
        commands: ["npm run build"],
        exitCode: 1,
        stdout: "Build failed",
        stderr: "Error in module",
      },
    });
    const ev = formatEvidence(item);
    expect(ev).toContain("`npm run build`");
    expect(ev).toContain("Exit code:** 1");
    expect(ev).toContain("Build failed");
    expect(ev).toContain("stderr");
  });

  it("formats API evidence with request details", () => {
    const item = makeReportItem("health", "failed", {
      executorType: "api",
      evidence: {
        requests: [
          { spec: { method: "GET", path: "/health" }, status: 500, passed: false, failReason: "Expected 200" },
        ],
      },
    });
    const ev = formatEvidence(item);
    expect(ev).toContain("`GET /health`");
    expect(ev).toContain("**500**");
    expect(ev).toContain("Expected 200");
  });

  it("formats API evidence with error when no requests", () => {
    const item = makeReportItem("api", "failed", {
      executorType: "api",
      evidence: { error: "Connection refused" },
    });
    const ev = formatEvidence(item);
    expect(ev).toContain("Connection refused");
  });

  it("formats browser evidence with actions", () => {
    const item = makeReportItem("login", "failed", {
      executorType: "browser",
      evidence: {
        actions: [
          { description: "Navigate to /login", passed: true },
          { description: "Click submit", passed: false, failReason: "Button not found" },
        ],
      },
    });
    const ev = formatEvidence(item);
    expect(ev).toContain("Navigate to /login");
    expect(ev).toContain("Button not found");
  });

  it("formats assertion evidence with file and reasoning", () => {
    const item = makeReportItem("schema", "failed", {
      executorType: "assertion",
      evidence: {
        file: "src/schema.ts",
        exists: true,
        verified: false,
        reasoning: "Missing required field",
      },
    });
    const ev = formatEvidence(item);
    expect(ev).toContain("`src/schema.ts`");
    expect(ev).toContain("Missing required field");
  });

  it("formats assertion evidence for missing file", () => {
    const item = makeReportItem("config", "failed", {
      executorType: "assertion",
      evidence: {
        file: "config.yml",
        exists: false,
        reason: "File not found in repo",
      },
    });
    const ev = formatEvidence(item);
    expect(ev).toContain("File not found");
  });

  it("formats unknown executor as generic JSON", () => {
    const item = makeReportItem("custom", "failed", {
      evidence: { foo: "bar" },
    });
    // Force an unknown executor type
    (item.classified as any).executorType = "unknown";
    const ev = formatEvidence(item);
    expect(ev).toContain("```json");
    expect(ev).toContain('"foo"');
  });

  it("returns empty string when no result", () => {
    const item = makeReportItem("test", "skipped");
    item.result = null;
    const ev = formatEvidence(item);
    expect(ev).toBe("");
  });
});

// ---------------------------------------------------------------------------
// buildConfigBlock
// ---------------------------------------------------------------------------

describe("buildConfigBlock", () => {
  it("returns empty string when no config and no warnings", () => {
    expect(buildConfigBlock()).toBe("");
    expect(buildConfigBlock(undefined, [])).toBe("");
  });

  it("renders config settings in a collapsible block", () => {
    const config: VigilConfig = {
      notifications: { urls: ["https://hooks.slack.com/x"], on: "always" },
    };
    const block = buildConfigBlock(config);
    expect(block).toContain("<details>");
    expect(block).toContain("Config applied");
    expect(block).toContain("1 webhook");
    expect(block).toContain("on: always");
  });

  it("renders auto-approve threshold", () => {
    const config: VigilConfig = {
      autoApprove: { threshold: 90 },
    };
    const block = buildConfigBlock(config);
    expect(block).toContain("Auto-approve");
    expect(block).toContain("score >= 90");
  });

  it("renders notification settings", () => {
    const config: VigilConfig = {
      notifications: { urls: ["https://hooks.slack.com/x"], on: "always" },
    };
    const block = buildConfigBlock(config);
    expect(block).toContain("1 webhook");
    expect(block).toContain("on: always");
  });

  it("renders warnings even without valid settings", () => {
    const block = buildConfigBlock(undefined, ["timeout.shell must be between 10-600"]);
    expect(block).toContain("Config warnings");
    expect(block).toContain("timeout.shell must be between 10-600");
    expect(block).toContain("no valid settings applied");
  });

  it("renders both settings and warnings together", () => {
    const config: VigilConfig = { autoApprove: { threshold: 95 } };
    const warnings = ["unknown field ignored"];
    const block = buildConfigBlock(config, warnings);
    expect(block).toContain("Config applied");
    expect(block).toContain("Auto-approve");
    expect(block).toContain("Config warnings");
    expect(block).toContain("unknown field ignored");
  });
});

// ---------------------------------------------------------------------------
// buildOnboardingTips
// ---------------------------------------------------------------------------

describe("buildOnboardingTips", () => {
  it("returns a collapsible block with tips", () => {
    const tips = buildOnboardingTips();
    expect(tips).toContain("<details>");
    expect(tips).toContain("first run detected");
    expect(tips).toContain("Existence");
    expect(tips).toContain("Logic");
    expect(tips).toContain("Contracts");
    expect(tips).toContain("Edge cases");
  });
});

// ---------------------------------------------------------------------------
// buildCommentBody — V1 (no confidence score)
// ---------------------------------------------------------------------------

describe("buildCommentBody (V1)", () => {
  it("includes the comment marker for idempotent updates", () => {
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary(),
    );
    expect(body).toContain(COMMENT_MARKER);
  });

  it("includes the title", () => {
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary(),
    );
    expect(body).toContain("## Vigil Test Plan Results");
  });

  it("includes retry marker and banner when retryItemIds provided", () => {
    const body = buildCommentBody(
      [makeReportItem("test", "passed", { id: "tp-1" })],
      makeSummary(),
      undefined,
      undefined,
      undefined,
      undefined,
      ["tp-1", "tp-3"],
    );
    expect(body).toContain("_(retry)_");
    expect(body).toContain("tp-1, tp-3");
  });

  it("includes pipeline error note when provided", () => {
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary(),
      "Something went wrong",
    );
    expect(body).toContain("Something went wrong");
  });

  it("includes correlation ID in footer", () => {
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary(),
      undefined,
      "abc-123",
    );
    expect(body).toContain("abc-123");
  });

  it("includes footer without correlation ID", () => {
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary(),
    );
    expect(body).toContain("Vigil v0.1.0");
    expect(body).toContain("keepvigil.dev");
  });
});

// ---------------------------------------------------------------------------
// buildCommentBody — Score-based (with confidence score)
// ---------------------------------------------------------------------------

describe("buildCommentBody (score-based)", () => {
  it("shows score in the title", () => {
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary({ passed: 1, failed: 0 }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      makeConfidenceScore({ score: 92 }),
    );
    expect(body).toContain("## Vigil Confidence Score: 92/100");
  });

  it("shows recommendation", () => {
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary({ passed: 1, failed: 0 }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      makeConfidenceScore({ recommendation: "safe" }),
    );
    expect(body).toContain("Recommendation:");
    expect(body).toContain("Safe to merge");
  });

  it("shows signal table", () => {
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary({ passed: 1, failed: 0 }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      makeConfidenceScore(),
    );
    expect(body).toContain("| Signal | Score | Status |");
    expect(body).toContain("CI Bridge");
    expect(body).toContain("100/100");
  });

  it("shows lock badge for gated signals", () => {
    const score = makeConfidenceScore({
      signals: [
        makeSignal({ id: "ci-bridge", name: "CI Bridge", score: 100, weight: 25, passed: true }),
        makeSignal({ id: "diff-analyzer", name: "Diff Analyzer", score: 0, weight: 0, passed: false, requiresLLM: true }),
      ],
    });
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary({ passed: 1, failed: 0 }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      score,
    );
    expect(body).toContain("Pro");
    expect(body).toContain("Diff Analyzer");
  });

  it("shows pro upsell when gated signals exist (not on retry)", () => {
    const score = makeConfidenceScore({
      signals: [
        makeSignal({ id: "diff-analyzer", name: "Diff Analyzer", score: 0, weight: 0, passed: false, requiresLLM: true }),
      ],
    });
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary({ passed: 1, failed: 0 }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      score,
    );
    expect(body).toContain("Unlock the full confidence score");
    expect(body).toContain("Upgrade to Pro");
  });

  it("suppresses pro upsell on retry", () => {
    const score = makeConfidenceScore({
      signals: [
        makeSignal({ id: "diff-analyzer", name: "Diff Analyzer", score: 0, weight: 0, passed: false, requiresLLM: true }),
      ],
    });
    const body = buildCommentBody(
      [makeReportItem("test", "passed", { id: "tp-1" })],
      makeSummary({ passed: 1, failed: 0 }),
      undefined,
      undefined,
      undefined,
      undefined,
      ["tp-1"],
      score,
    );
    expect(body).not.toContain("Unlock the full confidence score");
  });

  it("shows action items for failures", () => {
    const score = makeConfidenceScore({
      recommendation: "review",
      signals: [
        makeSignal({
          id: "credential-scan",
          name: "Credential Scan",
          score: 50,
          passed: false,
          details: [{ label: "env leak", status: "fail" as const, message: "Found API key in source" }],
        }),
      ],
    });
    const body = buildCommentBody(
      [makeReportItem("build", "failed", { id: "tp-1" })],
      makeSummary({ passed: 0, failed: 1 }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      score,
    );
    expect(body).toContain("Action Items");
    expect(body).toContain("Must Fix");
    expect(body).toContain("build");
  });

  it("shows assertion file summary", () => {
    const items = [
      makeReportItem("schema.ts has validation", "passed", {
        id: "tp-1",
        executorType: "assertion",
        evidence: { file: "src/schema.ts", verified: true },
      }),
      makeReportItem("config.ts exports default", "passed", {
        id: "tp-2",
        executorType: "assertion",
        evidence: { file: "src/config.ts", verified: true },
      }),
    ];
    // Add code blocks to hints so file names appear
    items[0].classified.item.hints.codeBlocks = ["src/schema.ts"];
    items[1].classified.item.hints.codeBlocks = ["src/config.ts"];

    const body = buildCommentBody(
      items,
      makeSummary({ passed: 2, failed: 0 }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      makeConfidenceScore(),
    );
    expect(body).toContain("2 files verified");
    expect(body).toContain("`schema.ts`");
    expect(body).toContain("`config.ts`");
  });

  it("wraps test plan results in a collapsible details block", () => {
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary({ passed: 1, failed: 0 }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      makeConfidenceScore(),
    );
    expect(body).toContain("<details>");
    expect(body).toContain("<summary>Test plan results</summary>");
    expect(body).toContain("</details>");
  });

  it("includes onboarding tips on first run", () => {
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary({ passed: 1, failed: 0 }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      makeConfidenceScore(),
      true, // isFirstRun
    );
    expect(body).toContain("first run detected");
  });

  it("does not include onboarding tips on subsequent runs", () => {
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary({ passed: 1, failed: 0 }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      makeConfidenceScore(),
      false,
    );
    expect(body).not.toContain("first run detected");
  });

  it("includes review recommendation with failed signal names", () => {
    const score = makeConfidenceScore({
      score: 55,
      recommendation: "caution",
      signals: [
        makeSignal({ id: "ci-bridge", name: "CI Bridge", score: 0, weight: 25, passed: false }),
        makeSignal({ id: "credential-scan", name: "Credential Scan", score: 100, weight: 20, passed: true }),
      ],
    });
    const body = buildCommentBody(
      [makeReportItem("test", "passed")],
      makeSummary({ passed: 1, failed: 0 }),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      score,
    );
    expect(body).toContain("caution");
    expect(body).toContain("CI Bridge");
  });
});

// ---------------------------------------------------------------------------
// buildReviewSummary — PR at a Glance
// ---------------------------------------------------------------------------

describe("buildReviewSummary", () => {
  const simpleDiff = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,5 @@
+import { foo } from "./foo";
+const bar = process.env.API_URL;
 export const app = "test";`;

  const newFileDiff = `diff --git a/src/new-file.ts b/src/new-file.ts
--- /dev/null
+++ b/src/new-file.ts
@@ -0,0 +1,3 @@
+export const hello = "world";
+export const foo = "bar";
+export const baz = "qux";`;

  it("returns empty string when no diff", () => {
    expect(buildReviewSummary([], undefined)).toBe("");
  });

  it("shows file count with new/modified breakdown", () => {
    const result = buildReviewSummary([], simpleDiff);
    expect(result).toContain("PR at a Glance");
    expect(result).toContain("1 file changed");
    expect(result).toContain("1 modified");
  });

  it("shows new file count", () => {
    const result = buildReviewSummary([], newFileDiff);
    expect(result).toContain("1 new");
  });

  it("shows categories from risk-score signal", () => {
    const signals = [
      makeSignal({
        id: "risk-score" as any,
        name: "Risk Assessment",
        details: [
          { label: "\uD83D\uDD34 HIGH: Touches authentication", status: "fail" as const, message: "Modifies auth files" },
          { label: "\uD83D\uDFE1 MEDIUM: Database schema changes", status: "warn" as const, message: "Modifies schema" },
        ],
      }),
    ];
    const result = buildReviewSummary(signals, simpleDiff);
    expect(result).toContain("authentication");
    expect(result).toContain("database");
  });

  it("shows new dependencies from risk-score signal", () => {
    const signals = [
      makeSignal({
        id: "risk-score" as any,
        name: "Risk Assessment",
        details: [
          { label: "\uD83D\uDFE1 MEDIUM: New dependencies", status: "warn" as const, message: "Added 2 new packages: ioredis, @types/ioredis" },
        ],
      }),
    ];
    const result = buildReviewSummary(signals, simpleDiff);
    expect(result).toContain("New deps:");
    expect(result).toContain("ioredis");
  });

  it("shows test coverage from coverage-mapper signal", () => {
    const signals = [
      makeSignal({
        id: "coverage-mapper" as any,
        name: "Coverage Mapper",
        details: [
          { label: "src/app.ts", status: "pass" as const, message: "Test file found" },
          { label: "src/utils.ts", status: "fail" as const, message: "No test file" },
          { label: "src/config.ts", status: "pass" as const, message: "Test file found" },
        ],
      }),
    ];
    const result = buildReviewSummary(signals, simpleDiff);
    expect(result).toContain("Test coverage: 2/3");
  });

  it("shows estimated review time", () => {
    const result = buildReviewSummary([], simpleDiff);
    expect(result).toContain("Estimated review time:");
    expect(result).toMatch(/~\d+ min/);
  });

  it("applies high risk multiplier to review time", () => {
    const signals = [
      makeSignal({
        id: "risk-score" as any,
        name: "Risk Assessment",
        details: [
          { label: "\uD83D\uDD34 HIGH: Touches authentication", status: "fail" as const, message: "Modifies auth files" },
        ],
      }),
    ];
    // Create a large diff to get meaningful review time
    const largeDiff = `diff --git a/src/big.ts b/src/big.ts
--- a/src/big.ts
+++ b/src/big.ts
@@ -1,1 +1,200 @@
${Array.from({ length: 200 }, (_, i) => `+const line${i} = ${i};`).join("\n")}`;
    const result = buildReviewSummary(signals, largeDiff);
    expect(result).toContain("Estimated review time:");
  });

  it("floors review time at 2 min", () => {
    const tinyDiff = `diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1 +1 @@
+# Updated`;
    const result = buildReviewSummary([], tinyDiff);
    expect(result).toContain("~2 min");
  });
});
