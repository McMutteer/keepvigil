import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleDashboardApi } from "../services/dashboard-api.js";
import { createSessionToken, type SessionPayload } from "../services/auth.js";
import type { AppConfig } from "../config.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    githubAppId: "123",
    githubPrivateKey: "key",
    githubWebhookSecret: "secret",
    redisUrl: "redis://localhost:6379",
    databaseUrl: "postgresql://localhost/vigil",
    groqApiKey: "",
    groqModel: "test",
    githubClientId: "Iv1.test",
    githubClientSecret: "client-secret",
    sessionSecret: "a-secret-that-is-at-least-32-bytes-long",
    stripeGatewayUrl: "",
    stripeGatewayApiKey: "",
    stripeForwardingSecret: "",
    stripeProPriceId: "",
    stripeTeamPriceId: "",
    port: 3200,
    nodeEnv: "test",
    ...overrides,
  };
}

function makeReq(url: string, cookie?: string): IncomingMessage {
  return {
    url,
    method: "GET",
    headers: cookie ? { cookie, host: "keepvigil.dev" } : { host: "keepvigil.dev" },
  } as unknown as IncomingMessage;
}

function makeRes(): ServerResponse & { _status: number; _body: string } {
  const res = {
    _status: 0,
    _body: "",
    headersSent: false,
    writeHead(status: number) {
      res._status = status;
      return res;
    },
    setHeader() { return res; },
    end(body?: string) {
      if (body) res._body = body;
    },
  };
  return res as unknown as ServerResponse & typeof res;
}

async function makeCookie(config: AppConfig, installationIds: number[] = [111]): Promise<string> {
  const session: SessionPayload = {
    userId: 123,
    login: "dev",
    avatarUrl: "https://avatar.url",
    installationIds,
  };
  const token = await createSessionToken(session, config);
  return `vigil_session=${token}`;
}

// ---------------------------------------------------------------------------
// Mock database helpers
// ---------------------------------------------------------------------------

function makeMockDb(rows: unknown[] = [], _countResult = [{ total: 0 }]) {
  const limitFn = vi.fn().mockReturnValue({
    offset: vi.fn().mockResolvedValue(rows),
  });
  const orderByFn = vi.fn().mockImplementation(function (this: unknown) {
    return {
      limit: limitFn,
      // For repos query that has no limit/offset
      then: (resolve: (v: unknown) => void) => resolve(rows),
    };
  });
  const groupByFn = vi.fn().mockReturnValue({ orderBy: orderByFn });
  const whereFn = vi.fn().mockReturnValue({
    orderBy: orderByFn,
    limit: vi.fn().mockResolvedValue(rows),
    groupBy: groupByFn,
  });

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: whereFn,
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("dashboard-api", () => {
  const config = makeConfig();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/dashboard/executions", () => {
    it("returns 401 when not authenticated", async () => {
      const res = makeRes();
      const db = makeMockDb();

      await handleDashboardApi(
        makeReq("/api/dashboard/executions?installation_id=111"),
        res, config, db as any,
      );

      expect(res._status).toBe(401);
    });

    it("returns 400 when installation_id is missing", async () => {
      const cookie = await makeCookie(config);
      const res = makeRes();
      const db = makeMockDb();

      await handleDashboardApi(
        makeReq("/api/dashboard/executions", cookie),
        res, config, db as any,
      );

      expect(res._status).toBe(400);
    });

    it("returns 403 when user lacks installation access", async () => {
      const cookie = await makeCookie(config, [222]); // different installation
      const res = makeRes();
      const db = makeMockDb();

      await handleDashboardApi(
        makeReq("/api/dashboard/executions?installation_id=111", cookie),
        res, config, db as any,
      );

      expect(res._status).toBe(403);
    });
  });

  describe("GET /api/dashboard/executions/:id", () => {
    it("returns 400 for invalid UUID", async () => {
      const cookie = await makeCookie(config);
      const res = makeRes();
      const db = makeMockDb();

      await handleDashboardApi(
        makeReq("/api/dashboard/executions/not-a-uuid", cookie),
        res, config, db as any,
      );

      expect(res._status).toBe(400);
    });

    it("returns 404 when execution does not exist", async () => {
      const cookie = await makeCookie(config);
      const res = makeRes();
      const db = makeMockDb([]); // empty result

      await handleDashboardApi(
        makeReq("/api/dashboard/executions/00000000-0000-0000-0000-000000000001", cookie),
        res, config, db as any,
      );

      expect(res._status).toBe(404);
    });
  });

  describe("GET /api/dashboard/stats", () => {
    it("returns 400 when installation_id is missing", async () => {
      const cookie = await makeCookie(config);
      const res = makeRes();
      const db = makeMockDb();

      await handleDashboardApi(
        makeReq("/api/dashboard/stats", cookie),
        res, config, db as any,
      );

      expect(res._status).toBe(400);
    });
  });

  describe("GET /api/dashboard/repos", () => {
    it("returns 400 when installation_id is missing", async () => {
      const cookie = await makeCookie(config);
      const res = makeRes();
      const db = makeMockDb();

      await handleDashboardApi(
        makeReq("/api/dashboard/repos", cookie),
        res, config, db as any,
      );

      expect(res._status).toBe(400);
    });
  });

  describe("unknown routes", () => {
    it("returns 404 for unknown dashboard paths", async () => {
      const cookie = await makeCookie(config);
      const res = makeRes();
      const db = makeMockDb();

      await handleDashboardApi(
        makeReq("/api/dashboard/unknown", cookie),
        res, config, db as any,
      );

      expect(res._status).toBe(404);
    });
  });
});
