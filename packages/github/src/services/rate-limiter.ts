import { createLogger } from "@vigil/core";
import type { Plan } from "./subscription.js";

const log = createLogger("rate-limiter");

interface RateConfig {
  perHour: number;
  /** null = unlimited daily */
  perDay: number | null;
}

// Rate limits disabled during testing phase — all tiers effectively unlimited
const LIMITS: Record<Plan, RateConfig> = {
  free: { perHour: 9999, perDay: null },
  pro: { perHour: 9999, perDay: null },
  team: { perHour: 9999, perDay: null },
};

// In-memory fixed-window counters (reset on restart — acceptable for v1)
// Expired entries are evicted on access — no unbounded growth
const counters = new Map<string, { count: number; resetAt: number }>();

/**
 * Atomically check and increment a counter. Returns the count AFTER increment.
 * This prevents the race condition where two concurrent requests both read
 * the same count, both pass the limit check, and both increment.
 */
function checkAndIncrement(key: string, windowMs: number): number {
  const now = Date.now();
  const entry = counters.get(key);
  if (!entry || now >= entry.resetAt) {
    counters.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  entry.count++;
  return entry.count;
}

// Periodic cleanup of expired entries (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of counters) {
    if (now >= entry.resetAt) counters.delete(key);
  }
}, 600_000).unref();

/**
 * Check rate limit for a specific developer within an installation.
 *
 * Rate limiting is per-developer (by GitHub login), not per-installation.
 * This aligns with per-seat pricing: each developer's usage is tracked independently.
 *
 * Falls back to installation-level limiting when prAuthor is not available.
 */
export function checkRateLimit(
  installationId: number,
  plan: Plan,
  prAuthor?: string,
): { allowed: boolean; message?: string } {
  const limits = LIMITS[plan];
  const identity = prAuthor ?? String(installationId);

  const hourKey = `rate:${installationId}:${identity}:hour`;
  const hourCount = checkAndIncrement(hourKey, 3_600_000);
  if (hourCount > limits.perHour) {
    log.warn({ installationId, plan, prAuthor, hourCount, limit: limits.perHour }, "Hourly rate limit exceeded");
    return {
      allowed: false,
      message: `Rate limit exceeded (${limits.perHour} PRs/hour). ${plan === "free" ? "Upgrade to Pro for higher limits." : "Try again later."}`,
    };
  }

  if (limits.perDay !== null) {
    const dayKey = `rate:${installationId}:${identity}:day`;
    const dayCount = checkAndIncrement(dayKey, 86_400_000);
    if (dayCount > limits.perDay) {
      log.warn({ installationId, plan, prAuthor, dayCount, limit: limits.perDay }, "Daily rate limit exceeded");
      return {
        allowed: false,
        message: `Rate limit exceeded (${limits.perDay} PRs/day). Upgrade to Pro for unlimited daily PRs.`,
      };
    }
  }

  return { allowed: true };
}
