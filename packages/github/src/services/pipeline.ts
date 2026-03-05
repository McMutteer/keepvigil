/**
 * Main orchestration pipeline for test plan verification.
 * Called by the BullMQ worker for each job. Coordinates parse → classify →
 * clone → detect → execute → report in a try/finally to guarantee reporting.
 */

import type { Probot } from "probot";
import type { ClassifiedItem, ExecutionResult, VerifyTestPlanJob } from "@vigil/core";
import { parseTestPlan, classifyItems } from "@vigil/core";
import { reportResults } from "./reporter.js";
import { cloneRepo, cleanupRepo } from "./repo-clone.js";
import { detectPreviewUrl } from "./preview-url.js";
import { routeToExecutors } from "./executor-router.js";

/**
 * Run the full verification pipeline for a single PR job.
 *
 * Stage order:
 * 1. Authenticate as GitHub installation
 * 2. Parse test plan items from prBody
 * 3. Classify items (rule-based + Claude Haiku)
 * 4. Clone repo for shell items (optional)
 * 5. Detect preview URL for api/browser items (optional)
 * 6. Execute all items concurrently via executor-router
 * 7. Report results to GitHub (always — even on partial failure)
 * 8. Clean up cloned repo
 */
export async function runPipeline(
  job: VerifyTestPlanJob,
  probot: Probot,
  groqApiKey: string,
): Promise<void> {
  const { owner, repo, pullNumber, headSha, checkRunId, prBody, installationId } =
    job;

  const octokit = await probot.auth(Number(installationId));

  let repoPath: string | null = null;
  let classifiedItems: ClassifiedItem[] = [];
  let executionResults: ExecutionResult[] = [];
  let pipelineError: string | null = null;

  try {
    // Stage 2: Parse
    const parsed = parseTestPlan(prBody);

    // If no items found, complete with neutral conclusion immediately
    if (parsed.items.length === 0) {
      pipelineError = parsed.sectionTitle
        ? `"${parsed.sectionTitle}" found but contained no checkbox items.`
        : "No test plan section found or PR body was empty.";
      return;
    }

    // Stage 3: Classify
    classifiedItems = await classifyItems(parsed.items, groqApiKey);

    // Stage 4: Clone repo (only if there are shell items)
    const hasShellItems = classifiedItems.some(
      (i) => i.executorType === "shell",
    );
    if (hasShellItems) {
      let githubToken: string | undefined;
      try {
        // Get installation access token for cloning private repos
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Probot's Octokit exposes auth() but types don't surface it
        const authFn = (octokit as any).auth;
        if (typeof authFn === "function") {
          const auth = await authFn({ type: "installation" });
          if (auth && typeof auth === "object" && "token" in auth) {
            githubToken = String(auth.token);
          }
        }
      } catch {
        // Fall back to unauthenticated clone (public repos only)
        console.warn(
          "[pipeline] Could not get GitHub token — attempting unauthenticated clone",
        );
      }

      repoPath = await cloneRepo({ owner, repo, sha: headSha, githubToken });
    }

    // Stage 5: Detect preview URL (only if there are api/browser items)
    const hasWebItems = classifiedItems.some(
      (i) => i.executorType === "api" || i.executorType === "browser",
    );
    const previewUrl = hasWebItems
      ? await detectPreviewUrl({ octokit, owner, repo, pullNumber })
      : null;

    // Stage 6: Execute
    executionResults = await routeToExecutors({
      classifiedItems,
      repoPath,
      previewUrl,
      groqApiKey,
    });
  } catch (err) {
    pipelineError = `Pipeline error: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[pipeline] Error processing PR #${pullNumber}:`, err);
  } finally {
    // Stage 7: Always report — partial results are better than silence
    try {
      await reportResults({
        octokit,
        owner,
        repo,
        pullNumber,
        headSha,
        checkRunId,
        classifiedItems,
        executionResults,
        pipelineError,
      });
    } catch (reportErr) {
      console.error("[pipeline] Failed to report results:", reportErr);
    }

    // Stage 8: Cleanup cloned repo (non-fatal)
    if (repoPath) {
      await cleanupRepo(repoPath).catch((cleanupErr) => {
        console.error("[pipeline] Cleanup failed:", cleanupErr);
      });
    }
  }
}
