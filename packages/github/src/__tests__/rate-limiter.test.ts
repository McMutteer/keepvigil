import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to access the internal counters map to reset between tests.
// The module uses module-level state, so we isolate via vi.importActual + dynamic import.

// Mock @vigil/core to prevent logger side-effects
vi.mock("@vigil/core", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// We re-import before each test to get a fresh module with clean counters.
// Using dynamic imports would require async; instead we test via the public API
// and use vi.useFakeTimers to control Date.now().

import { checkRateLimit } from "../services/rate-limiter.js";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set a fixed time so counters are predictable
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    // Advance time far enough to expire all counters, then call once to evict
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    // Trigger a call to evict old entries via the access-based eviction
    checkRateLimit(999999, "team");
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Basic allow/deny
  // -------------------------------------------------------------------------

  it("allows the first request for any plan", () => {
    const result = checkRateLimit(1, "free");
    expect(result.allowed).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it("allows requests within the hourly limit", () => {
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit(100, "free");
      expect(result.allowed).toBe(true);
    }
  });

  it("denies request that exceeds the hourly limit for free plan", () => {
    // Free plan: 10/hr
    for (let i = 0; i < 10; i++) {
      checkRateLimit(200, "free");
    }
    const result = checkRateLimit(200, "free");
    expect(result.allowed).toBe(false);
    expect(result.message).toContain("10 PRs/hour");
    expect(result.message).toContain("Upgrade to Pro");
  });

  it("denies request that exceeds the daily limit for free plan", () => {
    // Free plan: 10/hr, 50/day
    // We need to spread across hours to hit the daily limit without hitting hourly
    for (let hour = 0; hour < 5; hour++) {
      vi.setSystemTime(new Date(`2026-01-01T${String(hour).padStart(2, "0")}:00:00Z`));
      for (let i = 0; i < 10; i++) {
        checkRateLimit(300, "free");
      }
    }
    // Now at hour 5, hourly counter is fresh but daily should be at 50
    vi.setSystemTime(new Date("2026-01-01T05:00:00Z"));
    const result = checkRateLimit(300, "free");
    expect(result.allowed).toBe(false);
    expect(result.message).toContain("50 PRs/day");
    expect(result.message).toContain("Upgrade to Pro");
  });

  // -------------------------------------------------------------------------
  // Plan-specific limits
  // -------------------------------------------------------------------------

  it("allows pro plan up to 50 requests per hour", () => {
    for (let i = 0; i < 50; i++) {
      const result = checkRateLimit(400, "pro");
      expect(result.allowed).toBe(true);
    }
    const result = checkRateLimit(400, "pro");
    expect(result.allowed).toBe(false);
    expect(result.message).toContain("50 PRs/hour");
  });

  it("allows team plan up to 200 requests per hour", () => {
    for (let i = 0; i < 200; i++) {
      expect(checkRateLimit(500, "team").allowed).toBe(true);
    }
    const result = checkRateLimit(500, "team");
    expect(result.allowed).toBe(false);
    expect(result.message).toContain("200 PRs/hour");
  });

  // -------------------------------------------------------------------------
  // Window expiry
  // -------------------------------------------------------------------------

  it("resets the hourly counter after one hour", () => {
    // Exhaust the free hourly limit
    for (let i = 0; i < 10; i++) {
      checkRateLimit(600, "free");
    }
    expect(checkRateLimit(600, "free").allowed).toBe(false);

    // Advance past the 1-hour window
    vi.advanceTimersByTime(3_600_001);
    const result = checkRateLimit(600, "free");
    expect(result.allowed).toBe(true);
  });

  it("resets the daily counter after 24 hours", () => {
    // Fill up daily limit by cycling through hours
    for (let hour = 0; hour < 5; hour++) {
      vi.setSystemTime(new Date(`2026-01-01T${String(hour).padStart(2, "0")}:00:00Z`));
      for (let i = 0; i < 10; i++) {
        checkRateLimit(700, "free");
      }
    }
    vi.setSystemTime(new Date("2026-01-01T05:00:00Z"));
    expect(checkRateLimit(700, "free").allowed).toBe(false);

    // Advance past 24 hours from the start
    vi.setSystemTime(new Date("2026-01-02T01:00:00Z"));
    const result = checkRateLimit(700, "free");
    expect(result.allowed).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Isolation between installations
  // -------------------------------------------------------------------------

  it("tracks rate limits independently per installation", () => {
    // Exhaust limit for installation 800
    for (let i = 0; i < 10; i++) {
      checkRateLimit(800, "free");
    }
    expect(checkRateLimit(800, "free").allowed).toBe(false);

    // Installation 801 should still be allowed
    const result = checkRateLimit(801, "free");
    expect(result.allowed).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Message content
  // -------------------------------------------------------------------------

  it("shows upgrade message for free plan", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit(900, "free");
    }
    const result = checkRateLimit(900, "free");
    expect(result.message).toContain("Upgrade to Pro");
  });

  it("shows 'try again later' for paid plans", () => {
    for (let i = 0; i < 50; i++) {
      checkRateLimit(1000, "pro");
    }
    const result = checkRateLimit(1000, "pro");
    expect(result.message).toContain("Try again later");
    expect(result.message).not.toContain("Upgrade");
  });
});
