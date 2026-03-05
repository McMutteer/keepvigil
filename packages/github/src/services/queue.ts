import { Queue } from "bullmq";
import type { VerifyTestPlanJob } from "@vigil/core";
import { QUEUE_NAMES } from "@vigil/core";

let verifyQueue: Queue<VerifyTestPlanJob> | null = null;
let initPromise: Promise<void> | null = null;

/** Initialize the BullMQ queue with a Redis connection URL */
export function initQueue(redisUrl: string): Promise<void> {
  if (verifyQueue) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = new Promise<void>((resolve, reject) => {
    try {
      const url = new URL(redisUrl);
      verifyQueue = new Queue<VerifyTestPlanJob>(QUEUE_NAMES.VERIFY_TEST_PLAN, {
        connection: {
          host: url.hostname,
          port: Number(url.port) || 6379,
          password: url.password || undefined,
        },
      });
      resolve();
    } catch (err) {
      initPromise = null;
      reject(err);
    }
  });

  return initPromise;
}

/** Maximum PR body size allowed in queue payload (50 KB) */
const MAX_PR_BODY_LENGTH = 50_000;

/** Enqueue a test plan verification job. Queue must be initialized first. */
export async function enqueueVerification(job: VerifyTestPlanJob): Promise<string> {
  if (!verifyQueue) {
    throw new Error("Queue not initialized — call initQueue() first");
  }

  // Truncate oversized PR bodies to prevent memory abuse in Redis
  if (job.prBody.length > MAX_PR_BODY_LENGTH) {
    job = { ...job, prBody: job.prBody.slice(0, MAX_PR_BODY_LENGTH) };
  }

  // Deduplicate by PR — if a new push arrives while a job is queued, BullMQ
  // recognises the same jobId and won't add a duplicate.
  const jobId = `${job.installationId}:${job.owner}/${job.repo}#${job.pullNumber}`;

  const added = await verifyQueue.add("verify", job, {
    jobId,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 200,
  });

  return added.id ?? "unknown";
}

/** Get the underlying queue instance (for health checks). Returns null if not initialized. */
export function getQueue(): Queue<VerifyTestPlanJob> | null {
  return verifyQueue;
}

/** Close the queue connection gracefully */
export async function closeQueue(): Promise<void> {
  if (verifyQueue) {
    await verifyQueue.close();
    verifyQueue = null;
    initPromise = null;
  }
}
