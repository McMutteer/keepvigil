import { describe, it, expect } from "vitest";

import { validateCommand, SHELL_METACHARACTERS } from "../allowlist.js";

// ---------------------------------------------------------------------------
// NPX flag bypass prevention
// ---------------------------------------------------------------------------

describe("allowlist — npx dangerous flag prevention", () => {
  it.each([
    ["npx eslint --config=malicious.js .", "--config as flag"],
    ["npx eslint --config .eslintrc.evil.js .", "--config with space"],
    ['npx eslint "--config=evil" .', "--config in double quotes"],
    ["npx eslint '--config=evil' .", "--config in single quotes"],
    ["npx prettier --config evil.json .", "--config on prettier"],
    ["npx eslint --rulesdir /tmp/evil .", "--rulesdir flag"],
    ["npx eslint --plugin evil-plugin .", "--plugin flag"],
    ["npx eslint --resolve-plugins-relative-to /tmp .", "--resolve-plugins-relative-to flag"],
    ["npx eslint -c evil.json .", "-c shorthand flag"],
  ])("blocks npx with dangerous flag: %s (%s)", (cmd) => {
    const result = validateCommand(cmd);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("npx flag not allowed");
  });

  it("blocks npx flag bypass via equals embedding: npx eslint --config=evil", () => {
    // The equals-split logic catches "--config" inside "eslint --config=evil"
    const result = validateCommand("npx eslint --config=evil .");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("npx flag not allowed");
  });

  it("blocks npx dangerous flags passed as later arguments after equals", () => {
    // Verify the equals-split logic catches flags embedded with = in later args
    const result = validateCommand("npx eslint . --resolve-plugins-relative-to=/tmp");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("npx flag not allowed");
  });

  it("allows npx eslint with safe arguments", () => {
    const result = validateCommand("npx eslint src/ --fix --ext .ts,.tsx");
    expect(result.allowed).toBe(true);
  });

  it("allows npx vitest run with normal flags", () => {
    const result = validateCommand("npx vitest run --reporter=verbose");
    expect(result.allowed).toBe(true);
  });

  it("allows npx tsc --noEmit", () => {
    const result = validateCommand("npx tsc --noEmit");
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cd with quoted paths
// ---------------------------------------------------------------------------

describe("allowlist — cd with quoted paths", () => {
  it('blocks: cd "/etc" && npm test (double-quoted absolute)', () => {
    const result = validateCommand('cd "/etc" && npm test');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Absolute paths");
  });

  it("blocks: cd '/etc' && npm test (single-quoted absolute)", () => {
    const result = validateCommand("cd '/etc' && npm test");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Absolute paths");
  });

  it('allows: cd "src/lib" && npm test (quoted relative path)', () => {
    const result = validateCommand('cd "src/lib" && npm test');
    expect(result.allowed).toBe(true);
  });

  it("allows: cd 'packages/core' && pnpm build (single-quoted relative)", () => {
    const result = validateCommand("cd 'packages/core' && pnpm build");
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cd with absolute paths
// ---------------------------------------------------------------------------

describe("allowlist — cd absolute path rejection", () => {
  it("blocks: cd /etc && npm test", () => {
    const result = validateCommand("cd /etc && npm test");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Absolute paths");
  });

  it("blocks: cd ~ && npm test (home directory)", () => {
    const result = validateCommand("cd ~ && npm test");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Absolute paths");
  });

  it("blocks: cd ~/Documents && npm test", () => {
    const result = validateCommand("cd ~/Documents && npm test");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Absolute paths");
  });

  it("blocks: cd C:\\Windows && npm test (Windows path)", () => {
    const result = validateCommand("cd C:\\Windows && npm test");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Absolute paths");
  });

  it("blocks: cd D:\\Projects && npm test (Windows D: drive)", () => {
    const result = validateCommand("cd D:\\Projects && npm test");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Absolute paths");
  });
});

// ---------------------------------------------------------------------------
// cd with path traversal
// ---------------------------------------------------------------------------

describe("allowlist — cd path traversal rejection", () => {
  it("blocks: cd .. && npm test", () => {
    const result = validateCommand("cd .. && npm test");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Path traversal");
  });

  it("blocks: cd ../../../etc && cat passwd", () => {
    const result = validateCommand("cd ../../../etc && cat passwd");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Path traversal");
  });

  it("blocks: cd foo/../../bar && npm test", () => {
    const result = validateCommand("cd foo/../../bar && npm test");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Path traversal");
  });

  it("allows: cd packages/core && npm test (no traversal)", () => {
    const result = validateCommand("cd packages/core && npm test");
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Empty segments in && chains
// ---------------------------------------------------------------------------

describe("allowlist — empty segments in chains", () => {
  it("blocks: npm test && && npm run build (empty middle segment)", () => {
    const result = validateCommand("npm test && && npm run build");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Empty segment");
  });

  it("blocks: && npm test (empty first segment)", () => {
    const result = validateCommand("&& npm test");
    expect(result.allowed).toBe(false);
  });

  it("blocks: npm test && (trailing empty segment)", () => {
    const result = validateCommand("npm test &&");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Empty segment");
  });
});

// ---------------------------------------------------------------------------
// pnpm --filter and -r patterns
// ---------------------------------------------------------------------------

describe("allowlist — pnpm workspace commands", () => {
  it("allows: pnpm --filter landing build", () => {
    const result = validateCommand("pnpm --filter landing build");
    expect(result.allowed).toBe(true);
  });

  it("allows: pnpm --filter @vigil/core test", () => {
    const result = validateCommand("pnpm --filter @vigil/core test");
    expect(result.allowed).toBe(true);
  });

  it("allows: pnpm -r run build", () => {
    const result = validateCommand("pnpm -r run build");
    expect(result.allowed).toBe(true);
  });

  it("allows: pnpm --recursive run test", () => {
    const result = validateCommand("pnpm --recursive run test");
    expect(result.allowed).toBe(true);
  });

  it("allows: pnpm dlx turbo run build", () => {
    const result = validateCommand("pnpm dlx turbo run build");
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Custom prefix validation
// ---------------------------------------------------------------------------

describe("allowlist — custom prefix validation", () => {
  it("allows a command matching a custom prefix", () => {
    const result = validateCommand("myapp test", ["myapp"]);
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain("custom allowlist");
  });

  it("allows exact match of custom prefix (no args)", () => {
    const result = validateCommand("myapp", ["myapp"]);
    expect(result.allowed).toBe(true);
  });

  it("blocks commands not matching any custom prefix", () => {
    const result = validateCommand("unknown-tool run", ["myapp"]);
    expect(result.allowed).toBe(false);
  });

  it("custom prefix requires word boundary (no partial match)", () => {
    // "echo" should NOT match "echoevil"
    const result = validateCommand("echoevil payload", ["echo"]);
    expect(result.allowed).toBe(false);
  });

  it("custom prefix works in && chains", () => {
    const result = validateCommand("cd src && myapp build", ["myapp"]);
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SHELL_METACHARACTERS export
// ---------------------------------------------------------------------------

describe("allowlist — SHELL_METACHARACTERS export", () => {
  it("rejects semicolons", () => {
    expect(SHELL_METACHARACTERS.test(";")).toBe(true);
  });

  it("rejects pipes", () => {
    expect(SHELL_METACHARACTERS.test("|")).toBe(true);
  });

  it("rejects backticks", () => {
    expect(SHELL_METACHARACTERS.test("`")).toBe(true);
  });

  it("rejects dollar sign", () => {
    expect(SHELL_METACHARACTERS.test("$")).toBe(true);
  });

  it("does not reject ampersand (allowed for && chains)", () => {
    expect(SHELL_METACHARACTERS.test("&")).toBe(false);
  });

  it("does not reject simple alphanumeric strings", () => {
    expect(SHELL_METACHARACTERS.test("npm run build")).toBe(false);
  });
});
