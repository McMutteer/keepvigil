/** Queue name constants shared across producer and worker packages */
export const QUEUE_NAMES = {
  VERIFY_TEST_PLAN: "verify-test-plan",
} as const;

/** Job payload for the verify-test-plan queue */
export interface VerifyTestPlanJob {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  checkRunId: number;
  prBody: string;
}
