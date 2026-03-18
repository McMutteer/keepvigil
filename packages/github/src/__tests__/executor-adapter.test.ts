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
  // -----------------------------------------------------------------------
  // CI Bridge override
  // -----------------------------------------------------------------------
  describe("CI Bridge override", () => {
    it("overrides sandbox failure when CI verified the item", () => {
      const items = [makeClassified("tp-0", "npm run build", "DETERMINISTIC")];
      const results = [makeResult("tp-0", false, { error: "sandbox timeout" })];
      const ciVerified = new Set(["tp-0"]);

      const signal = buildExecutorSignal(items, results, ciVerified);
      expect(signal.passed).toBe(true);
      expect(signal.score).toBe(100);
      expect(signal.details[0].status).toBe("pass");
      expect(signal.details[0].message).toContain("CI verified");
    });

    it("does NOT override when CI did not verify the item", () => {
      const items = [makeClassified("tp-0", "npm run build", "DETERMINISTIC")];
      const results = [makeResult("tp-0", false, { error: "build failed" })];
      const ciVerified = new Set(["tp-999"]); // different item

      const signal = buildExecutorSignal(items, results, ciVerified);
      expect(signal.passed).toBe(false);
      expect(signal.score).toBe(0);
      expect(signal.details[0].status).toBe("fail");
    });

    it("CI override takes precedence — item counts as passed in score", () => {
      const items = [
        makeClassified("tp-0", "build", "DETERMINISTIC"),
        makeClassified("tp-1", "test", "DETERMINISTIC"),
      ];
      const results = [
        makeResult("tp-0", false, { error: "sandbox fail" }),
        makeResult("tp-1", true),
      ];
      const ciVerified = new Set(["tp-0"]);

      const signal = buildExecutorSignal(items, results, ciVerified);
      expect(signal.score).toBe(100); // both count as passed
      expect(signal.passed).toBe(true);
    });

    it("CI override prevents blocking even for DETERMINISTIC failures", () => {
      const items = [makeClassified("tp-0", "critical build", "DETERMINISTIC")];
      const results = [makeResult("tp-0", false)];
      const ciVerified = new Set(["tp-0"]);

      const signal = buildExecutorSignal(items, results, ciVerified);
      expect(signal.passed).toBe(true); // would be false without CI override
    });

    it("undefined ciVerifiedItemIds does not override anything", () => {
      const items = [makeClassified("tp-0", "npm run build", "DETERMINISTIC")];
      const results = [makeResult("tp-0", false)];

      const signal = buildExecutorSignal(items, results, undefined);
      expect(signal.passed).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Contract Checker override
  // -----------------------------------------------------------------------
  describe("Contract Checker override", () => {
    it("overrides assertion failure when file is contract-verified", () => {
      const items = [makeClassified("tp-0", "check exports", "HIGH", "assertion")];
      const results = [makeResult("tp-0", false, { file: "src/api/handler.ts" })];
      const contractFiles = new Set(["src/api/handler.ts"]);

      const signal = buildExecutorSignal(items, results, undefined, contractFiles);
      expect(signal.passed).toBe(true);
      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("Contract verified");
    });

    it("does NOT override non-assertion executor types", () => {
      const items = [makeClassified("tp-0", "run script", "HIGH", "shell")];
      const results = [makeResult("tp-0", false, { file: "src/api/handler.ts" })];
      const contractFiles = new Set(["src/api/handler.ts"]);

      const signal = buildExecutorSignal(items, results, undefined, contractFiles);
      expect(signal.passed).toBe(false);
      expect(signal.details[0].status).toBe("fail");
    });

    it("does NOT override when contractVerifiedFiles is empty set", () => {
      const items = [makeClassified("tp-0", "check exports", "HIGH", "assertion")];
      const results = [makeResult("tp-0", false, { file: "src/foo.ts" })];
      const contractFiles = new Set<string>();

      const signal = buildExecutorSignal(items, results, undefined, contractFiles);
      expect(signal.passed).toBe(false);
    });

    it("does NOT override when evidence has no file property", () => {
      const items = [makeClassified("tp-0", "check exports", "HIGH", "assertion")];
      const results = [makeResult("tp-0", false, { someOther: "data" })];
      const contractFiles = new Set(["src/foo.ts"]);

      const signal = buildExecutorSignal(items, results, undefined, contractFiles);
      expect(signal.passed).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // isContractVerified — path normalization
  // -----------------------------------------------------------------------
  describe("file path normalization (isContractVerified)", () => {
    it("strips leading ./ from evidence file for matching", () => {
      const items = [makeClassified("tp-0", "check file", "DETERMINISTIC", "assertion")];
      const results = [makeResult("tp-0", false, { file: "./src/utils.ts" })];
      const contractFiles = new Set(["src/utils.ts"]); // without ./

      const signal = buildExecutorSignal(items, results, undefined, contractFiles);
      expect(signal.passed).toBe(true);
      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("Contract verified");
    });

    it("matches when contractVerifiedFiles has ./ prefix and evidence does not", () => {
      const items = [makeClassified("tp-0", "check file", "DETERMINISTIC", "assertion")];
      const results = [makeResult("tp-0", false, { file: "src/utils.ts" })];
      const contractFiles = new Set(["./src/utils.ts"]);

      const signal = buildExecutorSignal(items, results, undefined, contractFiles);
      expect(signal.passed).toBe(true);
    });

    it("matches exact path when both have same format", () => {
      const items = [makeClassified("tp-0", "check file", "DETERMINISTIC", "assertion")];
      const results = [makeResult("tp-0", false, { file: "packages/core/index.ts" })];
      const contractFiles = new Set(["packages/core/index.ts"]);

      const signal = buildExecutorSignal(items, results, undefined, contractFiles);
      expect(signal.passed).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Confidence-based blocking
  // -----------------------------------------------------------------------
  describe("confidence-based blocking", () => {
    it("DETERMINISTIC fail → passed=false", () => {
      const items = [makeClassified("tp-0", "build", "DETERMINISTIC")];
      const results = [makeResult("tp-0", false)];

      expect(buildExecutorSignal(items, results).passed).toBe(false);
    });

    it("HIGH fail → passed=false", () => {
      const items = [makeClassified("tp-0", "api call", "HIGH", "api")];
      const results = [makeResult("tp-0", false)];

      expect(buildExecutorSignal(items, results).passed).toBe(false);
    });

    it("MEDIUM fail → passed=true (non-blocking)", () => {
      const items = [makeClassified("tp-0", "visual check", "MEDIUM", "browser")];
      const results = [makeResult("tp-0", false)];

      const signal = buildExecutorSignal(items, results);
      expect(signal.passed).toBe(true);
      expect(signal.score).toBe(0);
    });

    it("LOW fail → passed=true (non-blocking)", () => {
      const items = [makeClassified("tp-0", "minor check", "LOW", "shell")];
      const results = [makeResult("tp-0", false)];

      const signal = buildExecutorSignal(items, results);
      expect(signal.passed).toBe(true);
      expect(signal.score).toBe(0);
    });

    it("mix of blocking pass + non-blocking fail → passed=true", () => {
      const items = [
        makeClassified("tp-0", "build", "DETERMINISTIC"),
        makeClassified("tp-1", "style check", "LOW", "shell"),
      ];
      const results = [makeResult("tp-0", true), makeResult("tp-1", false)];

      const signal = buildExecutorSignal(items, results);
      expect(signal.passed).toBe(true);
      expect(signal.score).toBe(50);
    });
  });

  // -----------------------------------------------------------------------
  // Score calculation
  // -----------------------------------------------------------------------
  describe("score calculation", () => {
    it("all passed → score 100", () => {
      const items = [makeClassified("tp-0", "a"), makeClassified("tp-1", "b")];
      const results = [makeResult("tp-0", true), makeResult("tp-1", true)];

      expect(buildExecutorSignal(items, results).score).toBe(100);
    });

    it("none passed → score 0", () => {
      const items = [makeClassified("tp-0", "a", "LOW")];
      const results = [makeResult("tp-0", false)];

      expect(buildExecutorSignal(items, results).score).toBe(0);
    });

    it("2/3 passed → score 67 (rounded)", () => {
      const items = [
        makeClassified("tp-0", "a", "LOW"),
        makeClassified("tp-1", "b", "LOW"),
        makeClassified("tp-2", "c", "LOW"),
      ];
      const results = [
        makeResult("tp-0", true),
        makeResult("tp-1", true),
        makeResult("tp-2", false),
      ];

      expect(buildExecutorSignal(items, results).score).toBe(67);
    });

    it("1/3 passed → score 33 (rounded)", () => {
      const items = [
        makeClassified("tp-0", "a", "LOW"),
        makeClassified("tp-1", "b", "LOW"),
        makeClassified("tp-2", "c", "LOW"),
      ];
      const results = [
        makeResult("tp-0", true),
        makeResult("tp-1", false),
        makeResult("tp-2", false),
      ];

      expect(buildExecutorSignal(items, results).score).toBe(33);
    });
  });

  // -----------------------------------------------------------------------
  // Skip handling
  // -----------------------------------------------------------------------
  describe("skip handling", () => {
    it("SKIP confidence items are excluded from count", () => {
      const items = [
        makeClassified("tp-0", "build", "DETERMINISTIC"),
        makeClassified("tp-1", "manual check", "SKIP", "none"),
      ];
      const results = [makeResult("tp-0", true), makeResult("tp-1", false, { skipped: true })];

      const signal = buildExecutorSignal(items, results);
      expect(signal.score).toBe(100);
      expect(signal.details).toHaveLength(1);
    });

    it("evidence.skipped=true excludes item from count", () => {
      const items = [
        makeClassified("tp-0", "build", "DETERMINISTIC"),
        makeClassified("tp-1", "infra check", "HIGH"),
      ];
      const results = [
        makeResult("tp-0", true),
        makeResult("tp-1", false, { skipped: true, reason: "no infra" }),
      ];

      const signal = buildExecutorSignal(items, results);
      expect(signal.score).toBe(100);
      expect(signal.details).toHaveLength(1);
    });

    it("all items skipped → score 100, all-skipped detail", () => {
      const items = [makeClassified("tp-0", "manual", "SKIP", "none")];
      const results = [makeResult("tp-0", false, { skipped: true })];

      const signal = buildExecutorSignal(items, results);
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].label).toBe("All skipped");
    });

    it("executorType=none items are excluded from count", () => {
      const items = [
        makeClassified("tp-0", "build"),
        makeClassified("tp-1", "manual step", "MEDIUM", "none"),
      ];
      const results = [makeResult("tp-0", true), makeResult("tp-1", false)];

      const signal = buildExecutorSignal(items, results);
      expect(signal.score).toBe(100);
      expect(signal.details).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe("edge cases", () => {
    it("empty items and results → score 100, no-items detail", () => {
      const signal = buildExecutorSignal([], []);
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].label).toBe("No items");
    });

    it("items with no matching results are ignored", () => {
      const items = [makeClassified("tp-0", "build"), makeClassified("tp-99", "orphan")];
      const results = [makeResult("tp-0", true)]; // no result for tp-99

      const signal = buildExecutorSignal(items, results);
      expect(signal.score).toBe(100);
      expect(signal.details).toHaveLength(1);
    });

    it("error message in evidence is included in fail detail", () => {
      const items = [makeClassified("tp-0", "build", "LOW")];
      const results = [makeResult("tp-0", false, { error: "ENOENT: file not found" })];

      const signal = buildExecutorSignal(items, results);
      expect(signal.details[0].message).toContain("ENOENT: file not found");
    });

    it("fail detail without error shows duration fallback", () => {
      const items = [makeClassified("tp-0", "build", "LOW")];
      const results = [makeResult("tp-0", false)];

      const signal = buildExecutorSignal(items, results);
      expect(signal.details[0].message).toContain("100ms");
    });

    it("label is truncated to 80 characters", () => {
      const longText = "A".repeat(120);
      const items = [makeClassified("tp-0", longText)];
      const results = [makeResult("tp-0", true)];

      const signal = buildExecutorSignal(items, results);
      expect(signal.details[0].label).toHaveLength(80);
    });

    it("signal metadata is correct", () => {
      const signal = buildExecutorSignal([], []);
      expect(signal.id).toBe("executor");
      expect(signal.name).toBe("Test Execution");
      expect(signal.weight).toBe(15);
      expect(signal.requiresLLM).toBe(false);
    });

    it("CI override wins over contract override (CI checked first)", () => {
      const items = [makeClassified("tp-0", "check file", "HIGH", "assertion")];
      const results = [makeResult("tp-0", false, { file: "src/handler.ts" })];
      const ciVerified = new Set(["tp-0"]);
      const contractFiles = new Set(["src/handler.ts"]);

      const signal = buildExecutorSignal(items, results, ciVerified, contractFiles);
      expect(signal.details[0].message).toContain("CI verified");
    });
  });
});
