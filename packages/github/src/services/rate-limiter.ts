import { createLogger } from "@vigil/core";
import type { Plan } from "./subscription.js";

const log = createLogger("rate-limiter");

const LIMITS: Record<Plan, { perHour: number; perDay: number }> = {
  free: { perHour: 10, perDay: 50 },
  pro: { perHour: 50, perDay: 500 },
  team: { perHour: 200, perDay: 2000 },
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

export function checkRateLimit(installationId: number, plan: Plan): { allowed: boolean; message?: string } {
  const limits = LIMITS[plan];
  const hourKey = `rate:${installationId}:hour`;
  const dayKey = `rate:${installationId}:day`;

  const hourCount = checkAndIncrement(hourKey, 3_600_000);
  if (hourCount > limits.perHour) {
    log.warn({ installationId, plan, hourCount, limit: limits.perHour }, "Hourly rate limit exceeded");
    return { allowed: false, message: `Rate limit exceeded (${limits.perHour} PRs/hour). ${plan === "free" ? "Upgrade to Pro for higher limits." : "Try again later."}` };
  }

  const dayCount = checkAndIncrement(dayKey, 86_400_000);
  if (dayCount > limits.perDay) {
    log.warn({ installationId, plan, dayCount, limit: limits.perDay }, "Daily rate limit exceeded");
    return { allowed: false, message: `Rate limit exceeded (${limits.perDay} PRs/day). ${plan === "free" ? "Upgrade to Pro for higher limits." : "Try again later."}` };
  }

  return { allowed: true };
}
