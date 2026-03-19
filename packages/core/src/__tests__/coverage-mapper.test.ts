import { describe, it, expect } from "vitest";
import { mapCoverage, extractChangedFiles, extractChangedFilesWithStatus } from "../coverage-mapper.js";
import type { ChangedFile } from "../coverage-mapper.js";
import type { ClassifiedItem } from "../types.js";

function makeItem(id: string, text: string, codeBlocks: string[] = []): ClassifiedItem {
  return {
    item: { id, text, checked: false, raw: text, indent: 0, hints: { isManual: false, codeBlocks, urls: [] } },
    confidence: "HIGH",
    executorType: "assertion",
    category: "assertion",
    reasoning: "test",
  };
}

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
// extractChangedFilesWithStatus
// ---------------------------------------------------------------------------

describe("extractChangedFilesWithStatus", () => {
  it("identifies new files (--- /dev/null)", () => {
    const diff = [
      "diff --git a/new.ts b/new.ts",
      "--- /dev/null",
      "+++ b/new.ts",
    ].join("\n");
    const files = extractChangedFilesWithStatus(diff);
    expect(files).toEqual([{ path: "new.ts", isNew: true }]);
  });

  it("identifies modified files", () => {
    const diff = [
      "diff --git a/src/foo.ts b/src/foo.ts",
      "--- a/src/foo.ts",
      "+++ b/src/foo.ts",
    ].join("\n");
    const files = extractChangedFilesWithStatus(diff);
    expect(files).toEqual([{ path: "src/foo.ts", isNew: false }]);
  });

  it("handles mix of new and modified files", () => {
    const diff = [
      "diff --git a/src/foo.ts b/src/foo.ts",
      "--- a/src/foo.ts",
      "+++ b/src/foo.ts",
      "@@ -1,3 +1,4 @@",
      "diff --git a/src/new.ts b/src/new.ts",
      "--- /dev/null",
      "+++ b/src/new.ts",
    ].join("\n");
    const files = extractChangedFilesWithStatus(diff);
    expect(files).toEqual([
      { path: "src/foo.ts", isNew: false },
      { path: "src/new.ts", isNew: true },
    ]);
  });

  it("returns empty array for empty diff", () => {
    expect(extractChangedFilesWithStatus("")).toEqual([]);
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
      expect(signal.details[0].message).toContain("test files");
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

  describe("new file skipping (ChangedFile[])", () => {
    it("skips new files — they don't count as uncovered", () => {
      const changed: ChangedFile[] = [
        { path: "src/new-feature.ts", isNew: true },
        { path: "src/existing.ts", isNew: false },
      ];
      const repo = ["src/new-feature.ts", "src/existing.ts", "src/__tests__/existing.test.ts"];
      const signal = mapCoverage(changed, repo);
      // Only existing.ts counted → 1 covered / 1 source = 100%
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details.some(d => d.status === "skip" && d.label === "src/new-feature.ts")).toBe(true);
    });

    it("all new files → score 100 (nothing to check)", () => {
      const changed: ChangedFile[] = [
        { path: "src/a.ts", isNew: true },
        { path: "src/b.ts", isNew: true },
      ];
      const signal = mapCoverage(changed, ["src/a.ts", "src/b.ts"]);
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
    });

    it("backward compat: string[] still works", () => {
      const changed = ["src/foo.ts"];
      const repo = ["src/foo.ts", "src/__tests__/foo.test.ts"];
      const signal = mapCoverage(changed, repo);
      expect(signal.score).toBe(100);
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

    it("has weight 5", () => {
      expect(mapCoverage([], []).weight).toBe(5);
    });
  });

  describe("plan-coverage (classifiedItems)", () => {
    it("file referenced by test plan item text → plan-covered", () => {
      const changed = ["src/routes/targets.ts"];
      const repo = ["src/routes/targets.ts"]; // no test file
      const items = [makeItem("tp-0", "`src/routes/targets.ts` has PATCH route")];
      const signal = mapCoverage(changed, repo, items);
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].status).toBe("pass");
      expect(signal.details[0].message).toContain("Plan-covered");
    });

    it("file referenced by code block → plan-covered", () => {
      const changed = ["src/app.ts"];
      const repo = ["src/app.ts"];
      const items = [makeItem("tp-0", "app exports router", ["src/app.ts"])];
      const signal = mapCoverage(changed, repo, items);
      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("Plan-covered");
    });

    it("file NOT referenced by plan → still fails", () => {
      const changed = ["src/unmentioned.ts"];
      const repo = ["src/unmentioned.ts"];
      const items = [makeItem("tp-0", "something about targets.ts")];
      const signal = mapCoverage(changed, repo, items);
      expect(signal.score).toBe(0);
      expect(signal.passed).toBe(false);
    });

    it("mix of test-covered and plan-covered", () => {
      const changed = ["src/a.ts", "src/b.ts"];
      const repo = ["src/a.ts", "src/b.ts", "src/__tests__/a.test.ts"];
      const items = [makeItem("tp-0", "`src/b.ts` does something")];
      const signal = mapCoverage(changed, repo, items);
      expect(signal.score).toBe(100); // both covered
      expect(signal.passed).toBe(true);
    });

    it("filename match (not full path) → plan-covered", () => {
      const changed = ["packages/web/app/dashboard/page.tsx"];
      const repo = ["packages/web/app/dashboard/page.tsx"];
      const items = [makeItem("tp-0", "`page.tsx` shows dashboard")];
      const signal = mapCoverage(changed, repo, items);
      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("Plan-covered");
    });

    it("without classifiedItems → backward compat (no plan coverage)", () => {
      const changed = ["src/foo.ts"];
      const repo = ["src/foo.ts"];
      const signal = mapCoverage(changed, repo);
      expect(signal.score).toBe(0);
      expect(signal.details[0].message).toContain("No corresponding test");
    });

    it("empty classifiedItems → no plan coverage", () => {
      const changed = ["src/foo.ts"];
      const repo = ["src/foo.ts"];
      const signal = mapCoverage(changed, repo, []);
      expect(signal.score).toBe(0);
    });
  });

  describe("excludePaths", () => {
    it("excludes files matching prefix", () => {
      const changed = ["packages/landing/src/components/hero.tsx", "packages/core/src/foo.ts"];
      const repo = [...changed, "packages/core/src/__tests__/foo.test.ts"];
      const signal = mapCoverage(changed, repo, undefined, ["packages/landing/"]);
      expect(signal.score).toBe(100);
      expect(signal.details.some(d => d.status === "skip" && d.label.includes("hero.tsx"))).toBe(true);
    });

    it("all files excluded → score 100", () => {
      const changed = ["packages/landing/src/hero.tsx", "packages/landing/src/navbar.tsx"];
      const repo = [...changed];
      const signal = mapCoverage(changed, repo, undefined, ["packages/landing/"]);
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
    });

    it("multiple exclude prefixes", () => {
      const changed = ["packages/landing/src/hero.tsx", "packages/dashboard/src/App.tsx", "packages/core/src/foo.ts"];
      const repo = [...changed];
      const signal = mapCoverage(changed, repo, undefined, ["packages/landing/", "packages/dashboard/"]);
      // Only foo.ts counts, no test file → 0
      expect(signal.score).toBe(0);
      expect(signal.details.filter(d => d.status === "skip")).toHaveLength(2);
    });

    it("empty excludePaths has no effect", () => {
      const changed = ["src/foo.ts"];
      const repo = ["src/foo.ts"];
      const signal = mapCoverage(changed, repo, undefined, []);
      expect(signal.score).toBe(0);
    });

    it("undefined excludePaths has no effect", () => {
      const changed = ["src/foo.ts"];
      const repo = ["src/foo.ts"];
      const signal = mapCoverage(changed, repo, undefined, undefined);
      expect(signal.score).toBe(0);
    });
  });
});
