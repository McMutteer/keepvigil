/**
 * Executor signal adapter — wraps v1 executor results into the Signal interface.
 *
 * Maps ClassifiedItem[] + ExecutionResult[] to a single Signal for the
 * confidence score. No changes to actual executors — pure adapter.
 *
 * Mirrors the conclusion logic from check-run-updater.ts:
 * - DETERMINISTIC/HIGH fail → signal.passed = false (blocking)
 * - MEDIUM/LOW fail → signal.passed = true (non-blocking, score still affected)
 *
 * CI Bridge override: if CI already verified an item as passed, a sandbox
 * failure is treated as "CI verified" (pass) — CI is more authoritative than
 * the sandbox which may lack dependencies.
 */

import type { ClassifiedItem, ExecutionResult, Signal, SignalDetail } from "@vigil/core";
import { createSignal } from "@vigil/core";

/**
 * Build an executor Signal from classified items and their execution results.
 *
 * @param ciVerifiedItemIds - Item IDs that CI Bridge already verified as passing.
 *   If a shell executor fails but CI verified the same item, the CI result wins.
 */
export function buildExecutorSignal(
  classifiedItems: ClassifiedItem[],
  executionResults: ExecutionResult[],
  ciVerifiedItemIds?: Set<string>,
): Signal {
  if (classifiedItems.length === 0 || executionResults.length === 0) {
    return createSignal({
      id: "executor",
      name: "Test Execution",
      score: 100,
      passed: true,
      details: [{ label: "No items", status: "pass", message: "No test plan items were executed" }],
    });
  }

  // Index results by itemId for O(1) lookup
  const resultMap = new Map<string, ExecutionResult>();
  for (const r of executionResults) {
    resultMap.set(r.itemId, r);
  }

  const details: SignalDetail[] = [];
  let executedCount = 0;
  let passedCount = 0;
  let blockingFailed = false;

  for (const item of classifiedItems) {
    const result = resultMap.get(item.item.id);
    if (!result) continue;

    // Skip items that weren't actually executed
    const evidence = result.evidence as Record<string, unknown>;
    if (evidence.skipped) continue;
    if (item.confidence === "SKIP" || item.executorType === "none") continue;

    executedCount++;
    const isBlocking = item.confidence === "DETERMINISTIC" || item.confidence === "HIGH";

    // CI Bridge override: if CI verified this item as passing, trust CI over sandbox
    const ciVerified = ciVerifiedItemIds?.has(item.item.id) ?? false;

    if (result.passed) {
      passedCount++;
      details.push({
        label: item.item.text.slice(0, 80),
        status: "pass",
        message: `${item.executorType} execution passed (${result.duration}ms)`,
      });
    } else if (ciVerified) {
      // Sandbox failed but CI passed — trust CI
      passedCount++;
      details.push({
        label: item.item.text.slice(0, 80),
        status: "pass",
        message: `CI verified (sandbox failed but GitHub Actions passed)`,
      });
    } else {
      if (isBlocking) blockingFailed = true;
      const errorMsg = typeof evidence.error === "string" ? evidence.error : undefined;
      details.push({
        label: item.item.text.slice(0, 80),
        status: "fail",
        message: errorMsg
          ? `${item.executorType} failed: ${errorMsg.slice(0, 150)}`
          : `${item.executorType} execution failed (${result.duration}ms)`,
      });
    }
  }

  if (executedCount === 0) {
    return createSignal({
      id: "executor",
      name: "Test Execution",
      score: 100,
      passed: true,
      details: [{ label: "All skipped", status: "skip", message: "All items were skipped — nothing executed" }],
    });
  }

  const score = Math.round((passedCount / executedCount) * 100);

  return createSignal({
    id: "executor",
    name: "Test Execution",
    score,
    passed: !blockingFailed,
    details,
  });
}
