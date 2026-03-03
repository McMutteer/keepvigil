import { Queue } from "bullmq";
import type { VerifyTestPlanJob } from "@vigil/core";
import { QUEUE_NAMES } from "@vigil/core";

let verifyQueue: Queue<VerifyTestPlanJob> | null = null;

/** Initialize the BullMQ queue with a Redis connection URL */
export function initQueue(redisUrl: string): void {
  if (verifyQueue) {
    throw new Error("Queue already initialized — call closeQueue() first to reinitialize");
  }
  const url = new URL(redisUrl);
  verifyQueue = new Queue<VerifyTestPlanJob>(QUEUE_NAMES.VERIFY_TEST_PLAN, {
    connection: {
      host: url.hostname,
      port: Number(url.port) || 6379,
      password: url.password || undefined,
    },
  });
}

/** Enqueue a test plan verification job. Queue must be initialized first. */
export async function enqueueVerification(job: VerifyTestPlanJob): Promise<string> {
  if (!verifyQueue) {
    throw new Error("Queue not initialized — call initQueue() first");
  }

  // Deduplicate by PR — if a new push arrives while a job is queued, BullMQ
  // recognises the same jobId and won't add a duplicate.
  const jobId = `${job.owner}/${job.repo}#${job.pullNumber}`;

  const added = await verifyQueue.add("verify", job, {
    jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  });

  return added.id ?? "unknown";
}

/** Close the queue connection gracefully */
export async function closeQueue(): Promise<void> {
  if (verifyQueue) {
    await verifyQueue.close();
    verifyQueue = null;
  }
}
