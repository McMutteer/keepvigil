/**
 * Vigil error taxonomy.
 *
 * Signals retry intent to the BullMQ worker:
 * - VigilTransientError: temporary failure — safe to retry (network timeout, GitHub 503, Redis blip)
 * - VigilPermanentError: logic/data failure — retry will not help (invalid input, parse error)
 * - VigilSecurityError: security policy violation — extends permanent, indicates blocked operation
 */

export class VigilTransientError extends Error {
  readonly isTransient = true as const;
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "VigilTransientError";
  }
}

export class VigilPermanentError extends Error {
  readonly isPermanent = true as const;
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "VigilPermanentError";
  }
}

export class VigilSecurityError extends VigilPermanentError {
  readonly isSecurity = true as const;
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "VigilSecurityError";
  }
}

/** Returns true if the error is a transient failure that should be retried. */
export function isTransientError(err: unknown): err is VigilTransientError {
  return err instanceof VigilTransientError;
}

/** Returns true if the error is permanent (includes security errors) — do not retry. */
export function isPermanentError(err: unknown): err is VigilPermanentError {
  return err instanceof VigilPermanentError;
}
