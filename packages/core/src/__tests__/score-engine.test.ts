import { describe, it, expect } from "vitest";
import {
  computeScore,
  createSignal,
  SIGNAL_WEIGHTS,
  SIGNAL_WEIGHTS_V2,
  getWeights,
  RECOMMENDATION_THRESHOLDS,
  FAILURE_CAP,
} from "../score-engine.js";
import type { Signal, SignalId } from "../types.js";

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

      // (100*20 + 100*15 + 80*10) / (20+15+10) = 4300/45 = 95.56 → 96
      expect(result.score).toBe(96);
      expect(result.recommendation).toBe("safe");
      expect(result.signals).toEqual(signals);
      // 9 signals not provided → listed as skipped (risk-score + description-generator are informational weight 0)
      expect(result.skippedSignals).toHaveLength(9);
      expect(result.skippedSignals).toContain("plan-augmentor");
      expect(result.skippedSignals).toContain("contract-checker");
      expect(result.skippedSignals).toContain("claims-verifier");
      expect(result.skippedSignals).toContain("undocumented-changes");
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
      // Weighted average: (100*20 + 0*15 + 100*10) / 45 = 3000/45 = 66.67 → 67
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
      // Weighted average would be > 70, but passed: false → capped at 70
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
      expect(result.score).toBeGreaterThan(FAILURE_CAP);
    });

    it("does not cap when all signals pass", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 90 }),
        makeSignal({ id: "executor", score: 85 }),
      ];
      const result = computeScore(signals);
      // (90*20 + 85*10) / 30 = 2650/30 = 88.33 → 88
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
      // All 12 signals are skipped when none are provided
      expect(result.skippedSignals).toHaveLength(12);
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
        makeSignal({ id: id as SignalId, score: 100 })
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
      // (10*20 + 0*15 + 20*10) / 45 = 400/45 = 8.89 → 9
      expect(result.score).toBe(9);
      expect(result.recommendation).toBe("caution");
    });

    it("rounds correctly", () => {
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
      expect(result.score).toBe(60);
    });

    it("ignores zero-weight signals in the average", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 100, weight: 10 }),
        makeSignal({ id: "executor", score: 0, weight: 0 }),
      ];
      const result = computeScore(signals);
      expect(result.score).toBe(100);
    });

    it("only caps score for critical signal failures (credential-scan)", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 100, weight: 20 }),
        makeSignal({ id: "credential-scan", score: 0, weight: 2, passed: false }),
      ];
      const result = computeScore(signals);
      // Weighted avg: (100*20 + 0*2) / 22 = 91, but capped to 70 because credential-scan failed
      expect(result.score).toBe(FAILURE_CAP);
    });

    it("does not cap score for non-critical signal failures (coverage-mapper)", () => {
      const signals = [
        makeSignal({ id: "ci-bridge", score: 100, weight: 20 }),
        makeSignal({ id: "coverage-mapper", score: 0, weight: 2, passed: false }),
      ];
      const result = computeScore(signals);
      // Weighted avg: (100*20 + 0*2) / 22 = 91 — no cap because coverage-mapper is non-critical
      expect(result.score).toBe(91);
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
    expect(signal.weight).toBe(20);
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

  it("creates signals for new v2 signal types", () => {
    const claimsSignal = createSignal({
      id: "claims-verifier",
      name: "Claims Verifier",
      score: 85,
      passed: true,
      details: [],
      requiresLLM: true,
    });
    expect(claimsSignal.weight).toBe(15);
    expect(claimsSignal.id).toBe("claims-verifier");

    const undocSignal = createSignal({
      id: "undocumented-changes",
      name: "Undocumented Changes",
      score: 70,
      passed: true,
      details: [],
      requiresLLM: true,
    });
    expect(undocSignal.weight).toBe(10);
    expect(undocSignal.id).toBe("undocumented-changes");
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
    const ids: Array<{ id: SignalId; expected: number }> = [
      { id: "ci-bridge", expected: 20 },
      { id: "credential-scan", expected: 15 },
      { id: "executor", expected: 10 },
      { id: "plan-augmentor", expected: 10 },
      { id: "contract-checker", expected: 5 },
      { id: "diff-analyzer", expected: 5 },
      { id: "coverage-mapper", expected: 5 },
      { id: "gap-analyzer", expected: 5 },
      { id: "claims-verifier", expected: 15 },
      { id: "undocumented-changes", expected: 10 },
    ];
    for (const { id, expected } of ids) {
      const signal = createSignal({ id, name: id, score: 100, passed: true, details: [] });
      expect(signal.weight).toBe(expected);
    }
  });
});

// ---------------------------------------------------------------------------
// getWeights
// ---------------------------------------------------------------------------

describe("getWeights", () => {
  it("returns v1+v2 weights for v1+v2 mode", () => {
    const weights = getWeights("v1+v2");
    expect(weights).toBe(SIGNAL_WEIGHTS);
  });

  it("returns v2-only weights for v2-only mode", () => {
    const weights = getWeights("v2-only");
    expect(weights).toBe(SIGNAL_WEIGHTS_V2);
  });

  it("v2-only weights zero out test-plan-dependent signals", () => {
    const weights = getWeights("v2-only");
    expect(weights["ci-bridge"]).toBe(0);
    expect(weights["executor"]).toBe(0);
    expect(weights["plan-augmentor"]).toBe(0);
    expect(weights["gap-analyzer"]).toBe(0);
  });

  it("v2-only weights emphasize claims and undocumented", () => {
    const weights = getWeights("v2-only");
    expect(weights["claims-verifier"]).toBe(30);
    expect(weights["undocumented-changes"]).toBe(25);
  });

  it("v1+v2 weights include all signals (risk-score + description-generator are informational weight 0)", () => {
    const weights = getWeights("v1+v2");
    const informationalSignals = new Set(["risk-score", "description-generator"]);
    for (const [key, w] of Object.entries(weights)) {
      if (informationalSignals.has(key)) {
        expect(w).toBe(0);
      } else {
        expect(w).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("constants", () => {
  it("SIGNAL_WEIGHTS has all 12 signal IDs", () => {
    expect(Object.keys(SIGNAL_WEIGHTS).sort()).toEqual([
      "ci-bridge",
      "claims-verifier",
      "contract-checker",
      "coverage-mapper",
      "credential-scan",
      "description-generator",
      "diff-analyzer",
      "executor",
      "gap-analyzer",
      "plan-augmentor",
      "risk-score",
      "undocumented-changes",
    ]);
  });

  it("SIGNAL_WEIGHTS v1+v2 sum to 100 (risk-score is informational weight 0)", () => {
    const sum = Object.values(SIGNAL_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("SIGNAL_WEIGHTS_V2 non-zero values sum to 100 (risk-score is informational weight 0)", () => {
    const sum = Object.values(SIGNAL_WEIGHTS_V2).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("RECOMMENDATION_THRESHOLDS are ordered", () => {
    expect(RECOMMENDATION_THRESHOLDS.safe).toBeGreaterThan(RECOMMENDATION_THRESHOLDS.review);
  });

  it("FAILURE_CAP is below safe threshold", () => {
    expect(FAILURE_CAP).toBeLessThan(RECOMMENDATION_THRESHOLDS.safe);
  });
});
