/**
 * Dashboard API — read-only endpoints for the dashboard SPA.
 * All endpoints require a valid session and installation access.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { desc, eq, sql, and, count } from "drizzle-orm";
import type { Database } from "@vigil/core/db";
import { schema } from "@vigil/core/db";
import type { AppConfig } from "../config.js";
import { requireInstallationAccess } from "./auth-middleware.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseUrl(req: IncomingMessage): URL {
  return new URL(req.url!, `http://${req.headers.host}`);
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function parseInstallationId(url: URL): number | null {
  const raw = url.searchParams.get("installation_id");
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 && id <= 2147483647 ? id : null;
}

// ---------------------------------------------------------------------------
// GET /api/dashboard/executions?installation_id=X&page=1&limit=20
// ---------------------------------------------------------------------------

export async function handleExecutions(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  db: Database,
): Promise<void> {
  const url = parseUrl(req);
  const installationId = parseInstallationId(url);

  if (!installationId) {
    json(res, 400, { error: "Missing or invalid installation_id" });
    return;
  }

  const session = await requireInstallationAccess(req, res, config, installationId);
  if (!session) return;

  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const offset = (page - 1) * limit;

  const [rows, countResult] = await Promise.all([
    db.select()
      .from(schema.executions)
      .where(eq(schema.executions.installationId, String(installationId)))
      .orderBy(desc(schema.executions.startedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() })
      .from(schema.executions)
      .where(eq(schema.executions.installationId, String(installationId))),
  ]);

  const total = countResult[0]?.total ?? 0;

  json(res, 200, {
    executions: rows.map((r) => ({
      id: r.id,
      owner: r.owner,
      repo: r.repo,
      pullNumber: r.pullNumber,
      headSha: r.headSha,
      status: r.status,
      score: r.score,
      pipelineMode: r.pipelineMode,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      error: r.error,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ---------------------------------------------------------------------------
// GET /api/dashboard/executions/:id
// ---------------------------------------------------------------------------

export async function handleExecutionDetail(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  db: Database,
  executionId: string,
  installationId: number,
): Promise<void> {
  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(executionId)) {
    json(res, 400, { error: "Invalid execution ID" });
    return;
  }

  // Check authorization before querying
  const session = await requireInstallationAccess(req, res, config, installationId);
  if (!session) return;

  const rows = await db.select()
    .from(schema.executions)
    .where(eq(schema.executions.id, executionId))
    .limit(1);

  const execution = rows[0];
  if (!execution) {
    json(res, 404, { error: "Execution not found" });
    return;
  }

  json(res, 200, {
    id: execution.id,
    jobId: execution.jobId,
    owner: execution.owner,
    repo: execution.repo,
    pullNumber: execution.pullNumber,
    headSha: execution.headSha,
    status: execution.status,
    score: execution.score,
    pipelineMode: execution.pipelineMode,
    startedAt: execution.startedAt,
    completedAt: execution.completedAt,
    resultsSummary: execution.resultsSummary,
    error: execution.error,
  });
}

// ---------------------------------------------------------------------------
// GET /api/dashboard/stats?installation_id=X
// ---------------------------------------------------------------------------

export async function handleStats(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  db: Database,
): Promise<void> {
  const url = parseUrl(req);
  const installationId = parseInstallationId(url);

  if (!installationId) {
    json(res, 400, { error: "Missing or invalid installation_id" });
    return;
  }

  const session = await requireInstallationAccess(req, res, config, installationId);
  if (!session) return;

  const instId = String(installationId);

  const [statsResult, recentFailures] = await Promise.all([
    db.select({
      totalPRs: count(),
      avgScore: sql<number>`ROUND(AVG(${schema.executions.score}))`.as("avg_score"),
      completedCount: sql<number>`COUNT(*) FILTER (WHERE ${schema.executions.status} = 'completed')`.as("completed_count"),
      failedCount: sql<number>`COUNT(*) FILTER (WHERE ${schema.executions.status} = 'failed')`.as("failed_count"),
    })
      .from(schema.executions)
      .where(eq(schema.executions.installationId, instId)),
    db.select({
      repo: schema.executions.repo,
      failCount: count(),
    })
      .from(schema.executions)
      .where(and(
        eq(schema.executions.installationId, instId),
        eq(schema.executions.status, "failed"),
      ))
      .groupBy(schema.executions.repo)
      .orderBy(desc(count()))
      .limit(5),
  ]);

  const stats = statsResult[0];

  json(res, 200, {
    totalPRs: stats?.totalPRs ?? 0,
    avgScore: stats?.avgScore ?? 0,
    completedCount: stats?.completedCount ?? 0,
    failedCount: stats?.failedCount ?? 0,
    topFailingRepos: recentFailures.map((r) => ({ repo: r.repo, failCount: r.failCount })),
  });
}

// ---------------------------------------------------------------------------
// GET /api/dashboard/repos?installation_id=X
// ---------------------------------------------------------------------------

export async function handleRepos(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  db: Database,
): Promise<void> {
  const url = parseUrl(req);
  const installationId = parseInstallationId(url);

  if (!installationId) {
    json(res, 400, { error: "Missing or invalid installation_id" });
    return;
  }

  const session = await requireInstallationAccess(req, res, config, installationId);
  if (!session) return;

  const instId = String(installationId);

  const repos = await db.select({
    owner: schema.executions.owner,
    repo: schema.executions.repo,
    prCount: count(),
    avgScore: sql<number>`ROUND(AVG(${schema.executions.score}))`.as("avg_score"),
    latestAt: sql<string>`MAX(${schema.executions.startedAt})`.as("latest_at"),
  })
    .from(schema.executions)
    .where(eq(schema.executions.installationId, instId))
    .groupBy(schema.executions.owner, schema.executions.repo)
    .orderBy(desc(sql`MAX(${schema.executions.startedAt})`));

  json(res, 200, {
    repos: repos.map((r) => ({
      owner: r.owner,
      repo: r.repo,
      prCount: r.prCount,
      avgScore: r.avgScore,
      latestAt: r.latestAt,
    })),
  });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function handleDashboardApi(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  db: Database,
): Promise<void> {
  const url = parseUrl(req);
  const path = url.pathname;

  // GET /api/dashboard/executions/:id?installation_id=X
  const detailMatch = path.match(/^\/api\/dashboard\/executions\/([^/]+)$/);
  if (detailMatch && req.method === "GET") {
    const installationId = parseInstallationId(url);
    if (!installationId) {
      json(res, 400, { error: "Missing or invalid installation_id" });
      return;
    }
    await handleExecutionDetail(req, res, config, db, detailMatch[1], installationId);
    return;
  }

  // GET /api/dashboard/executions
  if (path === "/api/dashboard/executions" && req.method === "GET") {
    await handleExecutions(req, res, config, db);
    return;
  }

  // GET /api/dashboard/stats
  if (path === "/api/dashboard/stats" && req.method === "GET") {
    await handleStats(req, res, config, db);
    return;
  }

  // GET /api/dashboard/repos
  if (path === "/api/dashboard/repos" && req.method === "GET") {
    await handleRepos(req, res, config, db);
    return;
  }

  json(res, 404, { error: "Not found" });
}
