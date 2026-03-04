/**
 * BullMQ Worker — consumes jobs from the "verify-test-plan" queue
 * and runs the orchestration pipeline for each PR.
 */

import { Worker, type Job } from "bullmq";
import type { Probot } from "probot";
import { QUEUE_NAMES, type VerifyTestPlanJob } from "@vigil/core";
import { runPipeline } from "./services/pipeline.js";

/**
 * Create and start the BullMQ worker.
 * The worker shares the same Redis connection config as the queue producer.
 *
 * @param redisUrl - Redis connection URL (e.g., "redis://localhost:6379")
 * @param probot   - Probot instance used to authenticate as a GitHub App installation
 * @param groqApiKey - Groq API key passed to executors that use Claude
 */
export function createWorker(
  redisUrl: string,
  probot: Probot,
  groqApiKey: string,
): Worker<VerifyTestPlanJob> {
  const url = new URL(redisUrl);

  const worker = new Worker<VerifyTestPlanJob>(
    QUEUE_NAMES.VERIFY_TEST_PLAN,
    async (job: Job<VerifyTestPlanJob>) => {
      await runPipeline(job.data, probot, groqApiKey);
    },
    {
      connection: {
        host: url.hostname,
        port: Number(url.port) || 6379,
        password: url.password || undefined,
      },
      concurrency: 5, // Process up to 5 PRs simultaneously
    },
  );

  worker.on("failed", (job, err) => {
    if (job) {
      console.error(
        `[worker] Job ${job.id} failed (${job.data.owner}/${job.data.repo}#${job.data.pullNumber}):`,
        err,
      );
    } else {
      console.error("[worker] Job failed (no job context):", err);
    }
  });

  worker.on("completed", (job) => {
    console.info(
      `[worker] Job ${job.id} completed (${job.data.owner}/${job.data.repo}#${job.data.pullNumber})`,
    );
  });

  worker.on("error", (err) => {
    console.error("[worker] Worker error:", err);
  });

  return worker;
}
