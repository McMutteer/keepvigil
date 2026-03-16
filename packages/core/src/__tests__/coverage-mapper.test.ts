import { describe, it, expect } from "vitest";
import { mapCoverage, extractChangedFiles } from "../coverage-mapper.js";

// ---------------------------------------------------------------------------
// extractChangedFiles
// ---------------------------------------------------------------------------

describe("extractChangedFiles", () => {
  it("parses file paths from +++ b/ headers", () => {
    const diff = [
      "diff --git a/src/foo.ts b/src/foo.ts",
      "--- a/src/foo.ts",
      "+++ b/src/foo.ts",
      "@@ -1,3 +1,4 @@",
      " const x = 1;",
      "diff --git a/src/bar.ts b/src/bar.ts",
      "--- a/src/bar.ts",
      "+++ b/src/bar.ts",
      "@@ -1,3 +1,4 @@",
    ].join("\n");

    expect(extractChangedFiles(diff)).toEqual(["src/foo.ts", "src/bar.ts"]);
  });

  it("returns empty array for empty diff", () => {
    expect(extractChangedFiles("")).toEqual([]);
  });

  it("handles new files (+++ b/path without --- a/)", () => {
    const diff = [
      "diff --git a/new.ts b/new.ts",
      "--- /dev/null",
      "+++ b/new.ts",
    ].join("\n");
    expect(extractChangedFiles(diff)).toEqual(["new.ts"]);
  });
});

// ---------------------------------------------------------------------------
// mapCoverage — test file matching
// ---------------------------------------------------------------------------

describe("mapCoverage", () => {
  describe("TypeScript/JavaScript test file matching", () => {
    it("matches __tests__/foo.test.ts", () => {
      const changed = ["src/foo.ts"];
      const repo = ["src/foo.ts", "src/__tests__/foo.test.ts"];
      const signal = mapCoverage(changed, repo);
      expect(signal.score).toBe(100);
      expect(signal.details[0].status).toBe("pass");
      expect(signal.details[0].message).toContain("__tests__/foo.test.ts");
    });

    it("matches co-located foo.spec.ts", () => {
      const changed = ["src/foo.ts"];
      const repo = ["src/foo.ts", "src/foo.spec.ts"];
      const signal = mapCoverage(changed, repo);
      expect(signal.score).toBe(100);
    });

    it("matches top-level test/foo.test.ts", () => {
      const changed = ["src/foo.ts"];
      const repo = ["src/foo.ts", "test/foo.test.ts"];
      const signal = mapCoverage(changed, repo);
      expect(signal.score).toBe(100);
    });

    it("reports uncovered file", () => {
      const changed = ["src/bar.ts"];
      const repo = ["src/bar.ts"];
      const signal = mapCoverage(changed, repo);
      expect(signal.score).toBe(0);
      expect(signal.passed).toBe(false);
      expect(signal.details[0].status).toBe("fail");
      expect(signal.details[0].message).toContain("No corresponding test");
    });
  });

  describe("Python test file matching", () => {
    it("matches tests/test_bot.py", () => {
      const changed = ["app/routers/bot.py"];
      const repo = ["app/routers/bot.py", "tests/test_bot.py"];
      const signal = mapCoverage(changed, repo);
      expect(signal.score).toBe(100);
    });

    it("matches nested tests/routers/test_bot.py", () => {
      const changed = ["app/routers/bot.py"];
      const repo = ["app/routers/bot.py", "tests/app/routers/test_bot.py"];
      const signal = mapCoverage(changed, repo);
      expect(signal.score).toBe(100);
    });
  });

  describe("Go test file matching", () => {
    it("matches handler_test.go", () => {
      const changed = ["pkg/handler.go"];
      const repo = ["pkg/handler.go", "pkg/handler_test.go"];
      const signal = mapCoverage(changed, repo);
      expect(signal.score).toBe(100);
    });
  });

  describe("exclusions", () => {
    it("excludes README.md", () => {
      const changed = ["README.md"];
      const signal = mapCoverage(changed, ["README.md"]);
      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("non-source");
    });

    it("excludes package.json", () => {
      const signal = mapCoverage(["package.json"], ["package.json"]);
      expect(signal.score).toBe(100);
    });

    it("excludes Dockerfile", () => {
      const signal = mapCoverage(["Dockerfile"], ["Dockerfile"]);
      expect(signal.score).toBe(100);
    });

    it("excludes .github/ files", () => {
      const signal = mapCoverage([".github/workflows/ci.yml"], [".github/workflows/ci.yml"]);
      expect(signal.score).toBe(100);
    });

    it("excludes tsconfig.json", () => {
      const signal = mapCoverage(["tsconfig.json"], ["tsconfig.json"]);
      expect(signal.score).toBe(100);
    });

    it("excludes test files themselves", () => {
      const changed = ["src/__tests__/foo.test.ts"];
      const signal = mapCoverage(changed, changed);
      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("non-source");
    });
  });

  describe("scoring", () => {
    it("all covered → score 100, passed true", () => {
      const changed = ["src/a.ts", "src/b.ts"];
      const repo = ["src/a.ts", "src/b.ts", "src/__tests__/a.test.ts", "src/__tests__/b.test.ts"];
      const signal = mapCoverage(changed, repo);
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
    });

    it("half covered → score 50, passed true", () => {
      const changed = ["src/a.ts", "src/b.ts"];
      const repo = ["src/a.ts", "src/b.ts", "src/__tests__/a.test.ts"];
      const signal = mapCoverage(changed, repo);
      expect(signal.score).toBe(50);
      expect(signal.passed).toBe(true);
    });

    it("none covered → score 0, passed false", () => {
      const changed = ["src/a.ts", "src/b.ts"];
      const repo = ["src/a.ts", "src/b.ts"];
      const signal = mapCoverage(changed, repo);
      expect(signal.score).toBe(0);
      expect(signal.passed).toBe(false);
    });

    it("no source files → score 100 (nothing to check)", () => {
      const changed = ["README.md", "package.json"];
      const signal = mapCoverage(changed, changed);
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
    });

    it("empty changed files → score 100", () => {
      const signal = mapCoverage([], []);
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
    });
  });

  describe("signal metadata", () => {
    it("has correct id", () => {
      expect(mapCoverage([], []).id).toBe("coverage-mapper");
    });

    it("has correct name", () => {
      expect(mapCoverage([], []).name).toBe("Coverage Mapper");
    });

    it("does not require LLM", () => {
      expect(mapCoverage([], []).requiresLLM).toBe(false);
    });

    it("has weight 10", () => {
      expect(mapCoverage([], []).weight).toBe(10);
    });
  });
});
