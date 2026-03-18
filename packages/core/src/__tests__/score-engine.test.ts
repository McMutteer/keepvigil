import { describe, it, expect } from "vitest";
import {
  computeScore,
  createSignal,
  SIGNAL_WEIGHTS,
  RECOMMENDATION_THRESHOLDS,
  FAILURE_CAP,
} from "../score-engine.js";
import type { Signal } from "../types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSignal(overrides: Partial<Signal> & Pick<Signal, "id">): Signal {
  return {
    name: overrides.name ?? overrides.id,
    score: overrides.score ?? 100,
    weight: overrides.weight ?? SIGNAL_WEIGHTS[overrides.id],
    passed: overrides.passed ?? true,
    details: overrides.details ?? [],
    requiresLLM: overrides.requiresLLM ?? false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeScore
// ---------------------------------------------------------------------------

describe("computeScore", () => {
  describe("happy path", () => {
    it("returns weighted average for all-passing signals", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 100 }),
        makeSignal({ id: "credential-scan", score: 100 }),
        makeSignal({ id: "executor", score: 80 }),
      ];
      const result = computeScore(signals);

      // (100*25 + 100*20 + 80*15) / (25+20+15) = 5700/60 = 95
      expect(result.score).toBe(95);
      expect(result.recommendation).toBe("safe");
      expect(result.signals).toEqual(signals);
      // 5 signals not provided → listed as skipped
      expect(result.skippedSignals).toHaveLength(5);
      expect(result.skippedSignals).toContain("plan-augmentor");
      expect(result.skippedSignals).toContain("contract-checker");
    });

    it("returns single signal score when only one signal", () => {
      const signals = [makeSignal({ id: "credential-scan", score: 85 })];
      const result = computeScore(signals);
      expect(result.score).toBe(85);
      expect(result.recommendation).toBe("safe");
    });
  });

  describe("failure cap", () => {
    it("caps score at FAILURE_CAP when any signal has passed === false", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 100 }),
        makeSignal({ id: "credential-scan", score: 0, passed: false }),
        makeSignal({ id: "executor", score: 100 }),
      ];
      const result = computeScore(signals);
      // Weighted average: (100*25 + 0*20 + 100*15) / 60 = 4000/60 = 66.67 → 67
      // 67 < FAILURE_CAP, so cap doesn't apply
      expect(result.score).toBe(67);
      expect(result.recommendation).toBe("review");
    });

    it("caps high averages when a signal fails", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 100 }),
        makeSignal({ id: "credential-scan", score: 90, passed: false }),
        makeSignal({ id: "executor", score: 100 }),
      ];
      const result = computeScore(signals);
      // Weighted average: (100*25 + 90*20 + 100*15) / 60 = 5800/60 = 96.67 → 97
      // But passed: false → capped at 70
      expect(result.score).toBe(FAILURE_CAP);
      expect(result.recommendation).toBe("review");
    });

    it("does not cap when only LLM signals fail (LLM failures are speculative)", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 100 }),
        makeSignal({ id: "diff-analyzer", score: 30, passed: false, requiresLLM: true }),
        makeSignal({ id: "gap-analyzer", score: 40, passed: false, requiresLLM: true }),
      ];
      const result = computeScore(signals);
      // LLM failures don't trigger the cap — score is the weighted average
      expect(result.score).toBeGreaterThan(FAILURE_CAP);
    });

    it("does not cap when all signals pass", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 90 }),
        makeSignal({ id: "executor", score: 85 }),
      ];
      const result = computeScore(signals);
      // (90*25 + 85*15) / 40 = 3525/40 = 88.125 → 88
      expect(result.score).toBe(88);
      expect(result.recommendation).toBe("safe");
    });
  });

  describe("edge cases", () => {
    it("returns score 0 and caution for zero signals", () => {
      const result = computeScore([]);
      expect(result.score).toBe(0);
      expect(result.recommendation).toBe("caution");
      expect(result.signals).toEqual([]);
      // All 8 signals are skipped when none are provided
      expect(result.skippedSignals).toHaveLength(8);
    });

    it("returns score 0 and caution when all signals have weight 0", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 100, weight: 0 }),
        makeSignal({ id: "executor", score: 100, weight: 0 }),
      ];
      const result = computeScore(signals);
      expect(result.score).toBe(0);
      expect(result.recommendation).toBe("caution");
    });

    it("reports all signal IDs as skipped when none provided", () => {
      const result = computeScore([]);
      expect(result.skippedSignals.sort()).toEqual(
        Object.keys(SIGNAL_WEIGHTS).sort()
      );
    });

    it("reports only missing signals as skipped", () => {
      const allIds = Object.keys(SIGNAL_WEIGHTS);
      const allSignals = allIds.map((id) =>
        makeSignal({ id: id as Parameters<typeof makeSignal>[0]["id"], score: 100 })
      );
      const result = computeScore(allSignals);
      expect(result.skippedSignals).toEqual([]);
    });

    it("handles all-failing signals", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 10, passed: false }),
        makeSignal({ id: "credential-scan", score: 0, passed: false }),
        makeSignal({ id: "executor", score: 20, passed: false }),
      ];
      const result = computeScore(signals);
      // (10*25 + 0*20 + 20*15) / 60 = 550/60 = 9.17 → 9
      expect(result.score).toBe(9);
      expect(result.recommendation).toBe("caution");
    });

    it("rounds correctly", () => {
      // Engineer a score that needs rounding
      const signals = [
        makeSignal({ id: "ci-bridge", score: 77, weight: 1 }),
        makeSignal({ id: "executor", score: 78, weight: 1 }),
      ];
      const result = computeScore(signals);
      // (77 + 78) / 2 = 77.5 → 78
      expect(result.score).toBe(78);
    });
  });

  describe("recommendation thresholds", () => {
    it("returns safe for score >= 80", () => {
      const signals = [makeSignal({ id: "ci-bridge", score: 80 })];
      expect(computeScore(signals).recommendation).toBe("safe");
    });

    it("returns review for score >= 50 and < 80", () => {
      const signals = [makeSignal({ id: "ci-bridge", score: 79 })];
      expect(computeScore(signals).recommendation).toBe("review");
    });

    it("returns review for score exactly 50", () => {
      const signals = [makeSignal({ id: "ci-bridge", score: 50 })];
      expect(computeScore(signals).recommendation).toBe("review");
    });

    it("returns caution for score < 50", () => {
      const signals = [makeSignal({ id: "ci-bridge", score: 49 })];
      expect(computeScore(signals).recommendation).toBe("caution");
    });

    it("returns caution for score 0", () => {
      const signals = [makeSignal({ id: "ci-bridge", score: 0 })];
      expect(computeScore(signals).recommendation).toBe("caution");
    });
  });

  describe("weight normalization", () => {
    it("normalizes weights correctly with unequal weights", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 100, weight: 60 }),
        makeSignal({ id: "executor", score: 0, weight: 40, passed: false }),
      ];
      const result = computeScore(signals);
      // (100*60 + 0*40) / 100 = 60
      expect(result.score).toBe(60);
    });

    it("ignores zero-weight signals in the average", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 100, weight: 10 }),
        makeSignal({ id: "executor", score: 0, weight: 0 }),
      ];
      const result = computeScore(signals);
      // Only ci-bridge counts: 100
      expect(result.score).toBe(100);
    });

    it("still checks passed on zero-weight signals for failure cap", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 100, weight: 10 }),
        makeSignal({ id: "executor", score: 0, weight: 0, passed: false }),
      ];
      const result = computeScore(signals);
      // Average from weighted only = 100, but executor failed → cap at 70
      expect(result.score).toBe(FAILURE_CAP);
    });
  });
});

// ---------------------------------------------------------------------------
// createSignal
// ---------------------------------------------------------------------------

describe("createSignal", () => {
  it("creates a signal with default weight from SIGNAL_WEIGHTS", () => {
    const signal = createSignal({
      id: "ci-bridge",
      name: "CI Bridge",
      score: 85,
      passed: true,
      details: [],
    });
    expect(signal.weight).toBe(SIGNAL_WEIGHTS["ci-bridge"]);
    expect(signal.weight).toBe(25);
  });

  it("allows custom weight override", () => {
    const signal = createSignal({
      id: "ci-bridge",
      name: "CI Bridge",
      score: 85,
      passed: true,
      details: [],
      weight: 50,
    });
    expect(signal.weight).toBe(50);
  });

  it("defaults requiresLLM to false", () => {
    const signal = createSignal({
      id: "credential-scan",
      name: "Credential Scan",
      score: 100,
      passed: true,
      details: [],
    });
    expect(signal.requiresLLM).toBe(false);
  });

  it("sets requiresLLM when provided", () => {
    const signal = createSignal({
      id: "diff-analyzer",
      name: "Diff Analyzer",
      score: 70,
      passed: true,
      details: [],
      requiresLLM: true,
    });
    expect(signal.requiresLLM).toBe(true);
  });

  it("clamps score above 100 to 100", () => {
    const signal = createSignal({
      id: "ci-bridge",
      name: "CI Bridge",
      score: 150,
      passed: true,
      details: [],
    });
    expect(signal.score).toBe(100);
  });

  it("clamps negative score to 0", () => {
    const signal = createSignal({
      id: "ci-bridge",
      name: "CI Bridge",
      score: -20,
      passed: false,
      details: [],
    });
    expect(signal.score).toBe(0);
  });

  it("preserves all provided fields", () => {
    const details = [
      { label: "npm run build", status: "pass" as const, message: "CI job passed" },
      { label: "npm test", status: "fail" as const, message: "CI job failed" },
    ];
    const signal = createSignal({
      id: "ci-bridge",
      name: "CI Bridge",
      score: 50,
      passed: false,
      details,
    });
    expect(signal.id).toBe("ci-bridge");
    expect(signal.name).toBe("CI Bridge");
    expect(signal.score).toBe(50);
    expect(signal.passed).toBe(false);
    expect(signal.details).toEqual(details);
  });

  it("uses correct default weight for each signal type", () => {
    const ids: Array<{ id: Parameters<typeof createSignal>[0]["id"]; expected: number }> = [
      { id: "ci-bridge", expected: 25 },
      { id: "credential-scan", expected: 20 },
      { id: "executor", expected: 15 },
      { id: "plan-augmentor", expected: 15 },
      { id: "contract-checker", expected: 10 },
      { id: "diff-analyzer", expected: 5 },
      { id: "coverage-mapper", expected: 5 },
      { id: "gap-analyzer", expected: 5 },
    ];
    for (const { id, expected } of ids) {
      const signal = createSignal({ id, name: id, score: 100, passed: true, details: [] });
      expect(signal.weight).toBe(expected);
    }
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("constants", () => {
  it("SIGNAL_WEIGHTS has all signal IDs", () => {
    expect(Object.keys(SIGNAL_WEIGHTS).sort()).toEqual([
      "ci-bridge",
      "contract-checker",
      "coverage-mapper",
      "credential-scan",
      "diff-analyzer",
      "executor",
      "gap-analyzer",
      "plan-augmentor",
    ]);
  });

  it("SIGNAL_WEIGHTS sum to 100", () => {
    const sum = Object.values(SIGNAL_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("RECOMMENDATION_THRESHOLDS are ordered", () => {
    expect(RECOMMENDATION_THRESHOLDS.safe).toBeGreaterThan(RECOMMENDATION_THRESHOLDS.review);
  });

  it("FAILURE_CAP is below safe threshold", () => {
    expect(FAILURE_CAP).toBeLessThan(RECOMMENDATION_THRESHOLDS.safe);
  });
});
