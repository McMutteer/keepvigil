import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@vigil/core", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { checkRateLimit } from "../services/rate-limiter.js";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    checkRateLimit(999999, "team");
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Basic allow/deny
  // -------------------------------------------------------------------------

  it("allows the first request for any plan", () => {
    const result = checkRateLimit(1, "free", "dev1");
    expect(result.allowed).toBe(true);
  });

  it("allows requests within the hourly limit", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(100, "free", "dev1").allowed).toBe(true);
    }
  });

  it("denies request that exceeds the hourly limit for free plan (3/hr)", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit(200, "free", "dev1");
    }
    const result = checkRateLimit(200, "free", "dev1");
    expect(result.allowed).toBe(false);
    expect(result.message).toContain("3 PRs/hour");
    expect(result.message).toContain("Upgrade to Pro");
  });

  it("denies request that exceeds the daily limit for free plan (10/day)", () => {
    // 9 allowed requests across 3 hours (3 per hour = hourly limit)
    for (let hour = 0; hour < 3; hour++) {
      vi.setSystemTime(new Date(`2026-01-01T${String(hour).padStart(2, "0")}:00:00Z`));
      for (let i = 0; i < 3; i++) {
        expect(checkRateLimit(300, "free", "dev1").allowed).toBe(true);
      }
    }
    // 10th request in new hour — should be allowed (boundary)
    vi.setSystemTime(new Date("2026-01-01T03:00:00Z"));
    expect(checkRateLimit(300, "free", "dev1").allowed).toBe(true); // 10th

    // 11th request — should be denied by daily limit
    const result = checkRateLimit(300, "free", "dev1");
    expect(result.allowed).toBe(false);
    expect(result.message).toContain("10 PRs/day");
  });

  // -------------------------------------------------------------------------
  // Per-developer isolation
  // -------------------------------------------------------------------------

  it("tracks limits per developer, not per installation", () => {
    // Exhaust dev1's hourly limit
    for (let i = 0; i < 3; i++) {
      checkRateLimit(400, "free", "dev1");
    }
    expect(checkRateLimit(400, "free", "dev1").allowed).toBe(false);

    // dev2 on same installation should still be allowed
    expect(checkRateLimit(400, "free", "dev2").allowed).toBe(true);
  });

  it("falls back to installation-level when prAuthor is undefined", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit(500, "free");
    }
    const result = checkRateLimit(500, "free");
    expect(result.allowed).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Plan-specific limits
  // -------------------------------------------------------------------------

  it("allows pro plan up to 10 requests per hour", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(600, "pro", "dev1").allowed).toBe(true);
    }
    expect(checkRateLimit(600, "pro", "dev1").allowed).toBe(false);
    expect(checkRateLimit(600, "pro", "dev1").message).toContain("10 PRs/hour");
  });

  it("pro plan has no daily limit", () => {
    // Send 10 per hour across many hours
    for (let hour = 0; hour < 10; hour++) {
      vi.setSystemTime(new Date(`2026-01-01T${String(hour).padStart(2, "0")}:00:00Z`));
      for (let i = 0; i < 10; i++) {
        checkRateLimit(700, "pro", "dev1");
      }
    }
    // 100 total, should still be allowed in new hour
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    expect(checkRateLimit(700, "pro", "dev1").allowed).toBe(true);
  });

  it("allows team plan up to 50 requests per hour", () => {
    for (let i = 0; i < 50; i++) {
      expect(checkRateLimit(800, "team", "dev1").allowed).toBe(true);
    }
    expect(checkRateLimit(800, "team", "dev1").allowed).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Window expiry
  // -------------------------------------------------------------------------

  it("resets the hourly counter after one hour", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit(900, "free", "dev1");
    }
    expect(checkRateLimit(900, "free", "dev1").allowed).toBe(false);

    vi.advanceTimersByTime(3_600_001);
    expect(checkRateLimit(900, "free", "dev1").allowed).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Message content
  // -------------------------------------------------------------------------

  it("shows upgrade message for free plan", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit(1000, "free", "dev1");
    }
    const result = checkRateLimit(1000, "free", "dev1");
    expect(result.message).toContain("Upgrade to Pro");
  });

  it("shows 'try again later' for paid plans", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit(1100, "pro", "dev1");
    }
    const result = checkRateLimit(1100, "pro", "dev1");
    expect(result.message).toContain("Try again later");
    expect(result.message).not.toContain("Upgrade");
  });
});
