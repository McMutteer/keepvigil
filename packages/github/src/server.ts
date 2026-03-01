import { createServer } from "node:http";
import { createProbot, createNodeMiddleware } from "probot";
import { createDb } from "@vigil/core/db";
import { loadConfig } from "./config.js";
import { vigilApp } from "./app.js";
import { initQueue, closeQueue } from "./services/queue.js";
import { setDatabase } from "./webhooks/installation.js";

async function main(): Promise<void> {
  const config = loadConfig();

  // Initialize database
  const db = createDb(config.databaseUrl);
  setDatabase(db);

  // Initialize BullMQ queue
  initQueue(config.redisUrl);

  // Create Probot instance
  const probot = createProbot({
    overrides: {
      appId: config.githubAppId,
      privateKey: config.githubPrivateKey,
      secret: config.githubWebhookSecret,
    },
  });

  // Create webhook middleware
  const webhookMiddleware = await createNodeMiddleware(vigilApp, { probot });

  // HTTP server with health endpoint + Probot webhooks
  const server = createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          service: "vigil-github",
          version: "0.1.0",
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    // Delegate everything else to Probot webhook middleware
    webhookMiddleware(req, res, () => {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });
  });

  server.listen(config.port, () => {
    probot.log.info(`Vigil GitHub App listening on port ${config.port}`);
    probot.log.info(`Health: http://localhost:${config.port}/health`);
    probot.log.info(`Webhooks: http://localhost:${config.port}/api/github/webhooks`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    probot.log.info("Shutting down...");
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await closeQueue();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Fatal error starting Vigil:", err);
  process.exit(1);
});
