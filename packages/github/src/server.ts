import { createServer, type ServerResponse } from "node:http";
import type { Worker } from "bullmq";
import type { Pool } from "pg";
import { createProbot, createNodeMiddleware } from "probot";
import { createDb, schema } from "@vigil/core/db";
import { eq } from "drizzle-orm";
import { createLogger } from "@vigil/core";
import { loadConfig } from "./config.js";
import { vigilApp } from "./app.js";
import { initQueue, closeQueue, getQueue } from "./services/queue.js";
import { setDatabase } from "./webhooks/installation.js";
import { handleStripeWebhook, setStripeWebhookDeps } from "./webhooks/stripe.js";
import { handleCheckout } from "./services/checkout.js";
import { setPipelineDb } from "./services/pipeline.js";
import { createWorker } from "./worker.js";
import { handleMetrics } from "./metrics.js";

const log = createLogger("server");
const HEALTH_TIMEOUT_MS = 5_000;

async function handleHealthCheck(pool: Pool, res: ServerResponse): Promise<void> {
  const checks: Record<string, "ok" | "error"> = { db: "error", redis: "error" };

  try {
    const results = await Promise.race([
      Promise.allSettled([
        pool.query("SELECT 1"),
        getQueue()?.getJobCounts() ?? Promise.reject(new Error("Queue not initialized")),
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Health check timeout")), HEALTH_TIMEOUT_MS),
      ),
    ]);

    if (results[0].status === "fulfilled") checks.db = "ok";
    if (results[1].status === "fulfilled") checks.redis = "ok";
  } catch {
    // Timeout or unexpected error — checks stay "error"
  }

  const status = checks.db === "ok" && checks.redis === "ok" ? "ok" : "degraded";
  const httpStatus = status === "ok" ? 200 : 503;

  res.writeHead(httpStatus, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status,
      service: "vigil-github",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      checks,
    }),
  );
}

async function main(): Promise<void> {
  const config = loadConfig();

  // Initialize database
  const { db, pool } = createDb(config.databaseUrl);
  setDatabase(db);
  setPipelineDb(db);

  const stripeSecret = config.stripeForwardingSecret;
  if (stripeSecret) {
    setStripeWebhookDeps(db, stripeSecret);
  }

  // Initialize BullMQ queue
  await initQueue(config.redisUrl);

  // Create Probot instance
  const probot = createProbot({
    overrides: {
      appId: config.githubAppId,
      privateKey: config.githubPrivateKey,
      secret: config.githubWebhookSecret,
    },
  });

  // Start BullMQ worker (consumes verify-test-plan queue)
  const worker: Worker = createWorker(config.redisUrl, probot, config.groqApiKey);

  // Create webhook middleware
  const webhookMiddleware = await createNodeMiddleware(vigilApp, { probot });

  // HTTP server: health + metrics + Probot webhooks
  const server = createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      handleHealthCheck(pool, res).catch((err) => {
        log.error({ err }, "Unhandled error in health check");
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "error" }));
        }
      });
      return;
    }

    if (req.url === "/metrics" && req.method === "GET") {
      handleMetrics(pool, res).catch((err) => {
        log.error({ err }, "Unhandled error in metrics");
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("# metrics error");
        }
      });
      return;
    }

    if (req.url === "/api/stripe/webhooks" && req.method === "POST") {
      handleStripeWebhook(req, res).catch((err) => {
        log.error({ err }, "Unhandled error in Stripe webhook");
        if (!res.headersSent) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: "Internal error" }));
        }
      });
      return;
    }

    if (req.url?.startsWith("/api/checkout") && req.method === "GET") {
      handleCheckout(req, res, config).catch((err) => {
        log.error({ err }, "Unhandled error in checkout");
        if (!res.headersSent) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: "Internal error" }));
        }
      });
      return;
    }

    if (req.url?.startsWith("/api/billing-portal") && req.method === "GET") {
      (async () => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const customerId = url.searchParams.get("customer_id");

        if (!customerId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing required query param: customer_id" }));
          return;
        }

        if (!config.stripeGatewayUrl || !config.stripeGatewayApiKey) {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Billing not configured" }));
          return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        let response: Response;
        try {
          response = await fetch(`${config.stripeGatewayUrl}/billing-portal/sessions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": config.stripeGatewayApiKey,
            },
            body: JSON.stringify({
              customerId,
              returnUrl: "https://keepvigil.dev",
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (!response.ok) {
          log.error({ status: response.status }, "Stripe Gateway billing-portal returned non-OK status");
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Billing service unavailable" }));
          return;
        }

        const result = await response.json() as { success: boolean; data?: { url: string } };
        if (!result.success || !result.data?.url) {
          log.error({ result }, "Failed to create billing portal session");
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Failed to create billing portal session" }));
          return;
        }

        res.writeHead(303, { Location: result.data.url });
        res.end();
        log.info({ customerId }, "Billing portal session created, redirecting");
      })().catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        log.error({ error: msg }, "Unhandled error in billing-portal");
        if (!res.headersSent) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: "Internal error" }));
        }
      });
      return;
    }

    if (req.url?.startsWith("/api/account") && req.method === "GET") {
      (async () => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const installationId = url.searchParams.get("installation_id");

        if (!installationId || !/^\d+$/.test(installationId)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing or non-numeric query param: installation_id" }));
          return;
        }

        const rows = await db.select().from(schema.subscriptions)
          .where(eq(schema.subscriptions.installationId, Number(installationId)))
          .limit(1);

        const sub = rows[0];
        if (!sub) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ plan: "free", status: "active" }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          plan: sub.plan,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          accountLogin: sub.accountLogin,
          stripeCustomerId: sub.stripeCustomerId,
        }));
      })().catch((err) => {
        log.error({ err }, "Unhandled error in account endpoint");
        if (!res.headersSent) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: "Internal error" }));
        }
      });
      return;
    }

    // Delegate everything else to Probot webhook middleware
    webhookMiddleware(req, res, () => {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });
  });

  server.listen(config.port, () => {
    log.info({ port: config.port }, "Vigil GitHub App listening");
    log.info(`Health:   http://localhost:${config.port}/health`);
    log.info(`Metrics:  http://localhost:${config.port}/metrics`);
    log.info(`Webhooks: http://localhost:${config.port}/api/github/webhooks`);
  });

  // Graceful shutdown — anti-reentry guard prevents double-shutdown on SIGTERM + SIGINT
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      log.warn({ signal }, "Shutdown already in progress — ignoring duplicate signal");
      return;
    }
    isShuttingDown = true;

    const t0 = Date.now();
    log.info({ signal }, "Shutdown initiated");

    try {
      // Phase 1: Stop accepting new HTTP connections
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        }),
        new Promise<void>((resolve) =>
          setTimeout(() => {
            log.warn("HTTP server close timed out after 10s");
            resolve();
          }, 10_000),
        ),
      ]);
      log.info({ ms: Date.now() - t0 }, "Phase 1: HTTP server closed");

      // Phase 2: Drain BullMQ worker (up to 30s)
      await Promise.race([
        worker.close(),
        new Promise<void>((resolve) =>
          setTimeout(() => {
            log.warn("Worker close timed out after 30s, forcing shutdown");
            resolve();
          }, 30_000),
        ),
      ]);
      log.info({ ms: Date.now() - t0 }, "Phase 2: Worker drained");

      // Phase 3: Close queue connection
      await closeQueue();
      log.info({ ms: Date.now() - t0 }, "Phase 3: Queue closed");

      // Phase 4: Close DB pool
      await pool.end();
      log.info({ ms: Date.now() - t0 }, "Phase 4: DB pool closed — shutdown complete");
    } catch (err) {
      log.error({ err, ms: Date.now() - t0 }, "Error during shutdown");
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
  process.on("SIGINT", () => { void shutdown("SIGINT"); });
}

main().catch((err) => {
  log.fatal({ err }, "Fatal error starting Vigil");
  process.exit(1);
});
