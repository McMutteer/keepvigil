import { describe, it, expect } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createSessionToken, type SessionPayload } from "../services/auth.js";
import { requireSession, requireInstallationAccess } from "../services/auth-middleware.js";
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

function makeReq(cookie?: string): IncomingMessage {
  return {
    url: "/",
    method: "GET",
    headers: cookie ? { cookie } : {},
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
    end(body?: string) {
      if (body) res._body = body;
    },
  };
  return res as unknown as ServerResponse & typeof res;
}

// ---------------------------------------------------------------------------
// requireSession
// ---------------------------------------------------------------------------

describe("requireSession", () => {
  it("returns null and sends 401 when no cookie", async () => {
    const config = makeConfig();
    const res = makeRes();

    const result = await requireSession(makeReq(), res, config);

    expect(result).toBeNull();
    expect(res._status).toBe(401);
  });

  it("returns null and sends 503 when sessionSecret is not configured", async () => {
    const config = makeConfig({ sessionSecret: "" });
    const res = makeRes();

    const result = await requireSession(makeReq(), res, config);

    expect(result).toBeNull();
    expect(res._status).toBe(503);
  });

  it("returns session when valid cookie is present", async () => {
    const config = makeConfig();
    const session: SessionPayload = {
      userId: 123,
      login: "dev",
      avatarUrl: "https://avatar.url",
      installationIds: [111],
    };
    const token = await createSessionToken(session, config);
    const res = makeRes();

    const result = await requireSession(makeReq(`vigil_session=${token}`), res, config);

    expect(result).not.toBeNull();
    expect(result!.login).toBe("dev");
  });
});

// ---------------------------------------------------------------------------
// requireInstallationAccess
// ---------------------------------------------------------------------------

describe("requireInstallationAccess", () => {
  it("returns session when user has access to the installation", async () => {
    const config = makeConfig();
    const session: SessionPayload = {
      userId: 123,
      login: "dev",
      avatarUrl: "https://avatar.url",
      installationIds: [111, 222],
    };
    const token = await createSessionToken(session, config);
    const res = makeRes();

    const result = await requireInstallationAccess(
      makeReq(`vigil_session=${token}`), res, config, 111,
    );

    expect(result).not.toBeNull();
    expect(result!.login).toBe("dev");
  });

  it("returns null and sends 403 when user lacks access", async () => {
    const config = makeConfig();
    const session: SessionPayload = {
      userId: 123,
      login: "dev",
      avatarUrl: "https://avatar.url",
      installationIds: [111],
    };
    const token = await createSessionToken(session, config);
    const res = makeRes();

    const result = await requireInstallationAccess(
      makeReq(`vigil_session=${token}`), res, config, 999,
    );

    expect(result).toBeNull();
    expect(res._status).toBe(403);
  });

  it("returns null and sends 401 when not authenticated", async () => {
    const config = makeConfig();
    const res = makeRes();

    const result = await requireInstallationAccess(makeReq(), res, config, 111);

    expect(result).toBeNull();
    expect(res._status).toBe(401);
  });
});
