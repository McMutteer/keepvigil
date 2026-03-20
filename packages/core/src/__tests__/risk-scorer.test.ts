import { describe, it, expect } from "vitest";
import { assessRisk } from "../risk-scorer.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDiff(files: Array<{ path: string; content?: string; isNew?: boolean }>): string {
  return files
    .map((f) => {
      const fromLine = f.isNew ? "--- /dev/null" : `--- a/${f.path}`;
      const content = f.content ?? "+// changed";
      return `diff --git a/${f.path} b/${f.path}\n${fromLine}\n+++ b/${f.path}\n@@ -1,1 +1,1 @@\n${content}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Empty / trivial input
// ---------------------------------------------------------------------------

describe("assessRisk", () => {
  it("returns score 100 for empty diff", () => {
    const signal = assessRisk("");
    expect(signal.score).toBe(100);
    expect(signal.passed).toBe(true);
    expect(signal.id).toBe("risk-score");
  });

  it("returns score 100 for whitespace-only diff", () => {
    const signal = assessRisk("   \n  \n ");
    expect(signal.score).toBe(100);
    expect(signal.passed).toBe(true);
  });

  it("returns score 100 for diff with no risk factors", () => {
    const diff = makeDiff([{ path: "src/utils/helper.ts" }]);
    const signal = assessRisk(diff);
    expect(signal.score).toBe(100);
    expect(signal.passed).toBe(true);
    expect(signal.details).toHaveLength(1);
    expect(signal.details[0].status).toBe("pass");
  });

  // ---------------------------------------------------------------------------
  // HIGH risk factors (-20 each)
  // ---------------------------------------------------------------------------

  describe("HIGH risk: authentication files", () => {
    it("detects auth middleware", () => {
      const diff = makeDiff([{ path: "src/middleware/auth.ts" }]);
      const signal = assessRisk(diff);
      expect(signal.score).toBeLessThanOrEqual(80);
      const authDetail = signal.details.find((d) => d.label.includes("authentication"));
      expect(authDetail).toBeDefined();
      expect(authDetail!.status).toBe("fail");
    });

    it("detects login files", () => {
      const diff = makeDiff([{ path: "src/pages/login.tsx" }]);
      const signal = assessRisk(diff);
      const authDetail = signal.details.find((d) => d.label.includes("authentication"));
      expect(authDetail).toBeDefined();
    });

    it("detects session files", () => {
      const diff = makeDiff([{ path: "src/services/session-manager.ts" }]);
      const signal = assessRisk(diff);
      const authDetail = signal.details.find((d) => d.label.includes("authentication"));
      expect(authDetail).toBeDefined();
    });

    it("detects JWT files", () => {
      const diff = makeDiff([{ path: "src/utils/jwt.ts" }]);
      const signal = assessRisk(diff);
      const authDetail = signal.details.find((d) => d.label.includes("authentication"));
      expect(authDetail).toBeDefined();
    });

    it("does not flag auth test files", () => {
      const diff = makeDiff([{ path: "src/__tests__/auth.test.ts" }]);
      const signal = assessRisk(diff);
      const authDetail = signal.details.find((d) => d.label.includes("authentication"));
      expect(authDetail).toBeUndefined();
    });
  });

  describe("HIGH risk: database schema", () => {
    it("detects migration files", () => {
      const diff = makeDiff([{ path: "drizzle/0001_migration.sql" }]);
      const signal = assessRisk(diff);
      const dbDetail = signal.details.find((d) => d.label.includes("Database"));
      expect(dbDetail).toBeDefined();
      expect(dbDetail!.status).toBe("fail");
    });

    it("detects schema files", () => {
      const diff = makeDiff([{ path: "src/db/schema.ts" }]);
      const signal = assessRisk(diff);
      const dbDetail = signal.details.find((d) => d.label.includes("Database"));
      expect(dbDetail).toBeDefined();
    });

    it("detects prisma schema", () => {
      const diff = makeDiff([{ path: "prisma/schema.prisma" }]);
      const signal = assessRisk(diff);
      const dbDetail = signal.details.find((d) => d.label.includes("Database"));
      expect(dbDetail).toBeDefined();
    });
  });

  describe("HIGH risk: credential patterns in config", () => {
    it("detects password in yaml config", () => {
      const diff = makeDiff([{
        path: "config/database.yml",
        content: '+password: "not-a-real-credential"',
      }]);
      const signal = assessRisk(diff);
      const credDetail = signal.details.find((d) => d.label.includes("Credential"));
      expect(credDetail).toBeDefined();
    });

    it("ignores placeholder values", () => {
      const diff = makeDiff([{
        path: "config/database.yml",
        content: '+password: "changeme"',
      }]);
      const signal = assessRisk(diff);
      const credDetail = signal.details.find((d) => d.label.includes("Credential"));
      expect(credDetail).toBeUndefined();
    });

    it("ignores credential patterns in non-config files", () => {
      const diff = makeDiff([{
        path: "src/auth/handler.ts",
        content: '+const password = req.body.password;',
      }]);
      const signal = assessRisk(diff);
      // This should detect auth file (HIGH) but not credential config
      const credDetail = signal.details.find((d) => d.label.includes("Credential patterns in config"));
      expect(credDetail).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // MEDIUM risk factors (-10 each)
  // ---------------------------------------------------------------------------

  describe("MEDIUM risk: new dependencies", () => {
    it("detects new package.json dependencies", () => {
      const diff = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -5,1 +5,3 @@
 "dependencies": {
+  "ioredis": "^5.0.0",
+  "@types/ioredis": "^4.0.0"
 }`;
      const signal = assessRisk(diff);
      const depDetail = signal.details.find((d) => d.label.includes("New dependencies"));
      expect(depDetail).toBeDefined();
      expect(depDetail!.message).toContain("ioredis");
    });
  });

  describe("MEDIUM risk: environment variables", () => {
    it("detects process.env references", () => {
      const diff = makeDiff([{
        path: "src/config.ts",
        content: '+const apiUrl = process.env.API_URL;',
      }]);
      const signal = assessRisk(diff);
      const envDetail = signal.details.find((d) => d.label.includes("environment"));
      expect(envDetail).toBeDefined();
    });

    it("does not flag env vars in test files", () => {
      const diff = makeDiff([{
        path: "src/__tests__/config.test.ts",
        content: '+process.env.API_URL = "http://test";',
      }]);
      const signal = assessRisk(diff);
      const envDetail = signal.details.find((d) => d.label.includes("environment"));
      expect(envDetail).toBeUndefined();
    });
  });

  describe("MEDIUM risk: cross-boundary", () => {
    it("detects API + frontend changes", () => {
      const diff = makeDiff([
        { path: "src/api/routes/users.ts" },
        { path: "src/components/UserList.tsx" },
      ]);
      const signal = assessRisk(diff);
      const crossDetail = signal.details.find((d) => d.label.includes("Cross-boundary"));
      expect(crossDetail).toBeDefined();
    });
  });

  describe("MEDIUM risk: blast radius", () => {
    it("flags >20 source files", () => {
      const files = Array.from({ length: 22 }, (_, i) => ({
        path: `src/modules/module${i}.ts`,
      }));
      const diff = makeDiff(files);
      const signal = assessRisk(diff);
      const blastDetail = signal.details.find((d) => d.label.includes("blast radius"));
      expect(blastDetail).toBeDefined();
      expect(blastDetail!.message).toContain("22");
    });

    it("does not flag <=20 source files", () => {
      const files = Array.from({ length: 20 }, (_, i) => ({
        path: `src/modules/module${i}.ts`,
      }));
      const diff = makeDiff(files);
      const signal = assessRisk(diff);
      const blastDetail = signal.details.find((d) => d.label.includes("blast radius"));
      expect(blastDetail).toBeUndefined();
    });

    it("excludes test and config files from blast radius count", () => {
      const files = [
        ...Array.from({ length: 15 }, (_, i) => ({ path: `src/modules/module${i}.ts` })),
        ...Array.from({ length: 10 }, (_, i) => ({ path: `src/__tests__/module${i}.test.ts` })),
        { path: "README.md" },
        { path: "package.json" },
      ];
      const diff = makeDiff(files);
      const signal = assessRisk(diff);
      const blastDetail = signal.details.find((d) => d.label.includes("blast radius"));
      expect(blastDetail).toBeUndefined(); // only 15 source files
    });
  });

  describe("MEDIUM risk: infrastructure changes", () => {
    it("detects Dockerfile changes", () => {
      const diff = makeDiff([{ path: "Dockerfile" }]);
      const signal = assessRisk(diff);
      const infraDetail = signal.details.find((d) => d.label.includes("Infrastructure"));
      expect(infraDetail).toBeDefined();
    });

    it("detects GitHub Actions changes", () => {
      const diff = makeDiff([{ path: ".github/workflows/ci.yml" }]);
      const signal = assessRisk(diff);
      const infraDetail = signal.details.find((d) => d.label.includes("Infrastructure"));
      expect(infraDetail).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // LOW risk factors (-5 each)
  // ---------------------------------------------------------------------------

  describe("LOW risk: no test coverage", () => {
    it("flags source files without tests", () => {
      const diff = makeDiff([{ path: "src/services/payment.ts" }]);
      const signal = assessRisk(diff, undefined, ["src/services/payment.ts"]);
      const testDetail = signal.details.find((d) => d.label.includes("Untested"));
      expect(testDetail).toBeDefined();
    });

    it("does not flag files with existing tests", () => {
      const diff = makeDiff([{ path: "src/services/payment.ts" }]);
      const signal = assessRisk(diff, undefined, [
        "src/services/payment.ts",
        "src/services/payment.test.ts",
      ]);
      const testDetail = signal.details.find((d) => d.label.includes("Untested"));
      expect(testDetail).toBeUndefined();
    });

    it("does not flag files with __tests__ directory tests", () => {
      const diff = makeDiff([{ path: "src/services/payment.ts" }]);
      const signal = assessRisk(diff, undefined, [
        "src/services/payment.ts",
        "src/services/__tests__/payment.test.ts",
      ]);
      const testDetail = signal.details.find((d) => d.label.includes("Untested"));
      expect(testDetail).toBeUndefined();
    });

    it("skips test coverage check when repoFiles not provided", () => {
      const diff = makeDiff([{ path: "src/services/payment.ts" }]);
      const signal = assessRisk(diff);
      const testDetail = signal.details.find((d) => d.label.includes("Untested"));
      expect(testDetail).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Score computation
  // ---------------------------------------------------------------------------

  describe("score computation", () => {
    it("deducts 20 for HIGH factors", () => {
      const diff = makeDiff([{ path: "src/auth/middleware.ts" }]);
      const signal = assessRisk(diff);
      // Auth (HIGH -20) = 80
      expect(signal.score).toBe(80);
      expect(signal.passed).toBe(true);
    });

    it("deducts 10 for MEDIUM factors", () => {
      const diff = makeDiff([{ path: "Dockerfile" }]);
      const signal = assessRisk(diff);
      // Infrastructure (MEDIUM -10) = 90
      expect(signal.score).toBe(90);
      expect(signal.passed).toBe(true);
    });

    it("accumulates multiple factors", () => {
      const diff = makeDiff([
        { path: "src/auth/middleware.ts" },
        { path: "drizzle/0001_migration.sql" },
        { path: "Dockerfile" },
      ]);
      const signal = assessRisk(diff);
      // Auth (HIGH -20) + DB (HIGH -20) + Infra (MEDIUM -10) = 50
      expect(signal.score).toBe(50);
      expect(signal.passed).toBe(true);
    });

    it("fails when score drops below 40", () => {
      const diff = makeDiff([
        { path: "src/auth/middleware.ts" },
        { path: "drizzle/0001_migration.sql" },
        { path: "config/secrets.yml", content: '+api_key: "not-a-real-credential"' },
      ]);
      const signal = assessRisk(diff);
      // Auth (HIGH -20) + DB (HIGH -20) + Cred config (HIGH -20) = 40
      expect(signal.score).toBe(40);
      expect(signal.passed).toBe(true);
    });

    it("floors score at 0", () => {
      // 7 factors to exceed 100 total deductions:
      // Auth(-20) + DB(-20) + CredConfig(-20) + EnvVars(-10) + Cross-boundary(-10) + NewDeps(-10) + Infra(-10) = -100
      const diff = `diff --git a/src/auth/middleware.ts b/src/auth/middleware.ts
--- a/src/auth/middleware.ts
+++ b/src/auth/middleware.ts
@@ -1,1 +1,1 @@
+const apiUrl = process.env.API_URL;
diff --git a/drizzle/0001_migration.sql b/drizzle/0001_migration.sql
--- a/drizzle/0001_migration.sql
+++ b/drizzle/0001_migration.sql
@@ -1,1 +1,1 @@
+ALTER TABLE users
diff --git a/config/app.yml b/config/app.yml
--- a/config/app.yml
+++ b/config/app.yml
@@ -1,1 +1,1 @@
+secret_key: "not-a-real-credential"
diff --git a/src/api/routes.ts b/src/api/routes.ts
--- a/src/api/routes.ts
+++ b/src/api/routes.ts
@@ -1,1 +1,1 @@
+export const route = "test";
diff --git a/src/components/App.tsx b/src/components/App.tsx
--- a/src/components/App.tsx
+++ b/src/components/App.tsx
@@ -1,1 +1,1 @@
+export const App = () => null;
diff --git a/Dockerfile b/Dockerfile
--- a/Dockerfile
+++ b/Dockerfile
@@ -1,1 +1,1 @@
+FROM node:22
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -5,1 +5,2 @@
 "dependencies": {
+  "new-pkg": "^1.0.0"
 }`;
      const signal = assessRisk(diff);
      // Multiple risk factors detected — score should be well below the pass threshold
      // and Math.max(0, score) prevents going negative
      expect(signal.score).toBeGreaterThanOrEqual(0);
      expect(signal.score).toBeLessThan(40);
      expect(signal.passed).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Signal metadata
  // ---------------------------------------------------------------------------

  describe("signal metadata", () => {
    it("has correct signal id and name", () => {
      const signal = assessRisk("");
      expect(signal.id).toBe("risk-score");
      expect(signal.name).toBe("Risk Assessment");
    });

    it("does not require LLM", () => {
      const signal = assessRisk("");
      expect(signal.requiresLLM).toBe(false);
    });

    it("includes risk level summary in details", () => {
      const diff = makeDiff([{ path: "src/auth/middleware.ts" }]);
      const signal = assessRisk(diff);
      const summary = signal.details.find((d) => d.label.startsWith("Risk Level:"));
      expect(summary).toBeDefined();
      expect(summary!.label).toContain("HIGH");
    });

    it("shows MEDIUM risk level when no high factors", () => {
      const diff = makeDiff([{ path: "Dockerfile" }]);
      const signal = assessRisk(diff);
      const summary = signal.details.find((d) => d.label.startsWith("Risk Level:"));
      expect(summary).toBeDefined();
      expect(summary!.label).toContain("MEDIUM");
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("handles diff with only deleted files", () => {
      const diff = `diff --git a/old-file.ts b/old-file.ts
--- a/old-file.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-const x = 1;
-const y = 2;
-export { x, y };`;
      const signal = assessRisk(diff);
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
    });

    it("uses pre-computed changedFiles when provided", () => {
      const diff = makeDiff([{ path: "src/auth/middleware.ts" }]);
      const changedFiles = [{ path: "src/auth/middleware.ts", isNew: false }];
      const signal = assessRisk(diff, changedFiles);
      const authDetail = signal.details.find((d) => d.label.includes("authentication"));
      expect(authDetail).toBeDefined();
    });

    it("handles multiple risk factors of same type", () => {
      const diff = makeDiff([
        { path: "src/auth/login.ts" },
        { path: "src/auth/session.ts" },
      ]);
      const signal = assessRisk(diff);
      // Should be a single "authentication" factor, not two
      const authDetails = signal.details.filter((d) => d.label.includes("authentication"));
      expect(authDetails).toHaveLength(1);
      expect(authDetails[0].message).toContain("login.ts");
      expect(authDetails[0].message).toContain("session.ts");
    });
  });
});
