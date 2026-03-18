/**
 * GitHub OAuth flow — login, callback, session, logout.
 * Uses GitHub App OAuth (not classic OAuth app) for installation-aware tokens.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { SignJWT, jwtVerify } from "jose";
import { createLogger } from "@vigil/core";
import type { AppConfig } from "../config.js";

const log = createLogger("auth");

const COOKIE_NAME = "vigil_session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface SessionPayload {
  userId: number;
  login: string;
  avatarUrl: string;
  installationIds: number[];
}

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

function getSecret(config: AppConfig): Uint8Array {
  return new TextEncoder().encode(config.sessionSecret);
}

export async function createSessionToken(
  payload: SessionPayload,
  config: AppConfig,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret(config));
}

export async function verifySessionToken(
  token: string,
  config: AppConfig,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(config));
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie ?? "";
  const cookies: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key) cookies[key] = rest.join("=");
  }
  return cookies;
}

function setSessionCookie(res: ServerResponse, token: string): void {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`,
  );
}

function clearSessionCookie(res: ServerResponse): void {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  );
}

// ---------------------------------------------------------------------------
// Public: extract session from request
// ---------------------------------------------------------------------------

export async function getSession(
  req: IncomingMessage,
  config: AppConfig,
): Promise<SessionPayload | null> {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token, config);
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/** GET /api/auth/login → redirect to GitHub OAuth */
export function handleLogin(req: IncomingMessage, res: ServerResponse, config: AppConfig): void {
  if (!config.githubClientId) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "OAuth not configured" }));
    return;
  }

  const redirectUri = "https://keepvigil.dev/api/auth/callback";
  const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(config.githubClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:org`;

  res.writeHead(302, { Location: url });
  res.end();
}

/** GET /api/auth/callback?code=X → exchange token, set cookie, redirect */
export async function handleCallback(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
): Promise<void> {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing code parameter" }));
    return;
  }

  if (!config.githubClientId || !config.githubClientSecret || !config.sessionSecret) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "OAuth not configured" }));
    return;
  }

  // Exchange code for access token
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: config.githubClientId,
      client_secret: config.githubClientSecret,
      code,
    }),
  });

  const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };

  if (!tokenData.access_token) {
    log.error({ error: tokenData.error }, "OAuth token exchange failed");
    res.writeHead(302, { Location: "/dashboard?error=auth_failed" });
    res.end();
    return;
  }

  const accessToken = tokenData.access_token;

  // Fetch user info
  const userResponse = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const user = (await userResponse.json()) as { id: number; login: string; avatar_url: string };

  // Fetch user's installations of this app
  const installationsResponse = await fetch(
    "https://api.github.com/user/installations",
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } },
  );
  const installationsData = (await installationsResponse.json()) as {
    installations: { id: number; app_slug: string }[];
  };

  // Filter to only this app's installations
  const installationIds = installationsData.installations
    .filter((i) => i.app_slug === "keepvigil")
    .map((i) => i.id);

  const session: SessionPayload = {
    userId: user.id,
    login: user.login,
    avatarUrl: user.avatar_url,
    installationIds,
  };

  const token = await createSessionToken(session, config);
  setSessionCookie(res, token);

  log.info({ login: user.login, installations: installationIds.length }, "OAuth login successful");

  res.writeHead(302, { Location: "/dashboard" });
  res.end();
}

/** GET /api/auth/session → return current user info or 401 */
export async function handleSession(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
): Promise<void> {
  const session = await getSession(req, config);

  if (!session) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not authenticated" }));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(session));
}

/** POST /api/auth/logout → clear cookie */
export function handleLogout(_req: IncomingMessage, res: ServerResponse): void {
  clearSessionCookie(res);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true }));
}
