/**
 * Coverage mapper — checks which changed files have corresponding test files.
 *
 * Pure function: takes changed file paths + repo file listing, returns a Signal.
 * Supports multiple language conventions (TS/JS, Python, Go).
 */

import path from "node:path";
import type { Signal, SignalDetail } from "./types.js";
import { createSignal } from "./score-engine.js";

// ---------------------------------------------------------------------------
// File classification
// ---------------------------------------------------------------------------

/** Extensions and patterns that are NOT source code (excluded from analysis) */
const NON_SOURCE_PATTERNS = [
  /\.md$/i,
  /\.json$/i,
  /\.ya?ml$/i,
  /\.toml$/i,
  /\.lock$/i,
  /\.lockb$/i,
  /\.env/i,
  /\.gitignore$/,
  /\.eslintrc/,
  /\.prettierrc/,
  /tsconfig/i,
  /vitest\.config/i,
  /jest\.config/i,
  /^Dockerfile/i,
  /^docker-compose/i,
  /^\.github\//,
  /^\.gitlab-ci/,
  /^LICENSE/i,
  /^Makefile$/i,
  /^Cargo\.toml$/i,
  /^go\.mod$/i,
  /^go\.sum$/i,
];

/** Test file patterns (these ARE tests, not source needing coverage) */
const TEST_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\/__tests__\//,
  /\/test_[^/]+\.py$/,
  /\/tests?\//,
  /_test\.go$/,
];

/** Check if a file is a non-source file that should be excluded */
function isNonSource(filePath: string): boolean {
  return NON_SOURCE_PATTERNS.some((p) => p.test(filePath));
}

/** Check if a file is itself a test file */
function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERNS.some((p) => p.test(filePath));
}

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
    // __tests__/foo.test.ts (most common in TS/JS)
    candidates.push(path.join(dir, "__tests__", `${base}.test${ext}`));
    candidates.push(path.join(dir, "__tests__", `${base}.spec${ext}`));
    // Co-located: foo.test.ts
    candidates.push(path.join(dir, `${base}.test${ext}`));
    candidates.push(path.join(dir, `${base}.spec${ext}`));
    // Top-level test dirs
    candidates.push(`test/${base}.test${ext}`);
    candidates.push(`tests/${base}.test${ext}`);
    // Also try .ts variant if source is .tsx
    if (ext === ".tsx") {
      candidates.push(path.join(dir, "__tests__", `${base}.test.ts`));
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

// ---------------------------------------------------------------------------
// Signal builder
// ---------------------------------------------------------------------------

/**
 * Map changed files to test files and build a coverage Signal.
 *
 * @param changedFiles - File paths from the PR diff
 * @param repoFiles - All file paths in the repository (for checking existence)
 */
export function mapCoverage(changedFiles: string[], repoFiles: string[]): Signal {
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
  let coveredCount = 0;

  for (const file of changedFiles) {
    // Skip non-source files
    if (isNonSource(file)) continue;
    // Skip test files themselves (they don't need coverage)
    if (isTestFile(file)) continue;

    sourceCount++;
    const candidates = generateTestCandidates(file);
    const matchedTest = candidates.find((c) => repoFileSet.has(c));

    if (matchedTest) {
      coveredCount++;
      details.push({
        label: file,
        status: "pass",
        message: `Test file found: ${matchedTest}`,
      });
    } else {
      details.push({
        label: file,
        status: "fail",
        message: "No corresponding test file found",
      });
    }
  }

  if (sourceCount === 0) {
    return createSignal({
      id: "coverage-mapper",
      name: "Coverage Mapper",
      score: 100,
      passed: true,
      details: [{ label: "No source files", status: "pass", message: "Only non-source or test files changed" }],
    });
  }

  const score = Math.round((coveredCount / sourceCount) * 100);

  return createSignal({
    id: "coverage-mapper",
    name: "Coverage Mapper",
    score,
    passed: score >= 50,
    details,
  });
}
