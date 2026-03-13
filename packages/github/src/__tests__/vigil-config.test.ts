import { describe, it, expect } from "vitest";
import { parseVigilConfig } from "../services/vigil-config.js";

describe("parseVigilConfig", () => {
  // --- happy path ---

  it("returns empty config for undefined input", () => {
    expect(parseVigilConfig(undefined)).toEqual({});
  });

  it("returns empty config for empty string", () => {
    expect(parseVigilConfig("")).toEqual({});
  });

  it("returns empty config for whitespace-only string", () => {
    expect(parseVigilConfig("   \n  ")).toEqual({});
  });

  it("returns empty config for valid YAML with no recognized fields", () => {
    const yaml = "foo: bar\nbaz: 123\n";
    expect(parseVigilConfig(yaml)).toEqual({});
  });

  it("parses version: 1 and ignores it (just a marker)", () => {
    const yaml = "version: 1\n";
    expect(parseVigilConfig(yaml)).toEqual({});
  });

  it("rejects unsupported version", () => {
    const yaml = "version: 2\ntimeouts:\n  shell: 60\n";
    expect(parseVigilConfig(yaml)).toEqual({});
  });

  // --- timeouts ---

  it("parses valid shell timeout", () => {
    const yaml = "timeouts:\n  shell: 120\n";
    const config = parseVigilConfig(yaml);
    expect(config.timeouts?.shell).toBe(120);
  });

  it("parses valid api timeout", () => {
    const yaml = "timeouts:\n  api: 15\n";
    const config = parseVigilConfig(yaml);
    expect(config.timeouts?.api).toBe(15);
  });

  it("parses valid browser timeout", () => {
    const yaml = "timeouts:\n  browser: 90\n";
    const config = parseVigilConfig(yaml);
    expect(config.timeouts?.browser).toBe(90);
  });

  it("parses all three timeouts together", () => {
    const yaml = "timeouts:\n  shell: 300\n  api: 30\n  browser: 60\n";
    const config = parseVigilConfig(yaml);
    expect(config.timeouts).toEqual({ shell: 300, api: 30, browser: 60 });
  });

  it("floors decimal timeout values", () => {
    const yaml = "timeouts:\n  shell: 90.9\n";
    const config = parseVigilConfig(yaml);
    expect(config.timeouts?.shell).toBe(90);
  });

  it("rejects shell timeout of 0", () => {
    const yaml = "timeouts:\n  shell: 0\n";
    const config = parseVigilConfig(yaml);
    expect(config.timeouts?.shell).toBeUndefined();
  });

  it("rejects negative shell timeout", () => {
    const yaml = "timeouts:\n  shell: -10\n";
    const config = parseVigilConfig(yaml);
    expect(config.timeouts?.shell).toBeUndefined();
  });

  it("rejects shell timeout above 3600", () => {
    const yaml = "timeouts:\n  shell: 3601\n";
    const config = parseVigilConfig(yaml);
    expect(config.timeouts?.shell).toBeUndefined();
  });

  it("rejects api timeout above 300", () => {
    const yaml = "timeouts:\n  api: 301\n";
    const config = parseVigilConfig(yaml);
    expect(config.timeouts?.api).toBeUndefined();
  });

  it("rejects browser timeout above 600", () => {
    const yaml = "timeouts:\n  browser: 601\n";
    const config = parseVigilConfig(yaml);
    expect(config.timeouts?.browser).toBeUndefined();
  });

  it("omits timeouts key entirely when all timeout values are invalid", () => {
    const yaml = "timeouts:\n  shell: 0\n  api: 0\n";
    const config = parseVigilConfig(yaml);
    expect(config.timeouts).toBeUndefined();
  });

  it("rejects non-numeric timeout values", () => {
    const yaml = "timeouts:\n  shell: \"fast\"\n";
    const config = parseVigilConfig(yaml);
    expect(config.timeouts?.shell).toBeUndefined();
  });

  // --- skip.categories ---

  it("parses valid skip categories", () => {
    const yaml = "skip:\n  categories:\n    - visual\n    - metadata\n";
    const config = parseVigilConfig(yaml);
    expect(config.skip?.categories).toEqual(["visual", "metadata"]);
  });

  it("ignores unknown category names", () => {
    const yaml = "skip:\n  categories:\n    - visual\n    - unknown-category\n";
    const config = parseVigilConfig(yaml);
    expect(config.skip?.categories).toEqual(["visual"]);
  });

  it("omits skip key when all categories are invalid", () => {
    const yaml = "skip:\n  categories:\n    - not-a-category\n";
    const config = parseVigilConfig(yaml);
    expect(config.skip).toBeUndefined();
  });

  it("accepts all valid category labels", () => {
    const yaml =
      "skip:\n  categories:\n    - build\n    - api\n    - ui-flow\n    - visual\n    - metadata\n    - manual\n    - vague\n";
    const config = parseVigilConfig(yaml);
    expect(config.skip?.categories).toHaveLength(7);
  });

  // --- viewports ---

  it("parses valid viewports", () => {
    const yaml =
      "viewports:\n  - label: mobile\n    width: 390\n    height: 844\n  - label: desktop\n    width: 1440\n    height: 900\n";
    const config = parseVigilConfig(yaml);
    expect(config.viewports).toEqual([
      { label: "mobile", width: 390, height: 844 },
      { label: "desktop", width: 1440, height: 900 },
    ]);
  });

  it("floors decimal viewport dimensions", () => {
    const yaml = "viewports:\n  - label: test\n    width: 390.7\n    height: 844.2\n";
    const config = parseVigilConfig(yaml);
    expect(config.viewports?.[0]).toEqual({ label: "test", width: 390, height: 844 });
  });

  it("rejects viewport with width of 0", () => {
    const yaml = "viewports:\n  - label: bad\n    width: 0\n    height: 768\n";
    const config = parseVigilConfig(yaml);
    expect(config.viewports).toBeUndefined();
  });

  it("rejects viewport with width exceeding 3840", () => {
    const yaml = "viewports:\n  - label: huge\n    width: 4000\n    height: 768\n";
    const config = parseVigilConfig(yaml);
    expect(config.viewports).toBeUndefined();
  });

  it("rejects viewport with height exceeding 2160", () => {
    const yaml = "viewports:\n  - label: tall\n    width: 1920\n    height: 2200\n";
    const config = parseVigilConfig(yaml);
    expect(config.viewports).toBeUndefined();
  });

  it("limits viewports to 10 entries", () => {
    const entries = Array.from({ length: 15 }, (_, i) =>
      `  - label: vp${i}\n    width: ${320 + i}\n    height: 568`,
    ).join("\n");
    const yaml = `viewports:\n${entries}\n`;
    const config = parseVigilConfig(yaml);
    expect(config.viewports).toHaveLength(10);
  });

  it("omits viewports key when all entries are invalid", () => {
    const yaml = "viewports:\n  - label: bad\n    width: 0\n    height: 0\n";
    const config = parseVigilConfig(yaml);
    expect(config.viewports).toBeUndefined();
  });

  // --- shell.allow ---

  it("parses valid shell allow prefixes", () => {
    const yaml = "shell:\n  allow:\n    - \"python manage.py test\"\n    - \"bundle exec rspec\"\n";
    const config = parseVigilConfig(yaml);
    expect(config.shell?.allow).toEqual(["python manage.py test", "bundle exec rspec"]);
  });

  it("trims whitespace from shell allow prefixes", () => {
    const yaml = "shell:\n  allow:\n    - \"  python manage.py  \"\n";
    const config = parseVigilConfig(yaml);
    expect(config.shell?.allow?.[0]).toBe("python manage.py");
  });

  it("rejects shell allow prefix with metacharacters", () => {
    const yaml = "shell:\n  allow:\n    - \"rm -rf /; echo pwned\"\n";
    const config = parseVigilConfig(yaml);
    expect(config.shell?.allow).toBeUndefined();
  });

  it("rejects empty shell allow prefix", () => {
    const yaml = "shell:\n  allow:\n    - \"\"\n";
    const config = parseVigilConfig(yaml);
    expect(config.shell?.allow).toBeUndefined();
  });

  it("limits shell allow to 20 entries", () => {
    const entries = Array.from({ length: 25 }, (_, i) => `  - "cmd${i} run"`).join("\n");
    const yaml = `shell:\n  allow:\n${entries}\n`;
    const config = parseVigilConfig(yaml);
    expect(config.shell?.allow).toHaveLength(20);
  });

  it("rejects shell allow prefix with pipe metacharacter", () => {
    const yaml = "shell:\n  allow:\n    - \"cat /etc/passwd | base64\"\n";
    const config = parseVigilConfig(yaml);
    expect(config.shell?.allow).toBeUndefined();
  });

  it("rejects shell allow prefix with backtick", () => {
    const yaml = "shell:\n  allow:\n    - \"`whoami`\"\n";
    const config = parseVigilConfig(yaml);
    expect(config.shell?.allow).toBeUndefined();
  });

  // --- malformed input ---

  it("returns empty config for invalid YAML", () => {
    const yaml = "{ this: is: not: valid: yaml";
    expect(parseVigilConfig(yaml)).toEqual({});
  });

  it("returns empty config when root is an array", () => {
    const yaml = "- item1\n- item2\n";
    expect(parseVigilConfig(yaml)).toEqual({});
  });

  it("returns empty config when root is a scalar", () => {
    const yaml = "just a string\n";
    expect(parseVigilConfig(yaml)).toEqual({});
  });

  // --- full config round-trip ---

  it("parses a full .vigil.yml config correctly", () => {
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
    const config = parseVigilConfig(yaml);
    expect(config).toEqual({
      timeouts: { shell: 120, api: 20, browser: 45 },
      skip: { categories: ["visual"] },
      viewports: [
        { label: "mobile", width: 390, height: 844 },
        { label: "desktop", width: 1440, height: 900 },
      ],
      shell: { allow: ["python manage.py test", "bundle exec rspec"] },
    });
  });
});
