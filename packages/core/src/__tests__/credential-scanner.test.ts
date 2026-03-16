import { describe, it, expect } from "vitest";
import { scanCredentials } from "../credential-scanner.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal unified diff with a single added line in a given file */
function makeDiff(file: string, addedLine: string): string {
  return [
    `diff --git a/${file} b/${file}`,
    `--- a/${file}`,
    `+++ b/${file}`,
    `@@ -1,3 +1,4 @@`,
    ` const x = 1;`,
    `+${addedLine}`,
    ` const y = 2;`,
  ].join("\n");
}

/** Build a diff with a removed line (should NOT trigger detection) */
function makeDiffRemoved(file: string, removedLine: string): string {
  return [
    `diff --git a/${file} b/${file}`,
    `--- a/${file}`,
    `+++ b/${file}`,
    `@@ -1,4 +1,3 @@`,
    ` const x = 1;`,
    `-${removedLine}`,
    ` const y = 2;`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Detection tests
// ---------------------------------------------------------------------------

describe("scanCredentials", () => {
  describe("detects secrets in added lines", () => {
    it("detects AWS access key", () => {
      const diff = makeDiff("src/config.ts", 'const key = "AKIAIOSFODNN7EXAMPLE";');
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
      expect(signal.score).toBe(0);
      expect(signal.details).toHaveLength(1);
      expect(signal.details[0].label).toContain("AWS Access Key");
      expect(signal.details[0].label).toContain("src/config.ts");
      expect(signal.details[0].status).toBe("fail");
    });

    it("detects GitHub personal access token (ghp_)", () => {
      const diff = makeDiff("src/api.ts", 'const token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn";');
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
      expect(signal.details[0].label).toContain("GitHub Token");
    });

    it("detects GitHub server token (ghs_)", () => {
      const diff = makeDiff("src/auth.ts", 'const token = "ghs_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn";');
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
      expect(signal.details[0].label).toContain("GitHub Token");
    });

    it("detects private key header", () => {
      const diff = makeDiff("certs/key.pem", "-----BEGIN RSA PRIVATE KEY-----");
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
      expect(signal.details[0].label).toContain("Private Key");
    });

    it("detects OPENSSH private key", () => {
      const diff = makeDiff("keys/id_rsa", "-----BEGIN OPENSSH PRIVATE KEY-----");
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
    });

    it("detects Slack token", () => {
      const diff = makeDiff("src/slack.ts", 'const token = "xoxb-123456789-abcdefghij";');
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
      expect(signal.details[0].label).toContain("Slack Token");
    });

    it("detects GitLab token", () => {
      const diff = makeDiff("src/ci.ts", 'const token = "glpat-abcdefghijklmnopqrst";');
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
      expect(signal.details[0].label).toContain("GitLab Token");
    });

    it("detects JWT token", () => {
      const diff = makeDiff("src/auth.ts", 'const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";');
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
      expect(signal.details[0].label).toContain("JWT Token");
    });

    it("detects generic API key assignment", () => {
      const diff = makeDiff("src/config.ts", 'const api_key = "sk_live_abcdefghijklmnopqrstuvwx";');
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
      expect(signal.details[0].label).toContain("Generic API Key");
    });

    it("detects hardcoded password", () => {
      const diff = makeDiff("src/db.ts", "password = 'super_secret_password_123'");
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
      expect(signal.details[0].label).toContain("Hardcoded Password");
    });

    it("detects MongoDB connection string with credentials", () => {
      const diff = makeDiff(".env", "mongodb://admin:secretpass@localhost:27017/mydb");
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
      expect(signal.details[0].label).toContain("Connection String");
    });

    it("detects PostgreSQL connection string with credentials", () => {
      const diff = makeDiff("src/db.ts", 'const url = "postgres://user:pass123@db.example.com:5432/prod";');
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
      expect(signal.details[0].label).toContain("Connection String");
    });
  });

  describe("ignores secrets NOT in added lines", () => {
    it("ignores secrets in removed lines", () => {
      const diff = makeDiffRemoved("src/config.ts", 'const key = "AKIAIOSFODNN7EXAMPLE";');
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(true);
      expect(signal.score).toBe(100);
    });

    it("ignores secrets in context lines", () => {
      const diff = [
        "diff --git a/src/config.ts b/src/config.ts",
        "--- a/src/config.ts",
        "+++ b/src/config.ts",
        "@@ -1,3 +1,4 @@",
        ' const key = "AKIAIOSFODNN7EXAMPLE";', // context line (space prefix)
        "+const newVar = 42;",
        " const y = 2;",
      ].join("\n");
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(true);
    });
  });

  describe("clean diffs", () => {
    it("returns passing signal for clean diff", () => {
      const diff = makeDiff("src/app.ts", "const greeting = 'hello world';");
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(true);
      expect(signal.score).toBe(100);
      expect(signal.details[0].status).toBe("pass");
      expect(signal.details[0].message).toContain("no secrets found");
    });

    it("returns passing signal for empty diff", () => {
      const signal = scanCredentials("");
      expect(signal.passed).toBe(true);
      expect(signal.score).toBe(100);
    });

    it("returns passing signal for whitespace-only diff", () => {
      const signal = scanCredentials("   \n  \n  ");
      expect(signal.passed).toBe(true);
      expect(signal.score).toBe(100);
    });
  });

  describe("multiple findings", () => {
    it("reports multiple secrets in same diff", () => {
      const diff = [
        "diff --git a/src/config.ts b/src/config.ts",
        "--- a/src/config.ts",
        "+++ b/src/config.ts",
        "@@ -1,2 +1,4 @@",
        ' const x = 1;',
        '+const awsKey = "AKIAIOSFODNN7EXAMPLE";',
        '+const ghToken = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn";',
        " const y = 2;",
      ].join("\n");
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
      expect(signal.details.length).toBeGreaterThanOrEqual(2);
    });

    it("reports findings across multiple files", () => {
      const diff = [
        "diff --git a/src/a.ts b/src/a.ts",
        "--- a/src/a.ts",
        "+++ b/src/a.ts",
        "@@ -1,2 +1,3 @@",
        " const x = 1;",
        '+const key = "AKIAIOSFODNN7EXAMPLE";',
        " const y = 2;",
        "diff --git a/src/b.ts b/src/b.ts",
        "--- a/src/b.ts",
        "+++ b/src/b.ts",
        "@@ -1,2 +1,3 @@",
        " const a = 1;",
        "+-----BEGIN RSA PRIVATE KEY-----",
        " const b = 2;",
      ].join("\n");
      const signal = scanCredentials(diff);
      expect(signal.passed).toBe(false);
      expect(signal.details).toHaveLength(2);
      expect(signal.details[0].label).toContain("src/a.ts");
      expect(signal.details[1].label).toContain("src/b.ts");
    });
  });

  describe("signal metadata", () => {
    it("has correct signal id", () => {
      const signal = scanCredentials("");
      expect(signal.id).toBe("credential-scan");
    });

    it("has correct signal name", () => {
      const signal = scanCredentials("");
      expect(signal.name).toBe("Credential Scan");
    });

    it("does not require LLM", () => {
      const signal = scanCredentials("");
      expect(signal.requiresLLM).toBe(false);
    });

    it("has weight 25", () => {
      const signal = scanCredentials("");
      expect(signal.weight).toBe(25);
    });
  });

  describe("redaction", () => {
    it("never includes full secret value in detail message", () => {
      const secret = "AKIAIOSFODNN7EXAMPLE";
      const diff = makeDiff("src/config.ts", `const key = "${secret}";`);
      const signal = scanCredentials(diff);
      expect(signal.details[0].message).not.toContain(secret);
    });

    it("shows redacted preview (first/last 4 chars)", () => {
      const diff = makeDiff("src/config.ts", 'const key = "AKIAIOSFODNN7EXAMPLE";');
      const signal = scanCredentials(diff);
      expect(signal.details[0].message).toContain("AKIA");
      expect(signal.details[0].message).toContain("...");
    });
  });

  describe("line number tracking", () => {
    it("reports correct line number from hunk header", () => {
      const diff = [
        "diff --git a/src/config.ts b/src/config.ts",
        "--- a/src/config.ts",
        "+++ b/src/config.ts",
        "@@ -10,3 +10,4 @@",
        " const x = 1;",
        '+const key = "AKIAIOSFODNN7EXAMPLE";',
        " const y = 2;",
      ].join("\n");
      const signal = scanCredentials(diff);
      expect(signal.details[0].label).toContain(":11");
    });
  });
});
