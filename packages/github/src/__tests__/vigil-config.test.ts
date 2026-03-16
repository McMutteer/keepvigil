import { describe, it, expect } from "vitest";
import { parseVigilConfig } from "../services/vigil-config.js";

describe("parseVigilConfig", () => {
  // --- happy path ---

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

  it("returns empty config for whitespace-only string", () => {
    const { config, warnings } = parseVigilConfig("   \n  ");
    expect(config).toEqual({});
    expect(warnings).toEqual([]);
  });

  it("returns empty config for valid YAML with no recognized fields", () => {
    const yaml = "foo: bar\nbaz: 123\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config).toEqual({});
    expect(warnings).toEqual([]);
  });

  it("parses version: 1 and ignores it (just a marker)", () => {
    const yaml = "version: 1\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config).toEqual({});
    expect(warnings).toEqual([]);
  });

  it("rejects unsupported version with a warning", () => {
    const yaml = "version: 2\ntimeouts:\n  shell: 60\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config).toEqual({});
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/version 2/);
  });

  // --- timeouts ---

  it("parses valid shell timeout", () => {
    const yaml = "timeouts:\n  shell: 120\n";
    const { config } = parseVigilConfig(yaml);
    expect(config.timeouts?.shell).toBe(120);
  });

  it("parses valid api timeout", () => {
    const yaml = "timeouts:\n  api: 15\n";
    const { config } = parseVigilConfig(yaml);
    expect(config.timeouts?.api).toBe(15);
  });

  it("parses valid browser timeout", () => {
    const yaml = "timeouts:\n  browser: 90\n";
    const { config } = parseVigilConfig(yaml);
    expect(config.timeouts?.browser).toBe(90);
  });

  it("parses all three timeouts together", () => {
    const yaml = "timeouts:\n  shell: 300\n  api: 30\n  browser: 60\n";
    const { config } = parseVigilConfig(yaml);
    expect(config.timeouts).toEqual({ shell: 300, api: 30, browser: 60 });
  });

  it("floors decimal timeout values", () => {
    const yaml = "timeouts:\n  shell: 90.9\n";
    const { config } = parseVigilConfig(yaml);
    expect(config.timeouts?.shell).toBe(90);
  });

  it("rejects shell timeout between 0 and 1 (floors to 0) and emits a warning", () => {
    const yaml = "timeouts:\n  shell: 0.4\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.timeouts?.shell).toBeUndefined();
    expect(warnings.some(w => w.includes("timeouts.shell"))).toBe(true);
  });

  it("rejects shell timeout of 0 and emits a warning", () => {
    const yaml = "timeouts:\n  shell: 0\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.timeouts?.shell).toBeUndefined();
    expect(warnings.some(w => w.includes("timeouts.shell"))).toBe(true);
  });

  it("rejects negative shell timeout and emits a warning", () => {
    const yaml = "timeouts:\n  shell: -10\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.timeouts?.shell).toBeUndefined();
    expect(warnings.some(w => w.includes("timeouts.shell"))).toBe(true);
  });

  it("rejects shell timeout above 3600 and emits a warning", () => {
    const yaml = "timeouts:\n  shell: 3601\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.timeouts?.shell).toBeUndefined();
    expect(warnings.some(w => w.includes("timeouts.shell"))).toBe(true);
  });

  it("rejects api timeout above 300 and emits a warning", () => {
    const yaml = "timeouts:\n  api: 301\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.timeouts?.api).toBeUndefined();
    expect(warnings.some(w => w.includes("timeouts.api"))).toBe(true);
  });

  it("rejects browser timeout above 600 and emits a warning", () => {
    const yaml = "timeouts:\n  browser: 601\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.timeouts?.browser).toBeUndefined();
    expect(warnings.some(w => w.includes("timeouts.browser"))).toBe(true);
  });

  it("omits timeouts key entirely when all timeout values are invalid", () => {
    const yaml = "timeouts:\n  shell: 0\n  api: 0\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.timeouts).toBeUndefined();
    expect(warnings).toHaveLength(2);
  });

  it("rejects non-numeric timeout values and emits a warning", () => {
    const yaml = "timeouts:\n  shell: \"fast\"\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.timeouts?.shell).toBeUndefined();
    expect(warnings.some(w => w.includes("timeouts.shell"))).toBe(true);
  });

  // --- skip.categories ---

  it("parses valid skip categories", () => {
    const yaml = "skip:\n  categories:\n    - visual\n    - metadata\n";
    const { config } = parseVigilConfig(yaml);
    expect(config.skip?.categories).toEqual(["visual", "metadata"]);
  });

  it("ignores unknown category names and emits a warning", () => {
    const yaml = "skip:\n  categories:\n    - visual\n    - unknown-category\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.skip?.categories).toEqual(["visual"]);
    expect(warnings.some(w => w.includes("unknown-category"))).toBe(true);
  });

  it("omits skip key when all categories are invalid", () => {
    const yaml = "skip:\n  categories:\n    - not-a-category\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.skip).toBeUndefined();
    expect(warnings).toHaveLength(1);
  });

  it("accepts all valid category labels", () => {
    const yaml =
      "skip:\n  categories:\n    - build\n    - api\n    - ui-flow\n    - visual\n    - metadata\n    - manual\n    - vague\n";
    const { config } = parseVigilConfig(yaml);
    expect(config.skip?.categories).toHaveLength(7);
  });

  // --- viewports ---

  it("parses valid viewports", () => {
    const yaml =
      "viewports:\n  - label: mobile\n    width: 390\n    height: 844\n  - label: desktop\n    width: 1440\n    height: 900\n";
    const { config } = parseVigilConfig(yaml);
    expect(config.viewports).toEqual([
      { label: "mobile", width: 390, height: 844 },
      { label: "desktop", width: 1440, height: 900 },
    ]);
  });

  it("floors decimal viewport dimensions", () => {
    const yaml = "viewports:\n  - label: test\n    width: 390.7\n    height: 844.2\n";
    const { config } = parseVigilConfig(yaml);
    expect(config.viewports?.[0]).toEqual({ label: "test", width: 390, height: 844 });
  });

  it("rejects viewport with fractional dimensions that floor to 0 and emits a warning", () => {
    const yaml = "viewports:\n  - label: tiny\n    width: 0.4\n    height: 0.9\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.viewports).toBeUndefined();
    expect(warnings).toHaveLength(1);
  });

  it("rejects viewport with width of 0 and emits a warning", () => {
    const yaml = "viewports:\n  - label: bad\n    width: 0\n    height: 768\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.viewports).toBeUndefined();
    expect(warnings).toHaveLength(1);
  });

  it("rejects viewport with width exceeding 3840 and emits a warning", () => {
    const yaml = "viewports:\n  - label: huge\n    width: 4000\n    height: 768\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.viewports).toBeUndefined();
    expect(warnings).toHaveLength(1);
  });

  it("rejects viewport with height exceeding 2160 and emits a warning", () => {
    const yaml = "viewports:\n  - label: tall\n    width: 1920\n    height: 2200\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.viewports).toBeUndefined();
    expect(warnings).toHaveLength(1);
  });

  it("limits viewports to 10 entries and emits a warning", () => {
    const entries = Array.from({ length: 15 }, (_, i) =>
      `  - label: vp${i}\n    width: ${320 + i}\n    height: 568`,
    ).join("\n");
    const yaml = `viewports:\n${entries}\n`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.viewports).toHaveLength(10);
    expect(warnings.some(w => w.includes("limited to 10"))).toBe(true);
  });

  it("omits viewports key when all entries are invalid", () => {
    const yaml = "viewports:\n  - label: bad\n    width: 0\n    height: 0\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.viewports).toBeUndefined();
    expect(warnings).toHaveLength(1);
  });

  it("rejects viewport with empty label and emits a warning", () => {
    const yaml = "viewports:\n  - label: \"\"\n    width: 390\n    height: 844\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.viewports).toBeUndefined();
    expect(warnings.some(w => w.includes("viewports[0]"))).toBe(true);
  });

  it("rejects viewport with whitespace-only label and emits a warning", () => {
    const yaml = "viewports:\n  - label: \"   \"\n    width: 390\n    height: 844\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.viewports).toBeUndefined();
    expect(warnings.some(w => w.includes("viewports[0]"))).toBe(true);
  });

  // --- shell.allow ---

  it("parses valid shell allow prefixes", () => {
    const yaml = "shell:\n  allow:\n    - \"python manage.py test\"\n    - \"bundle exec rspec\"\n";
    const { config } = parseVigilConfig(yaml);
    expect(config.shell?.allow).toEqual(["python manage.py test", "bundle exec rspec"]);
  });

  it("trims whitespace from shell allow prefixes", () => {
    const yaml = "shell:\n  allow:\n    - \"  python manage.py  \"\n";
    const { config } = parseVigilConfig(yaml);
    expect(config.shell?.allow?.[0]).toBe("python manage.py");
  });

  it("rejects shell allow prefix with metacharacters and emits a warning", () => {
    const yaml = "shell:\n  allow:\n    - \"rm -rf /; echo pwned\"\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.shell?.allow).toBeUndefined();
    expect(warnings.some(w => w.includes("shell.allow[0]"))).toBe(true);
  });

  it("rejects empty shell allow prefix and emits a warning", () => {
    const yaml = "shell:\n  allow:\n    - \"\"\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.shell?.allow).toBeUndefined();
    expect(warnings.some(w => w.includes("shell.allow[0]"))).toBe(true);
  });

  it("limits shell allow to 20 entries and emits a warning", () => {
    const entries = Array.from({ length: 25 }, (_, i) => `  - "cmd${i} run"`).join("\n");
    const yaml = `shell:\n  allow:\n${entries}\n`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.shell?.allow).toHaveLength(20);
    expect(warnings.some(w => w.includes("limited to 20"))).toBe(true);
  });

  it("rejects shell allow prefix with pipe metacharacter and emits a warning", () => {
    const yaml = "shell:\n  allow:\n    - \"cat /etc/passwd | base64\"\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.shell?.allow).toBeUndefined();
    expect(warnings.some(w => w.includes("shell.allow[0]"))).toBe(true);
  });

  it("rejects shell allow prefix with backtick and emits a warning", () => {
    const yaml = "shell:\n  allow:\n    - \"`whoami`\"\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.shell?.allow).toBeUndefined();
    expect(warnings.some(w => w.includes("shell.allow[0]"))).toBe(true);
  });

  // --- shell.image ---

  it("parses valid shell image", () => {
    const yaml = "shell:\n  image: \"python:3.12-slim\"\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.shell?.image).toBe("python:3.12-slim");
    expect(warnings).toEqual([]);
  });

  it("parses shell image with registry prefix", () => {
    const yaml = "shell:\n  image: \"ghcr.io/org/custom-runner:latest\"\n";
    const { config } = parseVigilConfig(yaml);
    expect(config.shell?.image).toBe("ghcr.io/org/custom-runner:latest");
  });

  it("rejects shell image with shell metacharacters", () => {
    const yaml = "shell:\n  image: \"--privileged\"\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.shell?.image).toBeUndefined();
    expect(warnings.some(w => w.includes("shell.image"))).toBe(true);
  });

  it("parses shell image alongside shell allow", () => {
    const yaml = "shell:\n  image: \"python:3.12-slim\"\n  allow:\n    - \"pytest\"\n";
    const { config } = parseVigilConfig(yaml);
    expect(config.shell?.image).toBe("python:3.12-slim");
    expect(config.shell?.allow).toEqual(["pytest"]);
  });

  // --- malformed input ---

  it("returns empty config with warning for invalid YAML", () => {
    const yaml = "{ this: is: not: valid: yaml";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config).toEqual({});
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/invalid YAML/i);
  });

  it("returns empty config with warning when root is an array", () => {
    const yaml = "- item1\n- item2\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config).toEqual({});
    expect(warnings).toHaveLength(1);
  });

  it("returns empty config with warning when root is a scalar", () => {
    const yaml = "just a string\n";
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config).toEqual({});
    expect(warnings).toHaveLength(1);
  });

  // --- full config round-trip ---

  it("parses a full .vigil.yml config correctly with no warnings", () => {
    const yaml = `
version: 1
timeouts:
  shell: 120
  api: 20
  browser: 45
skip:
  categories:
    - visual
viewports:
  - label: mobile
    width: 390
    height: 844
  - label: desktop
    width: 1440
    height: 900
shell:
  allow:
    - "python manage.py test"
    - "bundle exec rspec"
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config).toEqual({
      timeouts: { shell: 120, api: 20, browser: 45 },
      skip: { categories: ["visual"] },
      viewports: [
        { label: "mobile", width: 390, height: 844 },
        { label: "desktop", width: 1440, height: 900 },
      ],
      shell: { allow: ["python manage.py test", "bundle exec rspec"] },
    });
    expect(warnings).toEqual([]);
  });

  // --- notifications ---

  it("parses valid notifications config", () => {
    const yaml = `
notifications:
  on: always
  urls:
    - "https://hooks.slack.com/services/T/B/x"
    - "https://discord.com/api/webhooks/123/abc"
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.notifications?.on).toBe("always");
    expect(config.notifications?.urls).toEqual([
      "https://hooks.slack.com/services/T/B/x",
      "https://discord.com/api/webhooks/123/abc",
    ]);
    expect(warnings).toEqual([]);
  });

  it("defaults on to undefined (reporter treats as 'failure')", () => {
    const yaml = `
notifications:
  urls:
    - "https://hooks.slack.com/services/T/B/x"
`;
    const { config } = parseVigilConfig(yaml);
    expect(config.notifications?.on).toBeUndefined();
    expect(config.notifications?.urls).toHaveLength(1);
  });

  it("rejects invalid on value with warning", () => {
    const yaml = `
notifications:
  on: sometimes
  urls:
    - "https://hooks.slack.com/services/T/B/x"
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.notifications?.on).toBeUndefined();
    expect(warnings.some(w => w.includes("notifications.on"))).toBe(true);
  });

  it("rejects malformed https-like URLs with warning", () => {
    const yaml = `
notifications:
  urls:
    - "https://"
    - "https://valid.example.com/hook"
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.notifications?.urls).toEqual(["https://valid.example.com/hook"]);
    expect(warnings.some(w => w.includes("notifications.urls[0]"))).toBe(true);
  });

  it("rejects non-https URLs with warning", () => {
    const yaml = `
notifications:
  urls:
    - "http://insecure.example.com/hook"
    - "https://valid.example.com/hook"
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.notifications?.urls).toEqual(["https://valid.example.com/hook"]);
    expect(warnings.some(w => w.includes("notifications.urls[0]"))).toBe(true);
  });

  it("rejects empty string URLs with warning", () => {
    const yaml = `
notifications:
  urls:
    - ""
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.notifications?.urls).toBeUndefined();
    expect(warnings.some(w => w.includes("notifications.urls[0]"))).toBe(true);
  });

  it("limits URLs to 5 entries with warning", () => {
    const entries = Array.from({ length: 8 }, (_, i) =>
      `    - "https://example.com/hook/${i}"`,
    ).join("\n");
    const yaml = `notifications:\n  urls:\n${entries}\n`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.notifications?.urls).toHaveLength(5);
    expect(warnings.some(w => w.includes("limited to 5"))).toBe(true);
  });

  it("trims whitespace from URLs", () => {
    const yaml = `
notifications:
  urls:
    - "  https://hooks.slack.com/services/T/B/x  "
`;
    const { config } = parseVigilConfig(yaml);
    expect(config.notifications?.urls?.[0]).toBe("https://hooks.slack.com/services/T/B/x");
  });

  it("omits notifications when no valid fields", () => {
    const yaml = `
notifications:
  on: invalid
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config.notifications).toBeUndefined();
    expect(warnings).toHaveLength(1);
  });

  it("collects multiple warnings when several fields are invalid", () => {
    const yaml = `
timeouts:
  shell: 9999
  api: 999
skip:
  categories:
    - valid-but-not-real
shell:
  allow:
    - "echo; rm -rf /"
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(config).toEqual({});
    expect(warnings.length).toBeGreaterThanOrEqual(3);
  });

  // --- llm section ---

  it("parses valid llm config", () => {
    const yaml = `
llm:
  provider: groq
  model: llama-3.3-70b-versatile
  api_key: gsk_test123
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(warnings).toEqual([]);
    expect(config.llm).toEqual({
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      apiKey: "gsk_test123",
    });
  });

  it("parses openai provider", () => {
    const yaml = `
llm:
  provider: openai
  model: gpt-4o-mini
  api_key: sk-test
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(warnings).toEqual([]);
    expect(config.llm?.provider).toBe("openai");
  });

  it("parses ollama provider", () => {
    const yaml = `
llm:
  provider: ollama
  model: llama3
  api_key: unused
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(warnings).toEqual([]);
    expect(config.llm?.provider).toBe("ollama");
  });

  it("rejects invalid llm provider with warning", () => {
    const yaml = `
llm:
  provider: anthropic
  model: claude-3-haiku
  api_key: sk-ant-test
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("llm.provider");
    expect(config.llm?.provider).toBeUndefined();
    // model and api_key should still be parsed
    expect(config.llm?.model).toBe("claude-3-haiku");
    expect(config.llm?.apiKey).toBe("sk-ant-test");
  });

  it("rejects empty llm model with warning", () => {
    const yaml = `
llm:
  provider: groq
  model: ""
  api_key: gsk_test
`;
    const { warnings } = parseVigilConfig(yaml);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("llm.model");
  });

  it("rejects empty llm api_key with warning", () => {
    const yaml = `
llm:
  provider: groq
  model: test
  api_key: ""
`;
    const { warnings } = parseVigilConfig(yaml);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("llm.api_key");
  });

  it("omits llm when no valid fields", () => {
    const yaml = `
llm:
  provider: invalid
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(warnings).toHaveLength(1);
    expect(config.llm).toBeUndefined();
  });

  it("parses partial llm config (only provider)", () => {
    const yaml = `
llm:
  provider: groq
`;
    const { config, warnings } = parseVigilConfig(yaml);
    expect(warnings).toEqual([]);
    expect(config.llm).toEqual({ provider: "groq" });
  });
});
