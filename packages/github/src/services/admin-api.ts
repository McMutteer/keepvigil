/**
 * Admin API — internal operations endpoints for the admin panel.
 * All endpoints require admin auth (hardcoded GitHub user ID allowlist).
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { desc, eq, sql, and, gte, lte, count } from "drizzle-orm";
import type { Database } from "@vigil/core/db";
import { schema } from "@vigil/core/db";
import type { AppConfig } from "../config.js";
import { requireSession } from "./auth-middleware.js";

/** GitHub user IDs allowed to access admin endpoints (requires ADMIN_USER_IDS env var) */
function getAdminIds(): number[] {
  const raw = process.env.ADMIN_USER_IDS;
  if (!raw) return [];
  return raw.split(",").map((id) => Number(id.trim())).filter((id) => id > 0);
}

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

function parseDateParam(url: URL, param: string): Date | null {
  const raw = url.searchParams.get(param);
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

async function requireAdmin(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
): Promise<boolean> {
  const session = await requireSession(req, res, config);
  if (!session) return false;
  if (!getAdminIds().includes(session.userId)) {
    json(res, 403, { error: "Admin access required" });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// GET /api/admin/overview
// ---------------------------------------------------------------------------

async function handleOverview(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  db: Database,
): Promise<void> {
  if (!await requireAdmin(req, res, config)) return;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    costToday, costWeek, costMonth,
    prsToday, prsTotal,
    installationsTotal, installationsWeek,
    errorsDay,
    recentExecutions,
  ] = await Promise.all([
    // LLM spend today
    db.select({ total: sql<number>`COALESCE(SUM(${schema.llmUsage.estimatedCostUsd}), 0)` })
      .from(schema.llmUsage)
      .where(gte(schema.llmUsage.createdAt, todayStart)),
    // LLM spend this week
    db.select({ total: sql<number>`COALESCE(SUM(${schema.llmUsage.estimatedCostUsd}), 0)` })
      .from(schema.llmUsage)
      .where(gte(schema.llmUsage.createdAt, weekStart)),
    // LLM spend this month
    db.select({ total: sql<number>`COALESCE(SUM(${schema.llmUsage.estimatedCostUsd}), 0)` })
      .from(schema.llmUsage)
      .where(gte(schema.llmUsage.createdAt, monthStart)),
    // PRs processed today
    db.select({ total: count() })
      .from(schema.executions)
      .where(gte(schema.executions.startedAt, todayStart)),
    // PRs total
    db.select({ total: count() })
      .from(schema.executions),
    // Active installations
    db.select({ total: count() })
      .from(schema.installations)
      .where(eq(schema.installations.active, true)),
    // New installations this week
    db.select({ total: count() })
      .from(schema.installations)
      .where(gte(schema.installations.createdAt, weekStart)),
    // Errors last 24h
    db.select({ total: count() })
      .from(schema.executions)
      .where(and(
        eq(schema.executions.status, "failed"),
        gte(schema.executions.startedAt, last24h),
      )),
    // Recent 20 executions
    db.select({
      id: schema.executions.id,
      owner: schema.executions.owner,
      repo: schema.executions.repo,
      pullNumber: schema.executions.pullNumber,
      score: schema.executions.score,
      status: schema.executions.status,
      startedAt: schema.executions.startedAt,
      error: schema.executions.error,
    })
      .from(schema.executions)
      .orderBy(desc(schema.executions.startedAt))
      .limit(20),
  ]);

  json(res, 200, {
    llmSpend: {
      today: costToday[0]?.total ?? 0,
      week: costWeek[0]?.total ?? 0,
      month: costMonth[0]?.total ?? 0,
    },
    prsProcessed: {
      today: prsToday[0]?.total ?? 0,
      total: prsTotal[0]?.total ?? 0,
    },
    installations: {
      active: installationsTotal[0]?.total ?? 0,
      newThisWeek: installationsWeek[0]?.total ?? 0,
    },
    errors: {
      last24h: errorsDay[0]?.total ?? 0,
    },
    recentExecutions,
  });
}

// ---------------------------------------------------------------------------
// GET /api/admin/costs?from=&to=
// ---------------------------------------------------------------------------

async function handleCosts(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  db: Database,
): Promise<void> {
  if (!await requireAdmin(req, res, config)) return;

  const url = parseUrl(req);
  const from = parseDateParam(url, "from") ?? new Date(Date.now() - 30 * 86400_000);
  const to = parseDateParam(url, "to") ?? new Date();

  const dateFilter = and(gte(schema.llmUsage.createdAt, from), lte(schema.llmUsage.createdAt, to));

  const [dailyCosts, byRepo, byModel, bySignal, byInstallation, tokenTotals, prCount] = await Promise.all([
    // Daily cost aggregation
    db.select({
      date: sql<string>`DATE(${schema.llmUsage.createdAt})`.as("date"),
      total: sql<number>`SUM(${schema.llmUsage.estimatedCostUsd})`,
      calls: count(),
    })
      .from(schema.llmUsage)
      .where(dateFilter)
      .groupBy(sql`DATE(${schema.llmUsage.createdAt})`)
      .orderBy(sql`DATE(${schema.llmUsage.createdAt})`),
    // By repo (top 10) with avg per PR
    db.select({
      owner: schema.llmUsage.owner,
      repo: schema.llmUsage.repo,
      total: sql<number>`SUM(${schema.llmUsage.estimatedCostUsd})`,
      calls: count(),
      avgPerPR: sql<number>`SUM(${schema.llmUsage.estimatedCostUsd}) / NULLIF(COUNT(DISTINCT ${schema.llmUsage.correlationId}), 0)`,
      prs: sql<number>`COUNT(DISTINCT ${schema.llmUsage.correlationId})`,
    })
      .from(schema.llmUsage)
      .where(dateFilter)
      .groupBy(schema.llmUsage.owner, schema.llmUsage.repo)
      .orderBy(desc(sql`SUM(${schema.llmUsage.estimatedCostUsd})`))
      .limit(10),
    // By model with token breakdown
    db.select({
      provider: schema.llmUsage.provider,
      model: schema.llmUsage.model,
      total: sql<number>`SUM(${schema.llmUsage.estimatedCostUsd})`,
      calls: count(),
      promptTokens: sql<number>`SUM(${schema.llmUsage.promptTokens})`,
      completionTokens: sql<number>`SUM(${schema.llmUsage.completionTokens})`,
    })
      .from(schema.llmUsage)
      .where(dateFilter)
      .groupBy(schema.llmUsage.provider, schema.llmUsage.model)
      .orderBy(desc(sql`SUM(${schema.llmUsage.estimatedCostUsd})`)),
    // By signal
    db.select({
      signalId: schema.llmUsage.signalId,
      total: sql<number>`SUM(${schema.llmUsage.estimatedCostUsd})`,
      calls: count(),
      avgTokens: sql<number>`AVG(${schema.llmUsage.totalTokens})`,
    })
      .from(schema.llmUsage)
      .where(dateFilter)
      .groupBy(schema.llmUsage.signalId)
      .orderBy(desc(sql`SUM(${schema.llmUsage.estimatedCostUsd})`)),
    // By installation
    db.select({
      installationId: schema.llmUsage.installationId,
      total: sql<number>`SUM(${schema.llmUsage.estimatedCostUsd})`,
      calls: count(),
      prs: sql<number>`COUNT(DISTINCT ${schema.llmUsage.correlationId})`,
    })
      .from(schema.llmUsage)
      .where(dateFilter)
      .groupBy(schema.llmUsage.installationId)
      .orderBy(desc(sql`SUM(${schema.llmUsage.estimatedCostUsd})`)),
    // Token totals
    db.select({
      promptTokens: sql<number>`COALESCE(SUM(${schema.llmUsage.promptTokens}), 0)`,
      completionTokens: sql<number>`COALESCE(SUM(${schema.llmUsage.completionTokens}), 0)`,
      totalTokens: sql<number>`COALESCE(SUM(${schema.llmUsage.totalTokens}), 0)`,
      totalCost: sql<number>`COALESCE(SUM(${schema.llmUsage.estimatedCostUsd}), 0)`,
    })
      .from(schema.llmUsage)
      .where(dateFilter),
    // Distinct PR count
    db.select({
      total: sql<number>`COUNT(DISTINCT ${schema.llmUsage.correlationId})`,
    })
      .from(schema.llmUsage)
      .where(dateFilter),
  ]);

  const totals = tokenTotals[0] ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0, totalCost: 0 };
  const totalPRs = prCount[0]?.total ?? 0;

  // Enrich byInstallation with account login
  const installationLogins = await db.select({
    githubInstallationId: schema.installations.githubInstallationId,
    accountLogin: schema.installations.accountLogin,
  }).from(schema.installations);
  const loginMap = new Map(installationLogins.map((i) => [i.githubInstallationId, i.accountLogin]));

  json(res, 200, {
    period: { from: from.toISOString(), to: to.toISOString() },
    daily: dailyCosts,
    byRepo,
    byModel,
    bySignal,
    byInstallation: byInstallation.map((i) => ({
      ...i,
      accountLogin: loginMap.get(i.installationId) ?? i.installationId,
    })),
    totals,
    avgCostPerPR: totalPRs > 0 ? totals.totalCost / totalPRs : 0,
    totalPRs,
  });
}

// ---------------------------------------------------------------------------
// GET /api/admin/installations
// ---------------------------------------------------------------------------

async function handleInstallations(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  db: Database,
): Promise<void> {
  if (!await requireAdmin(req, res, config)) return;

  const installations = await db.select({
    id: schema.installations.id,
    githubInstallationId: schema.installations.githubInstallationId,
    accountLogin: schema.installations.accountLogin,
    accountType: schema.installations.accountType,
    active: schema.installations.active,
    createdAt: schema.installations.createdAt,
  })
    .from(schema.installations)
    .orderBy(desc(schema.installations.createdAt));

  // Enrich with execution stats, subscription, repos, and LLM cost per installation
  const enriched = await Promise.all(installations.map(async (inst) => {
    const instId = inst.githubInstallationId;

    const [stats, sub, repos, llmCost] = await Promise.all([
      db.select({
        totalPRs: count(),
        avgScore: sql<number>`ROUND(AVG(${schema.executions.score}))`.as("avg_score"),
        lastPRAt: sql<string>`MAX(${schema.executions.startedAt})`.as("last_pr"),
        completedCount: sql<number>`COUNT(*) FILTER (WHERE ${schema.executions.status} = 'completed')`.as("completed"),
        failedCount: sql<number>`COUNT(*) FILTER (WHERE ${schema.executions.status} = 'failed')`.as("failed"),
      })
        .from(schema.executions)
        .where(eq(schema.executions.installationId, instId)),
      db.select({ plan: schema.subscriptions.plan, status: schema.subscriptions.status })
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.installationId, instId))
        .limit(1),
      db.select({
        owner: schema.executions.owner,
        repo: schema.executions.repo,
        prCount: count(),
        avgScore: sql<number>`ROUND(AVG(${schema.executions.score}))`.as("avg_score"),
        latestAt: sql<string>`MAX(${schema.executions.startedAt})`.as("latest"),
      })
        .from(schema.executions)
        .where(eq(schema.executions.installationId, instId))
        .groupBy(schema.executions.owner, schema.executions.repo)
        .orderBy(desc(sql`MAX(${schema.executions.startedAt})`)),
      db.select({
        total: sql<number>`COALESCE(SUM(${schema.llmUsage.estimatedCostUsd}), 0)`,
        calls: count(),
      })
        .from(schema.llmUsage)
        .where(eq(schema.llmUsage.installationId, instId)),
    ]);

    const s = stats[0];
    return {
      ...inst,
      plan: sub[0]?.plan ?? "free",
      subscriptionStatus: sub[0]?.status ?? "none",
      totalPRs: s?.totalPRs ?? 0,
      avgScore: s?.avgScore ?? null,
      completedPRs: s?.completedCount ?? 0,
      failedPRs: s?.failedCount ?? 0,
      lastPRAt: s?.lastPRAt ?? null,
      llmCost: llmCost[0]?.total ?? 0,
      llmCalls: llmCost[0]?.calls ?? 0,
      repos,
    };
  }));

  json(res, 200, { installations: enriched });
}

// ---------------------------------------------------------------------------
// GET /api/admin/executions?page=&repo=&from=&to=
// ---------------------------------------------------------------------------

async function handleExecutions(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  db: Database,
): Promise<void> {
  if (!await requireAdmin(req, res, config)) return;

  const url = parseUrl(req);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const offset = (page - 1) * limit;
  const repoFilter = url.searchParams.get("repo");
  const from = parseDateParam(url, "from");
  const to = parseDateParam(url, "to");

  const conditions = [];
  if (repoFilter) conditions.push(eq(schema.executions.repo, repoFilter));
  if (from) conditions.push(gte(schema.executions.startedAt, from));
  if (to) conditions.push(lte(schema.executions.startedAt, to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select()
      .from(schema.executions)
      .where(where)
      .orderBy(desc(schema.executions.startedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() })
      .from(schema.executions)
      .where(where),
  ]);

  const total = countResult[0]?.total ?? 0;

  json(res, 200, {
    executions: rows.map((r) => ({
      id: r.id,
      jobId: r.jobId,
      installationId: r.installationId,
      owner: r.owner,
      repo: r.repo,
      pullNumber: r.pullNumber,
      score: r.score,
      status: r.status,
      pipelineMode: r.pipelineMode,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      error: r.error,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// ---------------------------------------------------------------------------
// GET /api/admin/executions/:id
// ---------------------------------------------------------------------------

async function handleExecutionDetail(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  db: Database,
  executionId: string,
): Promise<void> {
  if (!await requireAdmin(req, res, config)) return;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(executionId)) {
    json(res, 400, { error: "Invalid execution ID" });
    return;
  }

  const [execution] = await db.select()
    .from(schema.executions)
    .where(eq(schema.executions.id, executionId))
    .limit(1);

  if (!execution) {
    json(res, 404, { error: "Execution not found" });
    return;
  }

  // Get LLM usage for this execution's correlation ID
  const llmUsage = await db.select()
    .from(schema.llmUsage)
    .where(eq(schema.llmUsage.correlationId, execution.jobId))
    .orderBy(schema.llmUsage.createdAt);

  json(res, 200, {
    ...execution,
    llmUsage,
  });
}

// ---------------------------------------------------------------------------
// GET /api/admin/errors?from=&to=
// ---------------------------------------------------------------------------

async function handleErrors(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  db: Database,
): Promise<void> {
  if (!await requireAdmin(req, res, config)) return;

  const url = parseUrl(req);
  const from = parseDateParam(url, "from") ?? new Date(Date.now() - 7 * 86400_000);
  const to = parseDateParam(url, "to") ?? new Date();

  const where = and(
    eq(schema.executions.status, "failed"),
    gte(schema.executions.startedAt, from),
    lte(schema.executions.startedAt, to),
  );

  const [errors, countResult] = await Promise.all([
    db.select({
      id: schema.executions.id,
      owner: schema.executions.owner,
      repo: schema.executions.repo,
      pullNumber: schema.executions.pullNumber,
      error: schema.executions.error,
      jobId: schema.executions.jobId,
      startedAt: schema.executions.startedAt,
    })
      .from(schema.executions)
      .where(where)
      .orderBy(desc(schema.executions.startedAt))
      .limit(100),
    db.select({ total: count() })
      .from(schema.executions)
      .where(where),
  ]);

  json(res, 200, {
    period: { from: from.toISOString(), to: to.toISOString() },
    errors,
    total: countResult[0]?.total ?? 0,
  });
}

// ---------------------------------------------------------------------------
// GET /api/admin/subscriptions
// ---------------------------------------------------------------------------

async function handleSubscriptions(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  db: Database,
): Promise<void> {
  if (!await requireAdmin(req, res, config)) return;

  const subs = await db.select()
    .from(schema.subscriptions)
    .orderBy(desc(schema.subscriptions.createdAt));

  // Calculate MRR
  const proPriceMonthly = 12;
  const teamPriceMonthly = 24;
  let mrr = 0;
  for (const sub of subs) {
    if (sub.status !== "active") continue;
    if (sub.plan === "pro") mrr += proPriceMonthly;
    else if (sub.plan === "team") mrr += teamPriceMonthly;
  }

  json(res, 200, {
    subscriptions: subs.map((s) => ({
      id: s.id,
      installationId: s.installationId,
      accountLogin: s.accountLogin,
      plan: s.plan,
      status: s.status,
      stripeCustomerId: s.stripeCustomerId,
      stripeSubscriptionId: s.stripeSubscriptionId,
      currentPeriodEnd: s.currentPeriodEnd,
      createdAt: s.createdAt,
    })),
    mrr,
    total: subs.length,
    activePro: subs.filter((s) => s.plan === "pro" && s.status === "active").length,
    activeTeam: subs.filter((s) => s.plan === "team" && s.status === "active").length,
  });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function handleAdminApi(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  db: Database,
): Promise<void> {
  const url = parseUrl(req);
  const path = url.pathname;

  if (req.method !== "GET") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  // GET /api/admin/overview
  if (path === "/api/admin/overview") {
    await handleOverview(req, res, config, db);
    return;
  }

  // GET /api/admin/costs
  if (path === "/api/admin/costs") {
    await handleCosts(req, res, config, db);
    return;
  }

  // GET /api/admin/installations
  if (path === "/api/admin/installations") {
    await handleInstallations(req, res, config, db);
    return;
  }

  // GET /api/admin/executions/:id
  const detailMatch = path.match(/^\/api\/admin\/executions\/([^/]+)$/);
  if (detailMatch) {
    await handleExecutionDetail(req, res, config, db, detailMatch[1]);
    return;
  }

  // GET /api/admin/executions
  if (path === "/api/admin/executions") {
    await handleExecutions(req, res, config, db);
    return;
  }

  // GET /api/admin/errors
  if (path === "/api/admin/errors") {
    await handleErrors(req, res, config, db);
    return;
  }

  // GET /api/admin/subscriptions
  if (path === "/api/admin/subscriptions") {
    await handleSubscriptions(req, res, config, db);
    return;
  }

  json(res, 404, { error: "Not found" });
}
