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
    // Flush counters by advancing far into the future
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    checkRateLimit(999999, "team");
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Basic allow
  // -------------------------------------------------------------------------

  it("allows the first request for any plan", () => {
    const result = checkRateLimit(1, "free", "dev1");
    expect(result.allowed).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Free tier: 3/hr, 10/day
  // -------------------------------------------------------------------------

  it("free tier: allows up to 3 requests per hour", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(100, "free", "dev1").allowed).toBe(true);
    }
    expect(checkRateLimit(100, "free", "dev1").allowed).toBe(false);
  });

  it("free tier: resets after 1 hour", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit(101, "free", "dev1");
    }
    expect(checkRateLimit(101, "free", "dev1").allowed).toBe(false);
    // Advance 1 hour
    vi.setSystemTime(new Date("2026-01-01T01:00:01Z"));
    expect(checkRateLimit(101, "free", "dev1").allowed).toBe(true);
  });

  it("free tier: daily limit of 10", () => {
    // Use 3 per hour across 4 hours = 12 attempts, but daily cap at 10
    for (let hour = 0; hour < 4; hour++) {
      vi.setSystemTime(new Date(`2026-01-01T${String(hour).padStart(2, "0")}:00:00Z`));
      for (let i = 0; i < 3; i++) {
        checkRateLimit(102, "free", "dev1");
      }
    }
    // Should be blocked by daily limit (10 allowed, 11th+ blocked)
    vi.setSystemTime(new Date("2026-01-01T04:00:00Z"));
    expect(checkRateLimit(102, "free", "dev1").allowed).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Pro tier: 10/hr, unlimited daily
  // -------------------------------------------------------------------------

  it("pro tier: allows up to 10 requests per hour", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(200, "pro", "dev1").allowed).toBe(true);
    }
    expect(checkRateLimit(200, "pro", "dev1").allowed).toBe(false);
  });

  it("pro tier: no daily limit", () => {
    for (let hour = 0; hour < 24; hour++) {
      vi.setSystemTime(new Date(`2026-01-01T${String(hour).padStart(2, "0")}:00:00Z`));
      for (let i = 0; i < 10; i++) {
        checkRateLimit(201, "pro", "dev1");
      }
    }
    // 240 total — should still be allowed in the next hour (no daily cap)
    vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
    expect(checkRateLimit(201, "pro", "dev1").allowed).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Team tier: 50/hr, unlimited daily
  // -------------------------------------------------------------------------

  it("team tier: allows up to 50 requests per hour", () => {
    for (let i = 0; i < 50; i++) {
      expect(checkRateLimit(300, "team", "dev1").allowed).toBe(true);
    }
    expect(checkRateLimit(300, "team", "dev1").allowed).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Per-developer isolation
  // -------------------------------------------------------------------------

  it("tracks per developer independently", () => {
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
    expect(checkRateLimit(500, "free").allowed).toBe(false);
  });
});
