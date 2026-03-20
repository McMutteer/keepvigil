/**
 * Risk scorer — deterministic signal that evaluates PR risk based on file patterns and diff content.
 *
 * Pure function: takes a unified diff string, changed files, and repo files. Returns a Signal.
 * No LLM required — entirely pattern-based analysis.
 *
 * Risk factors:
 * - HIGH (-20): auth files, DB schema/migrations, credential patterns in config
 * - MEDIUM (-10): new dependencies, env vars, cross-boundary changes, blast radius (>20 files)
 * - LOW (-5): no test coverage for changed source files
 */

import type { Signal, SignalDetail } from "./types.js";
import { createSignal } from "./score-engine.js";
import { extractChangedFilesWithStatus, type ChangedFile } from "./coverage-mapper.js";

// ---------------------------------------------------------------------------
// Risk factor types
// ---------------------------------------------------------------------------

export type RiskLevel = "high" | "medium" | "low";

export interface RiskFactor {
  level: RiskLevel;
  label: string;
  message: string;
  files?: string[];
}

// ---------------------------------------------------------------------------
// File classification patterns
// ---------------------------------------------------------------------------

const AUTH_PATTERNS = [
  /\bauth\b/i,
  /\bsession\b/i,
  /\blogin\b/i,
  /\bpassword\b/i,
  /\bpermission/i,
  /\baccess[_-]?control/i,
  /\bjwt\b/i,
  /\boauth\b/i,
  /\brbac\b/i,
  /\bmiddleware\/auth/i,
];

const SCHEMA_PATTERNS = [
  /\bmigration/i,
  /\bschema\b/i,
  /\.sql$/i,
  /drizzle\//,
  /prisma\//,
  /\balembic\b/i,
  /\bknex.*migrate/i,
];

const INFRA_PATTERNS = [
  /Dockerfile/i,
  /docker-compose/i,
  /\.github\/workflows\//,
  /\.gitlab-ci/,
  /\bterraform\b/i,
  /\bk8s\b/i,
  /\bkubernetes\b/i,
  /\bhelm\b/i,
];

const TEST_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\/__tests__\//,
  /\/test_[^/]+\.py$/,
  /\/tests?\//,
  /_test\.go$/,
];

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
  /^LICENSE/i,
  /^Makefile$/i,
];

// ---------------------------------------------------------------------------
// Diff content patterns (scanned on added lines only)
// ---------------------------------------------------------------------------

const ENV_VAR_PATTERN = /process\.env\.[A-Z_]{3,}|import\.meta\.env\.[A-Z_]{3,}|os\.environ\[/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyFile(filePath: string): string[] {
  const categories: string[] = [];

  if (AUTH_PATTERNS.some((p) => p.test(filePath))) categories.push("authentication");
  if (SCHEMA_PATTERNS.some((p) => p.test(filePath))) categories.push("database");
  if (INFRA_PATTERNS.some((p) => p.test(filePath))) categories.push("infrastructure");

  // API route detection
  if (/\broute[rs]?\b/i.test(filePath) || /\bapi\b/i.test(filePath) || /\bendpoint/i.test(filePath)) {
    categories.push("api");
  }

  // Frontend detection
  if (/\.(tsx|jsx|vue|svelte)$/.test(filePath) || /\bcomponent/i.test(filePath) || /\bpage/i.test(filePath)) {
    categories.push("frontend");
  }

  return categories;
}

function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERNS.some((p) => p.test(filePath));
}

function isNonSource(filePath: string): boolean {
  return NON_SOURCE_PATTERNS.some((p) => p.test(filePath));
}

/**
 * Extract added lines from a unified diff (only lines starting with `+`).
 * Tracks current file context for attribution.
 */
function extractAddedLines(diff: string): Array<{ file: string; content: string }> {
  const lines = diff.split("\n");
  const result: Array<{ file: string; content: string }> = [];
  let currentFile = "unknown";

  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      continue;
    }
    if (line.startsWith("+++ ")) {
      currentFile = line.slice(4);
      continue;
    }
    if (line.startsWith("---") || line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("@@")) {
      continue;
    }
    if (line.startsWith("+")) {
      result.push({ file: currentFile, content: line.slice(1) });
    }
  }

  return result;
}

/**
 * Check if a package file (package.json, requirements.txt, etc.) has new dependencies.
 */
function detectNewDependencies(diff: string): string[] {
  const deps: string[] = [];
  const lines = diff.split("\n");
  let currentFile = "unknown";
  let inDepsSection = false;
  let braceDepth = 0;

  for (const line of lines) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      inDepsSection = false;
      braceDepth = 0;
      continue;
    }

    // Only check package.json files
    if (!currentFile.endsWith("package.json")) continue;

    // Strip the leading +/- for content analysis
    const content = line.startsWith("+") || line.startsWith("-") ? line.slice(1) : line;

    // Track if we're in a dependencies section
    if (!inDepsSection && /"(?:dependencies|devDependencies|peerDependencies)"/.test(line)) {
      inDepsSection = true;
      braceDepth = 0;
      // Count opening brace on the same line (e.g., "dependencies": {)
      if (content.includes("{")) braceDepth++;
      continue;
    }

    if (inDepsSection) {
      // Track brace depth to handle nested objects correctly
      for (const ch of content) {
        if (ch === "{") braceDepth++;
        else if (ch === "}") braceDepth--;
      }

      // Detect new dependency additions
      if (line.startsWith("+") && !line.startsWith("+++")) {
        const match = line.match(/^\+\s*"([^"]+)"\s*:\s*"/);
        if (match) {
          deps.push(match[1]);
        }
      }

      // End of section when all braces are closed
      if (braceDepth <= 0) {
        inDepsSection = false;
        braceDepth = 0;
      }
    }
  }

  return deps;
}

// ---------------------------------------------------------------------------
// Main signal function
// ---------------------------------------------------------------------------

/**
 * Assess the risk level of a PR based on file patterns and diff content.
 *
 * Returns a Signal with:
 * - score 100 = no risk factors found
 * - HIGH factors deduct 20 points each
 * - MEDIUM factors deduct 10 points each
 * - LOW factors deduct 5 points each
 * - passed = score >= 40
 */
export function assessRisk(
  diff: string,
  changedFiles?: ChangedFile[],
  repoFiles?: string[],
): Signal {
  if (!diff.trim()) {
    return createSignal({
      id: "risk-score",
      name: "Risk Assessment",
      score: 100,
      passed: true,
      details: [{ label: "No diff", status: "pass", message: "Empty diff — nothing to assess" }],
    });
  }

  const files = changedFiles ?? extractChangedFilesWithStatus(diff);
  const factors: RiskFactor[] = [];
  const details: SignalDetail[] = [];

  // --- HIGH risk factors ---

  // Auth files
  const authFiles = files.filter((f) => classifyFile(f.path).includes("authentication") && !isTestFile(f.path));
  if (authFiles.length > 0) {
    factors.push({
      level: "high",
      label: "Touches authentication",
      message: `Modifies auth-related files: ${authFiles.map((f) => f.path).join(", ")}`,
      files: authFiles.map((f) => f.path),
    });
  }

  // DB schema/migrations
  const schemaFiles = files.filter((f) => classifyFile(f.path).includes("database") && !isTestFile(f.path));
  if (schemaFiles.length > 0) {
    factors.push({
      level: "high",
      label: "Database schema changes",
      message: `Modifies schema/migration files: ${schemaFiles.map((f) => f.path).join(", ")}`,
      files: schemaFiles.map((f) => f.path),
    });
  }

  // Credential patterns in config files (not secrets — that's credential-scanner's job)
  const addedLines = extractAddedLines(diff);
  const configCredFiles = new Set<string>();
  for (const { file, content } of addedLines) {
    if (/\.(env|ya?ml|json|toml|conf)$/i.test(file) && !isTestFile(file)) {
      if (/(?:password|secret|token|api[_-]?key)\s*[:=]/i.test(content) && !/example|placeholder|changeme/i.test(content)) {
        configCredFiles.add(file);
      }
    }
  }
  if (configCredFiles.size > 0) {
    factors.push({
      level: "high",
      label: "Credential patterns in config",
      message: `Config files with credential-like values: ${[...configCredFiles].join(", ")}`,
      files: [...configCredFiles],
    });
  }

  // --- MEDIUM risk factors ---

  // New dependencies
  const newDeps = detectNewDependencies(diff);
  if (newDeps.length > 0) {
    factors.push({
      level: "medium",
      label: "New dependencies",
      message: `Added ${newDeps.length} new package${newDeps.length > 1 ? "s" : ""}: ${newDeps.slice(0, 5).join(", ")}${newDeps.length > 5 ? "..." : ""}`,
    });
  }

  // Environment variables
  const envVarFiles = new Set<string>();
  for (const { file, content } of addedLines) {
    if (ENV_VAR_PATTERN.test(content) && !isTestFile(file)) {
      envVarFiles.add(file);
    }
  }
  if (envVarFiles.size > 0) {
    factors.push({
      level: "medium",
      label: "New environment variables",
      message: `References new env vars in: ${[...envVarFiles].slice(0, 5).join(", ")}`,
      files: [...envVarFiles],
    });
  }

  // Cross-boundary changes (API + frontend in same PR)
  const allCategories = new Set<string>();
  for (const f of files) {
    for (const cat of classifyFile(f.path)) {
      allCategories.add(cat);
    }
  }
  const hasApi = allCategories.has("api");
  const hasFrontend = allCategories.has("frontend");
  if (hasApi && hasFrontend) {
    factors.push({
      level: "medium",
      label: "Cross-boundary changes",
      message: "PR touches both API and frontend — verify contract compatibility",
    });
  }

  // Blast radius (>20 files)
  const sourceFiles = files.filter((f) => !isTestFile(f.path) && !isNonSource(f.path));
  if (sourceFiles.length > 20) {
    factors.push({
      level: "medium",
      label: "High blast radius",
      message: `${sourceFiles.length} source files changed — large scope increases merge risk`,
    });
  }

  // Infrastructure changes
  const infraFiles = files.filter((f) => classifyFile(f.path).includes("infrastructure"));
  if (infraFiles.length > 0) {
    factors.push({
      level: "medium",
      label: "Infrastructure changes",
      message: `Modifies deployment/CI files: ${infraFiles.map((f) => f.path).join(", ")}`,
      files: infraFiles.map((f) => f.path),
    });
  }

  // --- LOW risk factors ---

  // No test coverage for changed source files
  if (repoFiles) {
    const repoFileSet = new Set(repoFiles);
    const untestedFiles: string[] = [];

    for (const f of sourceFiles) {
      // Simple check: does a test file exist for this source file?
      const base = f.path.replace(/\.[^.]+$/, "");
      const ext = f.path.match(/\.[^.]+$/)?.[0] ?? ".ts";
      const hasTest =
        repoFileSet.has(`${base}.test${ext}`) ||
        repoFileSet.has(`${base}.spec${ext}`) ||
        repoFileSet.has(f.path.replace(/\/([^/]+)$/, "/__tests__/$1").replace(/(\.[^.]+)$/, `.test$1`));

      if (!hasTest) {
        untestedFiles.push(f.path);
      }
    }

    if (untestedFiles.length > 0) {
      factors.push({
        level: "low",
        label: "Untested source files",
        message: `${untestedFiles.length} changed source file${untestedFiles.length > 1 ? "s" : ""} lack test coverage`,
        files: untestedFiles.slice(0, 10),
      });
    }
  }

  // --- Build signal ---

  if (factors.length === 0) {
    return createSignal({
      id: "risk-score",
      name: "Risk Assessment",
      score: 100,
      passed: true,
      details: [{ label: "Low risk", status: "pass", message: "No risk factors detected" }],
    });
  }

  // Compute score: start at 100, deduct per factor
  const DEDUCTIONS: Record<RiskLevel, number> = { high: 20, medium: 10, low: 5 };
  let score = 100;
  for (const factor of factors) {
    score -= DEDUCTIONS[factor.level];
  }
  score = Math.max(0, score);

  // Build details from factors
  const LEVEL_EMOJI: Record<RiskLevel, string> = { high: "\uD83D\uDD34", medium: "\uD83D\uDFE1", low: "\uD83D\uDFE2" };
  const LEVEL_STATUS: Record<RiskLevel, "fail" | "warn" | "pass"> = { high: "fail", medium: "warn", low: "pass" };

  for (const factor of factors) {
    details.push({
      label: `${LEVEL_EMOJI[factor.level]} ${factor.level.toUpperCase()}: ${factor.label}`,
      status: LEVEL_STATUS[factor.level],
      message: factor.message,
      file: factor.files?.[0],
    });
  }

  // Determine overall risk level for the summary
  const hasHigh = factors.some((f) => f.level === "high");
  const hasMedium = factors.some((f) => f.level === "medium");
  const overallLevel = hasHigh ? "HIGH" : hasMedium ? "MEDIUM" : "LOW";

  details.push({
    label: `Risk Level: ${overallLevel}`,
    status: hasHigh ? "fail" : hasMedium ? "warn" : "pass",
    message: `${factors.length} risk factor${factors.length > 1 ? "s" : ""} detected (score: ${score}/100)`,
  });

  return createSignal({
    id: "risk-score",
    name: "Risk Assessment",
    score,
    passed: score >= 40,
    details,
  });
}

