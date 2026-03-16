/**
 * Routes classified test plan items to the appropriate executor.
 * All items are executed concurrently via Promise.allSettled.
 * Follows the error-as-evidence model — never throws, always returns ExecutionResult.
 */

import type { ClassifiedItem, ExecutionResult, ExecutorType, LLMClient, VigilConfig } from "@vigil/core";
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
  /** LLM client for spec generation (api/browser executors) */
  llm: LLMClient;
  /** Parsed .vigil.yml config — applied as overrides on top of hardcoded defaults */
  vigiConfig?: VigilConfig;
  /**
   * When set, only items whose IDs are in this set are executed.
   * All other items are returned as "not retried" skipped results.
   */
  retryItemIds?: string[];
}

/**
 * Route all classified items to their executors and return results.
 * Items run concurrently. Executor errors are caught and returned as failed results.
 */
export async function routeToExecutors(
  options: RouterOptions,
): Promise<ExecutionResult[]> {
  const { classifiedItems, repoPath, previewUrl, llm, vigiConfig, retryItemIds } = options;
  const retrySet = retryItemIds ? new Set(retryItemIds) : undefined;

  const settled = await Promise.allSettled(
    classifiedItems.map((item) =>
      executeItem(item, { repoPath, previewUrl, llm, vigiConfig, retryItemIds: retrySet }),
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

type ExecutorContext = Omit<RouterOptions, "classifiedItems" | "retryItemIds"> & {
  retryItemIds?: Set<string>;
};
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
      const timeoutMs = ctx.vigiConfig?.timeouts?.shell
        ? ctx.vigiConfig.timeouts.shell * 1000
        : 300_000;
      return executeShellItem(item, {
        repoPath: ctx.repoPath,
        timeoutMs,
        extraAllowPrefixes: ctx.vigiConfig?.shell?.allow,
        sandboxImage: ctx.vigiConfig?.shell?.image,
      });
    },
  ],
  [
    "api",
    (item, ctx) => {
      if (!ctx.previewUrl) return Promise.resolve(noPreviewResult(item.item.id));
      const timeoutMs = ctx.vigiConfig?.timeouts?.api
        ? ctx.vigiConfig.timeouts.api * 1000
        : 30_000;
      return executeApiItem(item, { baseUrl: ctx.previewUrl, llm: ctx.llm, timeoutMs });
    },
  ],
  [
    "browser",
    (item, ctx) => {
      if (!ctx.previewUrl) return Promise.resolve(noPreviewResult(item.item.id));
      const timeoutMs = ctx.vigiConfig?.timeouts?.browser
        ? ctx.vigiConfig.timeouts.browser * 1000
        : 60_000;
      return executeBrowserItem(item, {
        baseUrl: ctx.previewUrl,
        llm: ctx.llm,
        timeoutMs,
        viewports: ctx.vigiConfig?.viewports,
      });
    },
  ],
]);

async function executeItem(
  item: ClassifiedItem,
  ctx: ExecutorContext,
): Promise<ExecutionResult> {
  if (ctx.retryItemIds && !ctx.retryItemIds.has(item.item.id)) {
    return {
      itemId: item.item.id,
      passed: true,
      duration: 0,
      evidence: { skipped: true, notRetried: true, reason: "Not included in retry — use `/vigil retry` to re-run all items" },
    };
  }

  if (item.confidence === "SKIP" || item.executorType === "none") {
    return {
      itemId: item.item.id,
      passed: true,
      duration: 0,
      evidence: { skipped: true, reason: "Item marked as manual or vague" },
    };
  }

  const skipCategories = ctx.vigiConfig?.skip?.categories;
  if (skipCategories && skipCategories.includes(item.category)) {
    return {
      itemId: item.item.id,
      passed: true,
      duration: 0,
      evidence: { skipped: true, reason: `Category "${item.category}" is disabled in .vigil.yml` },
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
