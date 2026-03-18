import { describe, it, expect } from "vitest";
import { applyIgnoreRules } from "../services/repo-memory.js";
import type { Signal } from "@vigil/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSignal(details: Signal["details"]): Signal {
  return {
    id: "undocumented-changes",
    name: "Undocumented Changes",
    score: 80,
    weight: 10,
    passed: true,
    requiresLLM: true,
    details,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("applyIgnoreRules", () => {
  it("suppresses findings matching an ignore rule (label match)", () => {
    const signals = [
      makeSignal([
        { label: "dependency (package.json)", status: "warn", message: "Added ioredis dependency" },
        { label: "env-var (.env)", status: "warn", message: "REDIS_URL added" },
      ]),
    ];

    const rules = [
      { id: "1", ruleType: "ignore", pattern: "ioredis", createdBy: "dev" },
    ];

    const suppressed = applyIgnoreRules(signals, rules);

    expect(suppressed).toBe(1);
    expect(signals[0].details[0].status).toBe("skip");
    expect(signals[0].details[0].message).toContain("Suppressed by repo rule");
    expect(signals[0].details[1].status).toBe("warn"); // not matched
  });

  it("suppresses findings matching by message", () => {
    const signals = [
      makeSignal([
        { label: "env-var", status: "warn", message: "REDIS_URL environment variable added" },
      ]),
    ];

    const rules = [
      { id: "1", ruleType: "ignore", pattern: "REDIS_URL", createdBy: "dev" },
    ];

    const suppressed = applyIgnoreRules(signals, rules);

    expect(suppressed).toBe(1);
    expect(signals[0].details[0].status).toBe("skip");
  });

  it("is case-insensitive", () => {
    const signals = [
      makeSignal([
        { label: "dependency", status: "warn", message: "Added IOREDIS package" },
      ]),
    ];

    const rules = [
      { id: "1", ruleType: "ignore", pattern: "ioredis", createdBy: "dev" },
    ];

    const suppressed = applyIgnoreRules(signals, rules);
    expect(suppressed).toBe(1);
  });

  it("does not suppress passing findings", () => {
    const signals = [
      makeSignal([
        { label: "ioredis", status: "pass", message: "Dependency documented" },
      ]),
    ];

    const rules = [
      { id: "1", ruleType: "ignore", pattern: "ioredis", createdBy: "dev" },
    ];

    const suppressed = applyIgnoreRules(signals, rules);
    expect(suppressed).toBe(0);
    expect(signals[0].details[0].status).toBe("pass");
  });

  it("does not suppress skip findings", () => {
    const signals = [
      makeSignal([
        { label: "ioredis", status: "skip", message: "Already skipped" },
      ]),
    ];

    const rules = [
      { id: "1", ruleType: "ignore", pattern: "ioredis", createdBy: "dev" },
    ];

    const suppressed = applyIgnoreRules(signals, rules);
    expect(suppressed).toBe(0);
  });

  it("returns 0 when no rules", () => {
    const signals = [
      makeSignal([
        { label: "dep", status: "warn", message: "Something" },
      ]),
    ];

    const suppressed = applyIgnoreRules(signals, []);
    expect(suppressed).toBe(0);
  });

  it("ignores non-ignore rule types", () => {
    const signals = [
      makeSignal([
        { label: "dep", status: "warn", message: "ioredis" },
      ]),
    ];

    const rules = [
      { id: "1", ruleType: "convention", pattern: "ioredis", createdBy: "dev" },
    ];

    const suppressed = applyIgnoreRules(signals, rules);
    expect(suppressed).toBe(0);
  });

  it("applies rules across multiple signals", () => {
    const signals = [
      makeSignal([
        { label: "dep", status: "fail", message: "ioredis not documented" },
      ]),
      makeSignal([
        { label: "env", status: "warn", message: "REDIS_URL added" },
      ]),
    ];

    const rules = [
      { id: "1", ruleType: "ignore", pattern: "ioredis", createdBy: "dev" },
      { id: "2", ruleType: "ignore", pattern: "redis_url", createdBy: "dev" },
    ];

    const suppressed = applyIgnoreRules(signals, rules);
    expect(suppressed).toBe(2);
  });

  it("includes rule creator in suppression message", () => {
    const signals = [
      makeSignal([
        { label: "dep", status: "warn", message: "ioredis" },
      ]),
    ];

    const rules = [
      { id: "1", ruleType: "ignore", pattern: "ioredis", createdBy: "sotero" },
    ];

    applyIgnoreRules(signals, rules);
    expect(signals[0].details[0].message).toContain("sotero");
  });
});
