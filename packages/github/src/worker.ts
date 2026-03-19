/**
 * BullMQ Worker — consumes jobs from the "verify-test-plan" queue
 * and runs the orchestration pipeline for each PR.
 */

import { Worker, UnrecoverableError, type Job } from "bullmq";
import type { Probot } from "probot";
import { QUEUE_NAMES, type VerifyTestPlanJob, createLogger, isPermanentError } from "@vigil/core";
import { runPipeline, type PipelineLLMConfig } from "./services/pipeline.js";

const log = createLogger("worker");

/**
 * Create and start the BullMQ worker.
 * The worker shares the same Redis connection config as the queue producer.
 *
 * @param redisUrl - Redis connection URL (e.g., "redis://localhost:6379")
 * @param probot   - Probot instance used to authenticate as a GitHub App installation
 * @param llmConfig - LLM provider configuration (OpenAI primary, Groq fallback)
 */
export function createWorker(
  redisUrl: string,
  probot: Probot,
  llmConfig: PipelineLLMConfig,
): Worker<VerifyTestPlanJob> {
  const url = new URL(redisUrl);

  const worker = new Worker<VerifyTestPlanJob>(
    QUEUE_NAMES.VERIFY_TEST_PLAN,
    async (job: Job<VerifyTestPlanJob>) => {
      try {
        await runPipeline(job.data, probot, llmConfig);
      } catch (err) {
        if (isPermanentError(err)) {
          // Throw UnrecoverableError so BullMQ marks the job as failed (not completed) without retry
          log.warn(
            { err, jobId: job.id, owner: job.data.owner, repo: job.data.repo },
            "Permanent error — job will not be retried",
          );
          throw new UnrecoverableError(err instanceof Error ? err.message : String(err));
        }
        // Transient or unknown — rethrow so BullMQ retries per queue config (3 attempts, exponential backoff)
        throw err;
      }
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
      log.error(
        { err, jobId: job.id, owner: job.data.owner, repo: job.data.repo, pullNumber: job.data.pullNumber },
        "Job failed",
      );
    } else {
      log.error({ err }, "Job failed (no job context)");
    }
  });

  worker.on("completed", (job) => {
    log.info(
      { jobId: job.id, owner: job.data.owner, repo: job.data.repo, pullNumber: job.data.pullNumber },
      "Job completed",
    );
  });

  worker.on("error", (err) => {
    log.error({ err }, "Worker error");
  });

  return worker;
}
