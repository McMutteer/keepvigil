import { describe, it, expect } from "vitest";
import { parseVigilConfig } from "../services/vigil-config.js";

describe("parseVigilConfig", () => {
  it("returns empty config for undefined input", () => {
    const { config, warnings } = parseVigilConfig(undefined);
    expect(config).toEqual({});
    expect(warnings).toEqual([]);
  });

  it("returns empty config for empty string", () => {
    const { config, warnings } = parseVigilConfig("");
    expect(config).toEqual({});
    expect(warnings).toEqual([]);
  });

  it("returns warning for invalid YAML", () => {
    const { config, warnings } = parseVigilConfig("{ invalid yaml :");
    expect(config).toEqual({});
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("invalid YAML syntax");
  });

  it("returns warning for unsupported version", () => {
    const { warnings } = parseVigilConfig("version: 2");
    expect(warnings[0]).toContain("not supported");
  });

  it("parses valid notification config", () => {
    const yaml = `
notifications:
  on: always
  urls:
    - https://hooks.slack.com/services/T123/B456/xxx
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(warnings).toEqual([]);
    expect(config.notifications?.on).toBe("always");
    expect(config.notifications?.urls).toEqual(["https://hooks.slack.com/services/T123/B456/xxx"]);
  });

  it("rejects non-https notification URLs", () => {
    const yaml = `
notifications:
  urls:
    - http://insecure.example.com/webhook
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("https://");
    expect(config.notifications?.urls).toBeUndefined();
  });

  it("limits notification URLs to 5", () => {
    const urls = Array.from({ length: 7 }, (_, i) => `    - https://hook${i}.example.com`).join("\n");
    const yaml = `notifications:\n  urls:\n${urls}`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.notifications?.urls).toHaveLength(5);
    expect(warnings.some((w) => w.includes("limited to 5"))).toBe(true);
  });

  it("accepts version 1", () => {
    const { config, warnings } = parseVigilConfig("version: 1");
    expect(config).toEqual({});
    expect(warnings).toEqual([]);
  });

  it("ignores unknown fields without warnings", () => {
    const { config, warnings } = parseVigilConfig("unknown_field: true");
    expect(config).toEqual({});
    expect(warnings).toEqual([]);
  });

  it("parses valid auto_approve config", () => {
    const { config, warnings } = parseVigilConfig("auto_approve:\n  threshold: 90");
    expect(warnings).toEqual([]);
    expect(config.autoApprove?.threshold).toBe(90);
  });

  it("accepts threshold at minimum (80)", () => {
    const { config, warnings } = parseVigilConfig("auto_approve:\n  threshold: 80");
    expect(warnings).toEqual([]);
    expect(config.autoApprove?.threshold).toBe(80);
  });

  it("accepts threshold at maximum (100)", () => {
    const { config, warnings } = parseVigilConfig("auto_approve:\n  threshold: 100");
    expect(warnings).toEqual([]);
    expect(config.autoApprove?.threshold).toBe(100);
  });

  it("rejects threshold below 80", () => {
    const { config, warnings } = parseVigilConfig("auto_approve:\n  threshold: 50");
    expect(config.autoApprove).toBeUndefined();
    expect(warnings[0]).toContain("out of range");
  });

  it("rejects non-numeric threshold", () => {
    const { config, warnings } = parseVigilConfig("auto_approve:\n  threshold: high");
    expect(config.autoApprove).toBeUndefined();
    expect(warnings[0]).toContain("must be a number");
  });

  it("floors decimal threshold", () => {
    const { config, warnings } = parseVigilConfig("auto_approve:\n  threshold: 92.7");
    expect(warnings).toEqual([]);
    expect(config.autoApprove?.threshold).toBe(92);
  });

  it("parses valid coverage.exclude config", () => {
    const yaml = `
coverage:
  exclude:
    - packages/landing/
    - packages/dashboard/
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(warnings).toEqual([]);
    expect(config.coverage?.exclude).toEqual(["packages/landing/", "packages/dashboard/"]);
  });

  it("rejects non-string coverage.exclude entries", () => {
    const yaml = `
coverage:
  exclude:
    - packages/landing/
    - 123
    - true
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.coverage?.exclude).toEqual(["packages/landing/"]);
    expect(warnings).toHaveLength(2);
  });

  it("limits coverage.exclude to 20 entries", () => {
    const entries = Array.from({ length: 25 }, (_, i) => `    - path${i}/`).join("\n");
    const yaml = `coverage:\n  exclude:\n${entries}`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.coverage?.exclude).toHaveLength(20);
    expect(warnings.some((w) => w.includes("limited to 20"))).toBe(true);
  });

  it("rejects overly long coverage.exclude entries", () => {
    const longPath = "a".repeat(201) + "/";
    const yaml = `coverage:\n  exclude:\n    - ${longPath}`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.coverage).toBeUndefined();
    expect(warnings[0]).toContain("exceeds 200");
  });
});
