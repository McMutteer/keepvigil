/**
 * Score engine — combines multiple signals into a single 0-100 confidence score.
 *
 * Pure functions, no side effects, no I/O.
 * Used by the pipeline (Section 9) after all signals are collected.
 */

import type { ConfidenceScore, Signal, SignalDetail, SignalId, ScoreRecommendation } from "./types.js";

/** Default weights for each signal type */
export const SIGNAL_WEIGHTS: Record<SignalId, number> = {
  "ci-bridge": 25,
  "credential-scan": 20,
  "executor": 15,
  "plan-augmentor": 15,
  "contract-checker": 10,
  "diff-analyzer": 5,
  "coverage-mapper": 5,
  "gap-analyzer": 5,
};

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

  // Failure cap only applies for non-LLM signals (deterministic failures).
  // LLM-based signals are speculative — they inform but don't hard-cap.
  const hasDeterministicFailure = signals.some((s) => !s.passed && !s.requiresLLM);
  if (hasDeterministicFailure && score > FAILURE_CAP) {
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
