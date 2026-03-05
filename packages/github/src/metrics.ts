/**
 * Prometheus metrics for Vigil.
 *
 * Exposes operational metrics at GET /metrics in Prometheus text format.
 * Uses prom-client with a dedicated registry (avoids polluting default).
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";
import type { ServerResponse } from "node:http";
import type { Pool } from "pg";
import { createLogger } from "@vigil/core";
import { getQueue } from "./services/queue.js";

const log = createLogger("metrics");

// ---------------------------------------------------------------------------
// Registry + default metrics
// ---------------------------------------------------------------------------

export const metricsRegistry = new Registry();
metricsRegistry.setDefaultLabels({ service: "vigil-github" });

// Collect Node.js default metrics (event loop lag, GC, memory, etc.)
collectDefaultMetrics({ register: metricsRegistry });

// ---------------------------------------------------------------------------
// Application-level metrics
// ---------------------------------------------------------------------------

/** Total jobs processed, labeled by outcome */
export const jobsTotal = new Counter({
  name: "vigil_jobs_total",
  help: "Total number of verification jobs processed",
  labelNames: ["status"] as const,
  registers: [metricsRegistry],
});

/** Job pipeline duration in seconds */
export const jobDurationSeconds = new Histogram({
  name: "vigil_job_duration_seconds",
  help: "Time in seconds for a full verification pipeline to complete",
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [metricsRegistry],
});

/** Current BullMQ queue depth (waiting jobs) */
export const queueDepth = new Gauge({
  name: "vigil_queue_depth",
  help: "Number of jobs currently waiting in the verification queue",
  registers: [metricsRegistry],
});

/** PostgreSQL connection pool — total connections */
export const dbPoolTotal = new Gauge({
  name: "vigil_db_pool_total",
  help: "Total connections in the PostgreSQL pool",
  registers: [metricsRegistry],
});

/** PostgreSQL connection pool — idle connections */
export const dbPoolIdle = new Gauge({
  name: "vigil_db_pool_idle",
  help: "Idle connections in the PostgreSQL pool",
  registers: [metricsRegistry],
});

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

/**
 * Handle GET /metrics — collect live gauges and respond with Prometheus text.
 * Never throws — responds with 500 on error.
 */
export async function handleMetrics(pool: Pool, res: ServerResponse): Promise<void> {
  try {
    // Refresh live gauges before scraping
    const queue = getQueue();
    if (queue) {
      const counts = await queue.getJobCounts("waiting", "active").catch(() => ({ waiting: 0, active: 0 }));
      queueDepth.set(counts.waiting ?? 0);
    } else {
      queueDepth.set(0);
    }

    dbPoolTotal.set(pool.totalCount);
    dbPoolIdle.set(pool.idleCount);

    const metrics = await metricsRegistry.metrics();
    res.writeHead(200, { "Content-Type": metricsRegistry.contentType });
    res.end(metrics);
  } catch (err) {
    log.error({ err }, "Failed to collect metrics");
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("# Internal server error collecting metrics");
  }
}
