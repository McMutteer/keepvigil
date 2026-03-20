import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleAdminApi } from "../services/admin-api.js";
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

function makeReq(url: string, method = "GET", cookie?: string): IncomingMessage {
  return {
    url,
    method,
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

async function makeAdminCookie(config: AppConfig): Promise<string> {
  const session: SessionPayload = {
    userId: 124670303, // Admin user ID
    login: "sotero",
    avatarUrl: "https://avatar.url",
    installationIds: [111],
  };
  const token = await createSessionToken(session, config);
  return `vigil_session=${token}`;
}

async function makeNonAdminCookie(config: AppConfig): Promise<string> {
  const session: SessionPayload = {
    userId: 999999,
    login: "random-user",
    avatarUrl: "https://avatar.url",
    installationIds: [111],
  };
  const token = await createSessionToken(session, config);
  return `vigil_session=${token}`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("admin-api", () => {
  const config = makeConfig();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session cookie is provided", async () => {
    const req = makeReq("/api/admin/overview");
    const res = makeRes();
    await handleAdminApi(req, res, config, {} as never);
    expect(res._status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    const cookie = await makeNonAdminCookie(config);
    const req = makeReq("/api/admin/overview", "GET", cookie);
    const res = makeRes();
    await handleAdminApi(req, res, config, {} as never);
    expect(res._status).toBe(403);
    expect(JSON.parse(res._body)).toEqual({ error: "Admin access required" });
  });

  it("returns 404 for unknown admin paths", async () => {
    const cookie = await makeAdminCookie(config);
    const req = makeReq("/api/admin/unknown", "GET", cookie);
    const res = makeRes();
    await handleAdminApi(req, res, config, {} as never);
    expect(res._status).toBe(404);
  });

  it("returns 405 for non-GET methods", async () => {
    const req = makeReq("/api/admin/overview", "POST");
    const res = makeRes();
    await handleAdminApi(req, res, config, {} as never);
    expect(res._status).toBe(405);
  });

  it("returns 400 for invalid execution ID format", async () => {
    const cookie = await makeAdminCookie(config);
    const req = makeReq("/api/admin/executions/not-a-uuid", "GET", cookie);
    const res = makeRes();

    // Mock db that returns empty for the select
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    await handleAdminApi(req, res, config, mockDb as never);
    expect(res._status).toBe(400);
    expect(JSON.parse(res._body)).toEqual({ error: "Invalid execution ID" });
  });
});
