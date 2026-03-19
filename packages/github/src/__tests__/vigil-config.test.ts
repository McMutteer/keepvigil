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
});
