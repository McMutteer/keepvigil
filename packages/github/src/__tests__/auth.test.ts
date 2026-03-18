import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createSessionToken,
  verifySessionToken,
  handleLogin,
  handleCallback,
  handleSession,
  handleLogout,
  type SessionPayload,
} from "../services/auth.js";
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

function makeReq(overrides: Partial<IncomingMessage> = {}): IncomingMessage {
  return {
    url: "/",
    method: "GET",
    headers: {},
    ...overrides,
  } as unknown as IncomingMessage;
}

function makeRes(): ServerResponse & { _status: number; _headers: Record<string, string | string[]>; _body: string } {
  const res = {
    _status: 0,
    _headers: {} as Record<string, string | string[]>,
    _body: "",
    headersSent: false,
    writeHead(status: number, headers?: Record<string, string>) {
      res._status = status;
      if (headers) Object.assign(res._headers, headers);
      return res;
    },
    setHeader(name: string, value: string | string[]) {
      res._headers[name] = value;
      return res;
    },
    end(body?: string) {
      if (body) res._body = body;
    },
  };
  return res as unknown as ServerResponse & typeof res;
}

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

describe("JWT session tokens", () => {
  const config = makeConfig();
  const session: SessionPayload = {
    userId: 12345,
    login: "testuser",
    avatarUrl: "https://github.com/avatar.jpg",
    installationIds: [111, 222],
  };

  it("creates and verifies a valid token", async () => {
    const token = await createSessionToken(session, config);
    const verified = await verifySessionToken(token, config);

    expect(verified).not.toBeNull();
    expect(verified!.userId).toBe(12345);
    expect(verified!.login).toBe("testuser");
    expect(verified!.installationIds).toEqual([111, 222]);
  });

  it("returns null for an invalid token", async () => {
    const result = await verifySessionToken("invalid.jwt.token", config);
    expect(result).toBeNull();
  });

  it("returns null for a token signed with a different secret", async () => {
    const token = await createSessionToken(session, config);
    const otherConfig = makeConfig({ sessionSecret: "different-secret-also-at-least-32-bytes" });
    const result = await verifySessionToken(token, otherConfig);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// handleLogin
// ---------------------------------------------------------------------------

describe("handleLogin", () => {
  it("redirects to GitHub OAuth with client_id", () => {
    const config = makeConfig();
    const res = makeRes();

    handleLogin(makeReq(), res, config);

    expect(res._status).toBe(302);
    expect(res._headers.Location).toContain("github.com/login/oauth/authorize");
    expect(res._headers.Location).toContain("client_id=Iv1.test");
    expect(res._headers.Location).toContain("state=");
    // Sets a state cookie
    expect(res._headers["Set-Cookie"]).toContain("vigil_oauth_state=");
  });

  it("returns 503 when OAuth is not configured", () => {
    const config = makeConfig({ githubClientId: "", githubClientSecret: "", sessionSecret: "" });
    const res = makeRes();

    handleLogin(makeReq(), res, config);

    expect(res._status).toBe(503);
  });

  it("returns 503 when OAuth is partially configured", () => {
    const config = makeConfig({ githubClientSecret: "", sessionSecret: "" });
    const res = makeRes();

    handleLogin(makeReq(), res, config);

    expect(res._status).toBe(503);
  });
});

// ---------------------------------------------------------------------------
// handleCallback
// ---------------------------------------------------------------------------

describe("handleCallback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 when code is missing", async () => {
    const config = makeConfig();
    const req = makeReq({ url: "/api/auth/callback" });
    const res = makeRes();

    await handleCallback(req, res, config);

    expect(res._status).toBe(400);
  });

  it("returns 503 when OAuth is not configured", async () => {
    const config = makeConfig({ githubClientId: "", githubClientSecret: "", sessionSecret: "" });
    const req = makeReq({ url: "/api/auth/callback?code=test&state=abc" });
    const res = makeRes();

    await handleCallback(req, res, config);

    expect(res._status).toBe(503);
  });

  it("returns 400 when state does not match", async () => {
    const config = makeConfig();
    const req = makeReq({
      url: "/api/auth/callback?code=valid-code&state=wrong",
      headers: { host: "keepvigil.dev", cookie: "vigil_oauth_state=correct" },
    });
    const res = makeRes();

    await handleCallback(req, res, config);

    expect(res._status).toBe(400);
    expect(res._body).toContain("Invalid state");
  });

  it("exchanges code and sets session cookie on success", async () => {
    const config = makeConfig();
    const stateNonce = "test-state-nonce";
    const req = makeReq({
      url: `/api/auth/callback?code=valid-code&state=${stateNonce}`,
      headers: { host: "keepvigil.dev", cookie: `vigil_oauth_state=${stateNonce}` },
    });
    const res = makeRes();

    // Mock fetch calls
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy
      // Token exchange
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: "gho_test123" }),
      } as Response)
      // User info
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 999, login: "testdev", avatar_url: "https://avatar.url" }),
      } as Response)
      // Installations
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          installations: [
            { id: 111, app_slug: "keepvigil" },
            { id: 222, app_slug: "other-app" },
          ],
        }),
      } as Response);

    await handleCallback(req, res, config);

    expect(res._status).toBe(302);
    expect(res._headers.Location).toBe("/dashboard");
    // Set-Cookie is now an array (session + clear state)
    const cookies = Array.isArray(res._headers["Set-Cookie"])
      ? res._headers["Set-Cookie"]
      : [res._headers["Set-Cookie"]];
    const sessionCookie = cookies.find((c: string) => c.startsWith("vigil_session="));
    expect(sessionCookie).toContain("HttpOnly");

    // Verify the session token contains correct data
    const tokenMatch = sessionCookie!.match(/vigil_session=([^;]+)/);
    const session = await verifySessionToken(tokenMatch![1], config);
    expect(session!.login).toBe("testdev");
    expect(session!.installationIds).toEqual([111]); // only keepvigil app
  });

  it("redirects to dashboard with error on token exchange failure", async () => {
    const config = makeConfig();
    const stateNonce = "test-state";
    const req = makeReq({
      url: `/api/auth/callback?code=bad-code&state=${stateNonce}`,
      headers: { host: "keepvigil.dev", cookie: `vigil_oauth_state=${stateNonce}` },
    });
    const res = makeRes();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: "bad_verification_code" }),
    } as Response);

    await handleCallback(req, res, config);

    expect(res._status).toBe(302);
    expect(res._headers.Location).toBe("/dashboard?error=auth_failed");
  });
});

// ---------------------------------------------------------------------------
// handleSession
// ---------------------------------------------------------------------------

describe("handleSession", () => {
  it("returns 401 when no cookie is present", async () => {
    const config = makeConfig();
    const req = makeReq();
    const res = makeRes();

    await handleSession(req, res, config);

    expect(res._status).toBe(401);
  });

  it("returns session data when valid cookie is present", async () => {
    const config = makeConfig();
    const session: SessionPayload = {
      userId: 123,
      login: "dev",
      avatarUrl: "https://avatar.url",
      installationIds: [111],
    };
    const token = await createSessionToken(session, config);
    const req = makeReq({ headers: { cookie: `vigil_session=${token}` } });
    const res = makeRes();

    await handleSession(req, res, config);

    expect(res._status).toBe(200);
    const body = JSON.parse(res._body);
    expect(body.login).toBe("dev");
    expect(body.installationIds).toEqual([111]);
  });
});

// ---------------------------------------------------------------------------
// handleLogout
// ---------------------------------------------------------------------------

describe("handleLogout", () => {
  it("clears the session cookie", () => {
    const req = makeReq();
    const res = makeRes();

    handleLogout(req, res);

    expect(res._status).toBe(200);
    expect(res._headers["Set-Cookie"]).toContain("Max-Age=0");
  });
});
