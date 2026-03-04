/**
 * Routes classified test plan items to the appropriate executor.
 * All items are executed concurrently via Promise.allSettled.
 * Follows the error-as-evidence model — never throws, always returns ExecutionResult.
 */

import type { ClassifiedItem, ExecutionResult } from "@vigil/core";
import {
  executeShellItem,
  executeApiItem,
  executeBrowserItem,
} from "@vigil/executors";

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
    console.error(
      `[executor-router] Unexpected throw for item ${classifiedItems[i].item.id}:`,
      result.reason,
    );
    return {
      itemId: classifiedItems[i].item.id,
      passed: false,
      duration: 0,
      evidence: { error: String(result.reason) },
    };
  });
}

async function executeItem(
  item: ClassifiedItem,
  options: Omit<RouterOptions, "classifiedItems">,
): Promise<ExecutionResult> {
  const { repoPath, previewUrl, groqApiKey } = options;

  if (item.confidence === "SKIP" || item.executorType === "none") {
    return {
      itemId: item.item.id,
      passed: true,
      duration: 0,
      evidence: { skipped: true, reason: "Item marked as manual or vague" },
    };
  }

  switch (item.executorType) {
    case "shell": {
      if (!repoPath) {
        return noRepoResult(item.item.id);
      }
      return executeShellItem(item, {
        repoPath,
        timeoutMs: 300_000,
      });
    }

    case "api": {
      if (!previewUrl) {
        return noPreviewResult(item.item.id);
      }
      return executeApiItem(item, {
        baseUrl: previewUrl,
        groqApiKey,
        timeoutMs: 30_000,
      });
    }

    case "browser": {
      if (!previewUrl) {
        return noPreviewResult(item.item.id);
      }
      return executeBrowserItem(item, {
        baseUrl: previewUrl,
        groqApiKey,
        timeoutMs: 60_000,
      });
    }

    default:
      return {
        itemId: item.item.id,
        passed: false,
        duration: 0,
        evidence: { error: `Unknown executor type: ${item.executorType}` },
      };
  }
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
