import type { VigilConfig } from "./types.js";

/** Queue name constants shared across producer and worker packages */
export const QUEUE_NAMES = {
  VERIFY_TEST_PLAN: "verify-test-plan",
} as const;

/** Job payload for the verify-test-plan queue */
export interface VerifyTestPlanJob {
  /** GitHub installation ID as string — matches DB storage format */
  installationId: string;
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  checkRunId: number;
  /** PR title — used by v2 claims extraction */
  prTitle: string;
  prBody: string;
  /** Parsed .vigil.yml config from the head commit, or undefined if not present */
  vigiConfig?: VigilConfig;
  /** Validation warnings from parsing .vigil.yml — surfaced in the PR comment */
  configWarnings?: string[];
  /**
   * When set, only the listed item IDs are executed; all others are surfaced
   * as "not retried" in the PR comment. Undefined means run everything.
   */
  retryItemIds?: string[];
  /** GitHub login of the PR author — used for logging */
  prAuthor?: string;
  /** Stable GitHub user ID of the PR author — used for per-seat rate limiting */
  prAuthorId?: number;
  /** GitHub comment ID for the placeholder comment — used to edit in place with results */
  commentId?: number;
  /** Number of files changed in the PR — used for placeholder display */
  prChangedFiles?: number;
  /** Lines added in the PR — used for placeholder display */
  prAdditions?: number;
  /** Lines deleted in the PR — used for placeholder display */
  prDeletions?: number;
}
