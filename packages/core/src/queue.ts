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
  prBody: string;
  /** Parsed .vigil.yml config from the head commit, or undefined if not present */
  vigiConfig?: VigilConfig;
}
