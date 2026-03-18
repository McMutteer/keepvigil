/**
 * Auth middleware — verifies JWT session for dashboard API endpoints.
 * Returns the session payload or sends 401/403 and returns null.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { AppConfig } from "../config.js";
import { getSession, type SessionPayload } from "./auth.js";

/**
 * Require a valid session. Returns the session payload or null (after sending error response).
 */
export async function requireSession(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
): Promise<SessionPayload | null> {
  if (!config.sessionSecret) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Auth not configured" }));
    return null;
  }

  const session = await getSession(req, config);
  if (!session) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not authenticated" }));
    return null;
  }

  return session;
}

/**
 * Require session + verify the user has access to the given installation.
 * Returns the session or null (after sending error response).
 */
export async function requireInstallationAccess(
  req: IncomingMessage,
  res: ServerResponse,
  config: AppConfig,
  installationId: number,
): Promise<SessionPayload | null> {
  const session = await requireSession(req, res, config);
  if (!session) return null;

  if (!session.installationIds.includes(installationId)) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Access denied to this installation" }));
    return null;
  }

  return session;
}
