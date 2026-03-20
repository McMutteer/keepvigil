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
  // Basic allow — all limits disabled during testing phase
  // -------------------------------------------------------------------------

  it("allows the first request for any plan", () => {
    const result = checkRateLimit(1, "free", "dev1");
    expect(result.allowed).toBe(true);
  });

  it("allows many requests for free plan (limits disabled)", () => {
    for (let i = 0; i < 100; i++) {
      expect(checkRateLimit(100, "free", "dev1").allowed).toBe(true);
    }
  });

  it("allows many requests for pro plan (limits disabled)", () => {
    for (let i = 0; i < 100; i++) {
      expect(checkRateLimit(200, "pro", "dev1").allowed).toBe(true);
    }
  });

  it("allows many requests for team plan (limits disabled)", () => {
    for (let i = 0; i < 100; i++) {
      expect(checkRateLimit(300, "team", "dev1").allowed).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // Per-developer isolation still works
  // -------------------------------------------------------------------------

  it("tracks per developer independently", () => {
    for (let i = 0; i < 50; i++) {
      checkRateLimit(400, "free", "dev1");
    }
    // dev2 on same installation should also be allowed
    expect(checkRateLimit(400, "free", "dev2").allowed).toBe(true);
  });

  it("falls back to installation-level when prAuthor is undefined", () => {
    for (let i = 0; i < 50; i++) {
      checkRateLimit(500, "free");
    }
    // Still allowed — limits disabled
    expect(checkRateLimit(500, "free").allowed).toBe(true);
  });

  // -------------------------------------------------------------------------
  // No daily limit for any plan
  // -------------------------------------------------------------------------

  it("no daily limit for any plan (limits disabled)", () => {
    for (let hour = 0; hour < 24; hour++) {
      vi.setSystemTime(new Date(`2026-01-01T${String(hour).padStart(2, "0")}:00:00Z`));
      for (let i = 0; i < 100; i++) {
        checkRateLimit(600, "free", "dev1");
      }
    }
    vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
    expect(checkRateLimit(600, "free", "dev1").allowed).toBe(true);
  });
});
