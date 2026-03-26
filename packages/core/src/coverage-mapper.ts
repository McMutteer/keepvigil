/**
 * Coverage mapper — checks which changed files have corresponding test files.
 *
 * Pure function: takes changed file paths + repo file listing, returns a Signal.
 * Supports multiple language conventions (TS/JS, Python, Go).
 */

import path from "node:path";
import type { ClassifiedItem, Signal, SignalDetail } from "./types.js";
import { createSignal } from "./score-engine.js";
import { isNonSource, isTestFile, isPresentationFile } from "./file-patterns.js";

// ---------------------------------------------------------------------------
// Test file resolution
// ---------------------------------------------------------------------------

/**
 * Generate possible test file paths for a given source file.
 * Returns candidates in order of likelihood.
 */
function generateTestCandidates(filePath: string): string[] {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const candidates: string[] = [];

  // TypeScript / JavaScript
  if (/\.[jt]sx?$/.test(ext)) {
    // __tests__/foo.test.ts in same directory (most common in TS/JS)
    candidates.push(path.join(dir, "__tests__", `${base}.test${ext}`));
    candidates.push(path.join(dir, "__tests__", `${base}.spec${ext}`));
    // Co-located: foo.test.ts
    candidates.push(path.join(dir, `${base}.test${ext}`));
    candidates.push(path.join(dir, `${base}.spec${ext}`));
    // Walk up to find __tests__/ at parent/package level
    // e.g., packages/github/src/services/foo.ts → packages/github/src/__tests__/foo.test.ts
    let current = dir;
    let parent = path.dirname(current);
    while (parent && parent !== current && parent !== ".") {
      candidates.push(path.join(parent, "__tests__", `${base}.test${ext}`));
      candidates.push(path.join(parent, "__tests__", `${base}.spec${ext}`));
      current = parent;
      parent = path.dirname(current);
    }
    // Top-level test dirs
    candidates.push(`test/${base}.test${ext}`);
    candidates.push(`tests/${base}.test${ext}`);
    candidates.push(`__tests__/${base}.test${ext}`);
    // Also try .ts variant if source is .tsx
    if (ext === ".tsx") {
      candidates.push(path.join(path.dirname(filePath), "__tests__", `${base}.test.ts`));
    }
  }

  // Python
  if (ext === ".py") {
    // tests/test_foo.py
    candidates.push(`tests/test_${base}.py`);
    candidates.push(`test/test_${base}.py`);
    // Same dir: test_foo.py
    candidates.push(path.join(dir, `test_${base}.py`));
    // Nested: tests/routers/test_foo.py (mirror structure)
    candidates.push(path.join("tests", dir, `test_${base}.py`));
  }

  // Go
  if (ext === ".go" && !filePath.endsWith("_test.go")) {
    candidates.push(path.join(dir, `${base}_test.go`));
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Diff parsing
// ---------------------------------------------------------------------------

/**
 * Extract changed file paths from a unified diff.
 * Parses `+++ b/path` headers.
 */
export function extractChangedFiles(diff: string): string[] {
  const files: string[] = [];
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) {
      files.push(line.slice(6));
    }
  }
  return files;
}

/** A changed file with its modification status. */
export interface ChangedFile {
  path: string;
  isNew: boolean;
}

/**
 * Extract changed file paths with their status (new vs modified) from a unified diff.
 * A file is "new" when its `---` line is `/dev/null`.
 */
export function extractChangedFilesWithStatus(diff: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  const lines = diff.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("+++ b/")) {
      const filePath = lines[i].slice(6);
      const prevLine = i > 0 ? lines[i - 1] : "";
      const isNew = prevLine === "--- /dev/null";
      files.push({ path: filePath, isNew });
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Signal builder
// ---------------------------------------------------------------------------

/**
 * Check if a test plan item references a specific file path.
 * Matches against code blocks and text content.
 */
function testPlanReferencesFile(items: ClassifiedItem[], filePath: string): string | null {
  const fileName = path.basename(filePath);
  const fileNameNoExt = path.basename(filePath, path.extname(filePath));

  for (const ci of items) {
    // Check code blocks for exact path or filename
    for (const block of ci.item.hints.codeBlocks) {
      if (block.includes(filePath) || block.includes(fileName)) {
        return ci.item.text.slice(0, 60);
      }
    }
    // Check item text for file references
    const text = ci.item.text;
    if (text.includes(filePath) || text.includes(fileName)) {
      return text.slice(0, 60);
    }
    // Fuzzy: check for the base name (without extension) in backtick-delimited text
    const backtickRefs = text.match(/`([^`]+)`/g);
    if (backtickRefs) {
      for (const ref of backtickRefs) {
        const inner = ref.slice(1, -1);
        if (inner.includes(filePath) || inner.includes(fileName) || inner === fileNameNoExt) {
          return text.slice(0, 60);
        }
      }
    }
  }
  return null;
}

/**
 * Map changed files to test files and build a coverage Signal.
 *
 * Accepts either `string[]` (backward compat) or `ChangedFile[]`.
 * When `ChangedFile[]` is passed, new files are skipped — they're
 * expected to not have tests yet.
 *
 * When `classifiedItems` is provided, files without test files but
 * referenced by the test plan are counted as "plan-covered" — this
 * prevents projects without test suites from being penalized to 0.
 *
 * @param changedFiles - File paths from the PR diff
 * @param repoFiles - All file paths in the repository (for checking existence)
 * @param classifiedItems - Optional test plan items for plan-coverage analysis
 */
export function mapCoverage(
  changedFiles: (string | ChangedFile)[],
  repoFiles: string[],
  classifiedItems?: ClassifiedItem[],
  excludePaths?: string[],
): Signal {
  if (changedFiles.length === 0) {
    return createSignal({
      id: "coverage-mapper",
      name: "Coverage Mapper",
      score: 100,
      passed: true,
      details: [{ label: "No files", status: "pass", message: "No changed files to analyze" }],
    });
  }

  const repoFileSet = new Set(repoFiles);
  const details: SignalDetail[] = [];
  let sourceCount = 0;
  let testCoveredCount = 0;
  let planCoveredCount = 0;

  for (const entry of changedFiles) {
    const file = typeof entry === "string" ? entry : entry.path;
    const isNew = typeof entry === "object" && entry.isNew;

    // Skip non-source files
    if (isNonSource(file)) continue;
    // Skip test files themselves (they don't need coverage)
    if (isTestFile(file)) continue;
    // Skip files matching user-configured exclude paths
    if (excludePaths && excludePaths.some((prefix) => file.startsWith(prefix))) {
      details.push({
        label: file,
        status: "skip",
        message: "Excluded via .vigil.yml coverage.exclude",
      });
      continue;
    }

    // New files are expected to not have tests yet — skip with an informational detail
    if (isNew) {
      details.push({
        label: file,
        status: "skip",
        message: "New file — test coverage not expected",
      });
      continue;
    }

    // Presentation-only files (pages, layouts, i18n) — skip without penalty
    if (isPresentationFile(file)) {
      details.push({
        label: file,
        status: "skip",
        message: "Presentation file — test coverage optional",
      });
      continue;
    }

    sourceCount++;
    const candidates = generateTestCandidates(file);
    const matchedTest = candidates.find((c) => repoFileSet.has(c));

    if (matchedTest) {
      testCoveredCount++;
      details.push({
        label: file,
        status: "pass",
        message: `Test file found: ${matchedTest}`,
      });
    } else if (classifiedItems && classifiedItems.length > 0) {
      // No test file — check if the test plan references this file
      const planRef = testPlanReferencesFile(classifiedItems, file);
      if (planRef) {
        planCoveredCount++;
        details.push({
          label: file,
          status: "pass",
          message: `Plan-covered: "${planRef}..."`,
        });
      } else {
        details.push({
          label: file,
          status: "fail",
          message: "No test file or test plan reference found",
          file,
        });
      }
    } else {
      details.push({
        label: file,
        status: "fail",
        message: "No corresponding test file found",
        file,
      });
    }
  }

  if (sourceCount === 0) {
    return createSignal({
      id: "coverage-mapper",
      name: "Coverage Mapper",
      score: 100,
      passed: true,
      details: details.length > 0
        ? details
        : [{ label: "No source files", status: "pass", message: "Only non-source or test files changed" }],
    });
  }

  const coveredCount = testCoveredCount + planCoveredCount;
  const score = Math.round((coveredCount / sourceCount) * 100);

  return createSignal({
    id: "coverage-mapper",
    name: "Coverage Mapper",
    score,
    passed: score >= 50,
    details,
  });
}
