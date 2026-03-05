/**
 * Detects the preview deployment URL for a pull request.
 * Checks GitHub Deployments API (Vercel/Netlify) then PR check runs.
 * Returns null if no live preview is found.
 */

import type { ProbotOctokit } from "probot";
import { createLogger } from "@vigil/core";

const log = createLogger("preview-url");

export interface DetectPreviewUrlOptions {
  octokit: ProbotOctokit;
  owner: string;
  repo: string;
  pullNumber: number;
}

/** Known deployment environment names used by Vercel and Netlify */
const PREVIEW_ENVIRONMENTS = ["Preview", "preview", "staging"];

/** GitHub app slugs for deployment platforms */
const DEPLOY_APP_SLUGS = ["vercel", "netlify"];

/**
 * Detect the live preview URL for a PR using two strategies:
 * 1. GitHub Deployments API — checks recent successful deployments
 * 2. Check runs — inspects Vercel/Netlify check suites for deployment URLs
 *
 * Returns null when no preview URL is found (api/browser tests will be skipped).
 */
export async function detectPreviewUrl(
  options: DetectPreviewUrlOptions,
): Promise<string | null> {
  const { octokit, owner, repo, pullNumber } = options;

  // Strategy 1: GitHub Deployments API
  for (const environment of PREVIEW_ENVIRONMENTS) {
    try {
      const { data: deployments } = await octokit.rest.repos.listDeployments({
        owner,
        repo,
        environment,
        ref: `refs/pull/${pullNumber}/head`,
        per_page: 10,
      });

      for (const deployment of deployments) {
        try {
          const { data: statuses } =
            await octokit.rest.repos.listDeploymentStatuses({
              owner,
              repo,
              deployment_id: deployment.id,
              per_page: 5,
            });

          const success = statuses.find((s) => s.state === "success");
          if (success?.environment_url) {
            return success.environment_url;
          }
        } catch {
          // Ignore per-deployment errors and continue
        }
      }
    } catch (err) {
      log.warn({ err, environment }, "Could not fetch deployments");
    }
  }

  // Strategy 2: Check run suites from Vercel/Netlify for this PR
  try {
    const { data: checkSuites } = await octokit.rest.checks.listSuitesForRef({
      owner,
      repo,
      ref: `refs/pull/${pullNumber}/head`,
    });

    for (const suite of checkSuites.check_suites) {
      if (!DEPLOY_APP_SLUGS.includes(suite.app?.slug ?? "")) continue;

      const { data: runs } = await octokit.rest.checks.listForSuite({
        owner,
        repo,
        check_suite_id: suite.id,
      });

      for (const run of runs.check_runs) {
        if (run.conclusion === "success" && run.output?.summary) {
          // Vercel/Netlify embed the preview URL in the check run summary as a markdown link
          const urlMatch = run.output.summary.match(
            /https?:\/\/[a-z0-9][a-z0-9-]*\.(?:vercel|netlify)\.app/i,
          );
          if (urlMatch) {
            return urlMatch[0];
          }
        }
      }
    }
  } catch (err) {
    log.warn({ err }, "Could not fetch check suites");
  }

  return null;
}
