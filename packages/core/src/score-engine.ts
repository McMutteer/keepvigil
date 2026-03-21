/**
 * Score engine — combines multiple signals into a single 0-100 confidence score.
 *
 * Pure functions, no side effects, no I/O.
 * Used by the pipeline (Section 9) after all signals are collected.
 */

import type { ConfidenceScore, PipelineMode, Signal, SignalDetail, SignalId, ScoreRecommendation } from "./types.js";

/** Signals that hard-cap the score when they fail (deterministic failures only) */
const CRITICAL_SIGNALS: ReadonlySet<string> = new Set(["credential-scan"]);

/**
 * Default weights — v1+v2 mode (PR has a test plan).
 * Kept as the primary export for backward compatibility.
 */
export const SIGNAL_WEIGHTS: Record<SignalId, number> = {
  "ci-bridge": 20,
  "credential-scan": 15,
  "executor": 10,
  "plan-augmentor": 10,
  "contract-checker": 5,
  "diff-analyzer": 5,
  "coverage-mapper": 5,
  "gap-analyzer": 5,
  "claims-verifier": 15,
  "undocumented-changes": 10,
  "risk-score": 0,
  "description-generator": 0,
};

/** v2-only weights — PR has no test plan, only v2 signals run */
export const SIGNAL_WEIGHTS_V2: Record<SignalId, number> = {
  "ci-bridge": 0,
  "credential-scan": 20,
  "executor": 0,
  "plan-augmentor": 0,
  "contract-checker": 10,
  "diff-analyzer": 5,
  "coverage-mapper": 10,
  "gap-analyzer": 0,
  "claims-verifier": 30,
  "undocumented-changes": 25,
  "risk-score": 0,
  "description-generator": 0,
};

/** Get the weight profile for a given pipeline mode */
export function getWeights(mode: PipelineMode): Record<SignalId, number> {
  return mode === "v2-only" ? SIGNAL_WEIGHTS_V2 : SIGNAL_WEIGHTS;
}

/** Score thresholds for deriving the recommendation */
export const RECOMMENDATION_THRESHOLDS = {
  safe: 80,
  review: 50,
} as const;

/** Any signal with passed === false caps the total score at this value */
export const FAILURE_CAP = 70;

/**
 * Compute the confidence score from a set of signals.
 *
 * Algorithm:
 * 1. Filter to signals with weight > 0
 * 2. Weighted average: sum(score * weight) / sum(weight)
 * 3. If any signal.passed === false → cap at FAILURE_CAP
 * 4. Round to integer
 * 5. Derive recommendation from thresholds
 */
export function computeScore(signals: Signal[]): ConfidenceScore {
  // Determine which signals were not provided
  const presentIds = new Set(signals.map((s) => s.id));
  const allIds = Object.keys(SIGNAL_WEIGHTS) as SignalId[];
  const skippedSignals = allIds.filter((id) => !presentIds.has(id));

  if (signals.length === 0) {
    return {
      score: 0,
      recommendation: "caution",
      signals: [],
      skippedSignals,
    };
  }

  const weighted = signals.filter((s) => s.weight > 0);
  if (weighted.length === 0) {
    return {
      score: 0,
      recommendation: "caution",
      signals,
      skippedSignals,
    };
  }

  const totalWeight = weighted.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = weighted.reduce((sum, s) => sum + s.score * s.weight, 0);
  let score = Math.round(weightedSum / totalWeight);

  // Failure cap only applies for critical deterministic signals (credential leaks).
  // Non-critical failures (coverage mapper) inform but don't hard-cap.
  const hasCriticalFailure = signals.some((s) => !s.passed && !s.requiresLLM && CRITICAL_SIGNALS.has(s.id));
  if (hasCriticalFailure && score > FAILURE_CAP) {
    score = FAILURE_CAP;
  }

  return {
    score,
    recommendation: deriveRecommendation(score),
    signals,
    skippedSignals,
  };
}

/** Derive a recommendation from a numeric score */
function deriveRecommendation(score: number): ScoreRecommendation {
  if (score >= RECOMMENDATION_THRESHOLDS.safe) return "safe";
  if (score >= RECOMMENDATION_THRESHOLDS.review) return "review";
  return "caution";
}

/** Parameters for createSignal — only required fields, rest has defaults */
export interface CreateSignalParams {
  id: SignalId;
  name: string;
  score: number;
  passed: boolean;
  details: SignalDetail[];
  /** Whether this signal required an LLM (default: false) */
  requiresLLM?: boolean;
  /** Override the default weight from SIGNAL_WEIGHTS */
  weight?: number;
}

/**
 * Factory function for building signals with sensible defaults.
 * Keeps signal creation consistent across all signal producers.
 * Score is clamped to 0-100 to prevent out-of-range values.
 */
export function createSignal(params: CreateSignalParams): Signal {
  return {
    id: params.id,
    name: params.name,
    score: Math.min(100, Math.max(0, params.score)),
    weight: params.weight ?? SIGNAL_WEIGHTS[params.id],
    passed: params.passed,
    details: params.details,
    requiresLLM: params.requiresLLM ?? false,
  };
}
