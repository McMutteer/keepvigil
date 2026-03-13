/**
 * Routes classified test plan items to the appropriate executor.
 * All items are executed concurrently via Promise.allSettled.
 * Follows the error-as-evidence model — never throws, always returns ExecutionResult.
 */

import type { ClassifiedItem, ExecutionResult, ExecutorType } from "@vigil/core";
import { createLogger } from "@vigil/core";
import {
  executeShellItem,
  executeApiItem,
  executeBrowserItem,
} from "@vigil/executors";

const log = createLogger("executor-router");

export interface RouterOptions {
  classifiedItems: ClassifiedItem[];
  /** Absolute path to cloned repo, required for shell items */
  repoPath: string | null;
  /** Preview deployment URL, required for api/browser items */
  previewUrl: string | null;
  groqApiKey: string;
}

/**
 * Route all classified items to their executors and return results.
 * Items run concurrently. Executor errors are caught and returned as failed results.
 */
export async function routeToExecutors(
  options: RouterOptions,
): Promise<ExecutionResult[]> {
  const { classifiedItems, repoPath, previewUrl, groqApiKey } = options;

  const settled = await Promise.allSettled(
    classifiedItems.map((item) =>
      executeItem(item, { repoPath, previewUrl, groqApiKey }),
    ),
  );

  return settled.map((result, i) => {
    if (result.status === "fulfilled") return result.value;

    // Executors follow the error-as-evidence model and should never throw,
    // but handle defensively in case of unexpected errors.
    log.error({ err: result.reason, itemId: classifiedItems[i].item.id }, "Unexpected throw from executor");
    return {
      itemId: classifiedItems[i].item.id,
      passed: false,
      duration: 0,
      evidence: { error: String(result.reason) },
    };
  });
}

type ExecutorContext = Omit<RouterOptions, "classifiedItems">;
type ExecutorFn = (item: ClassifiedItem, ctx: ExecutorContext) => Promise<ExecutionResult>;

/**
 * Registry mapping executor types to their handler functions.
 * Adding a new executor type requires only a new entry here — no changes to the router logic.
 */
const EXECUTOR_REGISTRY = new Map<ExecutorType, ExecutorFn>([
  [
    "shell",
    (item, ctx) => {
      if (!ctx.repoPath) return Promise.resolve(noRepoResult(item.item.id));
      return executeShellItem(item, { repoPath: ctx.repoPath, timeoutMs: 300_000 });
    },
  ],
  [
    "api",
    (item, ctx) => {
      if (!ctx.previewUrl) return Promise.resolve(noPreviewResult(item.item.id));
      return executeApiItem(item, { baseUrl: ctx.previewUrl, groqApiKey: ctx.groqApiKey, timeoutMs: 30_000 });
    },
  ],
  [
    "browser",
    (item, ctx) => {
      if (!ctx.previewUrl) return Promise.resolve(noPreviewResult(item.item.id));
      return executeBrowserItem(item, { baseUrl: ctx.previewUrl, groqApiKey: ctx.groqApiKey, timeoutMs: 60_000 });
    },
  ],
]);

async function executeItem(
  item: ClassifiedItem,
  ctx: ExecutorContext,
): Promise<ExecutionResult> {
  if (item.confidence === "SKIP" || item.executorType === "none") {
    return {
      itemId: item.item.id,
      passed: true,
      duration: 0,
      evidence: { skipped: true, reason: "Item marked as manual or vague" },
    };
  }

  const executor = EXECUTOR_REGISTRY.get(item.executorType);
  if (!executor) {
    return {
      itemId: item.item.id,
      passed: false,
      duration: 0,
      evidence: { error: `Unknown executor type: ${item.executorType}` },
    };
  }

  return executor(item, ctx);
}

function noRepoResult(itemId: string): ExecutionResult {
  return {
    itemId,
    passed: false,
    duration: 0,
    evidence: { reason: "Repository could not be cloned for shell execution" },
  };
}

function noPreviewResult(itemId: string): ExecutionResult {
  return {
    itemId,
    passed: false,
    duration: 0,
    evidence: {
      reason:
        "No preview deployment detected. Deploy to Vercel or Netlify to enable API and browser tests.",
    },
  };
}
