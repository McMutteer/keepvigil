/**
 * Structured logger for Vigil.
 *
 * Wraps pino with:
 * - JSON output by default (LOG_LEVEL env var controls verbosity)
 * - Correlation ID support via AsyncLocalStorage
 *   (thread a jobId through the entire pipeline without passing it everywhere)
 */

import { AsyncLocalStorage } from "node:async_hooks";
import pino, { type Logger } from "pino";

// ---------------------------------------------------------------------------
// Correlation ID store
// ---------------------------------------------------------------------------

const correlationStore = new AsyncLocalStorage<string>();

/**
 * Run `fn` with `correlationId` stored in the async context.
 * All loggers created with `createLogger` will automatically include
 * the active correlation ID in every log line while inside this scope.
 */
export function runWithCorrelationId<T>(correlationId: string, fn: () => T): T {
  return correlationStore.run(correlationId, fn);
}

/** Return the active correlation ID, or undefined if none is set. */
export function getCorrelationId(): string | undefined {
  return correlationStore.getStore();
}

// ---------------------------------------------------------------------------
// Logger factory
// ---------------------------------------------------------------------------

/**
 * Create a named pino logger.
 *
 * - JSON output in all environments (parseable by log aggregators)
 * - Level controlled by `LOG_LEVEL` env var (default: "info")
 * - Correlation ID automatically injected as `correlationId` field when set
 *
 * @param name - Logger name (e.g. "pipeline", "worker", "browser-launcher")
 */
const VALID_LEVELS = new Set(["trace", "debug", "info", "warn", "error", "fatal", "silent"]);

function resolveLogLevel(): string {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  return raw && VALID_LEVELS.has(raw) ? raw : "info";
}

export function createLogger(name: string): Logger {
  return pino({
    name,
    level: resolveLogLevel(),
    mixin() {
      const cid = correlationStore.getStore();
      return cid ? { correlationId: cid } : {};
    },
  });
}
