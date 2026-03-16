import { describe, it, expect } from "vitest";
import { buildExecutorSignal } from "../services/executor-adapter.js";
import type { ClassifiedItem, ExecutionResult, ConfidenceTier } from "@vigil/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClassified(
  id: string,
  text: string,
  confidence: ConfidenceTier = "DETERMINISTIC",
  executorType: ClassifiedItem["executorType"] = "shell",
): ClassifiedItem {
  return {
    item: { id, text, checked: false, raw: text, indent: 0, hints: { isManual: false, codeBlocks: [], urls: [] } },
    confidence,
    executorType,
    category: "build",
    reasoning: "test",
  };
}

function makeResult(itemId: string, passed: boolean, evidence: Record<string, unknown> = {}): ExecutionResult {
  return { itemId, passed, duration: 100, evidence };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildExecutorSignal", () => {
  it("all items passed → score 100, passed true", () => {
    const items = [makeClassified("tp-0", "npm run build"), makeClassified("tp-1", "npm test")];
    const results = [makeResult("tp-0", true), makeResult("tp-1", true)];

    const signal = buildExecutorSignal(items, results);
    expect(signal.score).toBe(100);
    expect(signal.passed).toBe(true);
    expect(signal.details).toHaveLength(2);
    expect(signal.details.every((d) => d.status === "pass")).toBe(true);
  });

  it("DETERMINISTIC item failed → passed false", () => {
    const items = [makeClassified("tp-0", "npm run build", "DETERMINISTIC")];
    const results = [makeResult("tp-0", false, { error: "Build failed" })];

    const signal = buildExecutorSignal(items, results);
    expect(signal.passed).toBe(false);
    expect(signal.score).toBe(0);
    expect(signal.details[0].status).toBe("fail");
    expect(signal.details[0].message).toContain("Build failed");
  });

  it("HIGH item failed → passed false", () => {
    const items = [makeClassified("tp-0", "GET /api/health", "HIGH", "api")];
    const results = [makeResult("tp-0", false)];

    const signal = buildExecutorSignal(items, results);
    expect(signal.passed).toBe(false);
  });

  it("MEDIUM item failed → passed true (non-blocking)", () => {
    const items = [makeClassified("tp-0", "Visual check", "MEDIUM", "browser")];
    const results = [makeResult("tp-0", false)];

    const signal = buildExecutorSignal(items, results);
    expect(signal.passed).toBe(true);
    expect(signal.score).toBe(0);
  });

  it("LOW item failed → passed true (non-blocking)", () => {
    const items = [makeClassified("tp-0", "Some check", "LOW", "none")];
    const results = [makeResult("tp-0", false)];

    // LOW + none executor → skipped (executorType: "none")
    const signal = buildExecutorSignal(items, results);
    expect(signal.passed).toBe(true);
    expect(signal.score).toBe(100); // Skipped → not counted
  });

  it("skipped items excluded from score", () => {
    const items = [
      makeClassified("tp-0", "npm run build"),
      makeClassified("tp-1", "Manual check", "SKIP", "none"),
    ];
    const results = [
      makeResult("tp-0", true),
      makeResult("tp-1", true, { skipped: true, reason: "Manual" }),
    ];

    const signal = buildExecutorSignal(items, results);
    expect(signal.score).toBe(100);
    expect(signal.details).toHaveLength(1); // Only tp-0 counted
  });

  it("retried items with notRetried flag excluded", () => {
    const items = [makeClassified("tp-0", "npm run build"), makeClassified("tp-1", "npm test")];
    const results = [
      makeResult("tp-0", true),
      makeResult("tp-1", true, { skipped: true, notRetried: true }),
    ];

    const signal = buildExecutorSignal(items, results);
    expect(signal.details).toHaveLength(1);
  });

  it("empty items → score 100, passed true", () => {
    const signal = buildExecutorSignal([], []);
    expect(signal.score).toBe(100);
    expect(signal.passed).toBe(true);
  });

  it("all items skipped → score 100, passed true", () => {
    const items = [makeClassified("tp-0", "Manual", "SKIP", "none")];
    const results = [makeResult("tp-0", true, { skipped: true })];

    const signal = buildExecutorSignal(items, results);
    expect(signal.score).toBe(100);
    expect(signal.passed).toBe(true);
  });

  it("mixed: 2 pass, 1 fail (blocking) → correct score and passed false", () => {
    const items = [
      makeClassified("tp-0", "build", "DETERMINISTIC"),
      makeClassified("tp-1", "test", "DETERMINISTIC"),
      makeClassified("tp-2", "lint", "DETERMINISTIC"),
    ];
    const results = [
      makeResult("tp-0", true),
      makeResult("tp-1", false, { error: "tests failed" }),
      makeResult("tp-2", true),
    ];

    const signal = buildExecutorSignal(items, results);
    expect(signal.score).toBe(67); // 2/3 = 66.67 → 67
    expect(signal.passed).toBe(false);
    expect(signal.details).toHaveLength(3);
  });

  it("mixed: blocking pass + non-blocking fail → passed true", () => {
    const items = [
      makeClassified("tp-0", "build", "DETERMINISTIC"),
      makeClassified("tp-1", "visual", "MEDIUM", "browser"),
    ];
    const results = [makeResult("tp-0", true), makeResult("tp-1", false)];

    const signal = buildExecutorSignal(items, results);
    expect(signal.passed).toBe(true); // No blocking failures
    expect(signal.score).toBe(50); // 1/2
  });

  describe("signal metadata", () => {
    it("has correct id", () => {
      expect(buildExecutorSignal([], []).id).toBe("executor");
    });

    it("has correct name", () => {
      expect(buildExecutorSignal([], []).name).toBe("Test Execution");
    });

    it("does not require LLM", () => {
      expect(buildExecutorSignal([], []).requiresLLM).toBe(false);
    });

    it("has weight 20", () => {
      expect(buildExecutorSignal([], []).weight).toBe(20);
    });
  });
});
