/**
 * Credential scanner — detects hardcoded secrets in PR diffs.
 *
 * Pure function: takes a unified diff string, returns a Signal.
 * Only scans added lines (starting with `+`, excluding `+++` headers).
 * Never logs or stores the actual secret — only pattern name + location.
 */

import type { Signal, SignalDetail } from "./types.js";
import { createSignal } from "./score-engine.js";

/** A secret detection pattern */
interface SecretPattern {
  name: string;
  regex: RegExp;
}

/** Patterns for common hardcoded secrets */
const SECRET_PATTERNS: SecretPattern[] = [
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "AWS Secret Key", regex: /(?:aws)?_?(?:secret)?_?(?:access)?_?key\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}(?![\w/+=])/i },
  { name: "GitHub Token", regex: /gh[ps]_[A-Za-z0-9]{36,}/ },
  { name: "GitLab Token", regex: /glpat-[A-Za-z0-9\-_]{20,}/ },
  { name: "Slack Token", regex: /xox[bpors]-[A-Za-z0-9-]+/ },
  { name: "Private Key", regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { name: "Generic API Key", regex: /(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9+/=_-]{20,}/i },
  { name: "Hardcoded Password", regex: /(?:password|passwd|pwd|secret)\s*[:=]\s*["'][^"']{8,}["']/i },
  { name: "JWT Token", regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/ },
  { name: "Connection String", regex: /(?:mongodb|postgres|mysql|redis):\/\/[^\s"']+:[^\s"']+@/ },
];

/** A single finding from the scanner */
interface Finding {
  pattern: string;
  file: string;
  line: number;
}

/**
 * Parse a unified diff and extract added lines with file context.
 * Returns tuples of [file, lineNumber, lineContent].
 */
function extractAddedLines(diff: string): Array<{ file: string; line: number; content: string }> {
  const lines = diff.split("\n");
  const result: Array<{ file: string; line: number; content: string }> = [];

  let currentFile = "unknown";
  let lineInFile = 0;

  for (const line of lines) {
    // Track current file from diff headers
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      continue;
    }
    if (line.startsWith("+++ ")) {
      currentFile = line.slice(4);
      continue;
    }

    // Track line numbers from hunk headers: @@ -old,count +new,count @@
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      lineInFile = Number(hunkMatch[1]);
      continue;
    }

    // Skip diff metadata lines
    if (line.startsWith("---") || line.startsWith("diff ") || line.startsWith("index ")) {
      continue;
    }

    // Added lines start with `+`
    if (line.startsWith("+")) {
      result.push({ file: currentFile, line: lineInFile, content: line.slice(1) });
      lineInFile++;
      continue;
    }

    // Context lines (no prefix) and removed lines (`-`) increment the line counter
    if (!line.startsWith("-")) {
      lineInFile++;
    }
  }

  return result;
}

/**
 * Redact a matched secret value for safe display.
 * Shows the pattern name and first/last few chars only.
 */
function redactMatch(content: string, regex: RegExp): string {
  const match = content.match(regex);
  if (!match) return "***";
  const val = match[0];
  if (val.length <= 8) return "***";
  return `${val.slice(0, 4)}...${val.slice(-4)}`;
}

/** Check if a file path is in a test/fixture directory */
function isTestPath(filePath: string): boolean {
  return /__tests__\/|\.test\.[jt]sx?$|\.spec\.[jt]sx?$|\/tests?\/|\/fixtures?\//i.test(filePath);
}

/** Check if a matched value looks like a generic test fixture (not a real secret) */
function isGenericTestValue(matchedText: string): boolean {
  const lower = matchedText.toLowerCase();
  return /(?:secret|password|passwd|pwd)\s*[:=]\s*["'](?:secret|test|fake|dummy|mock|example|changeme|placeholder|xxx|abc|sample)/i.test(lower);
}

/**
 * Scan a unified diff for hardcoded secrets.
 *
 * Returns a Signal with:
 * - score 100 + passed true if no secrets found
 * - score 0 + passed false if any secrets found
 * - details: one entry per finding with pattern name, file, line (redacted)
 */
export function scanCredentials(diff: string): Signal {
  if (!diff.trim()) {
    return createSignal({
      id: "credential-scan",
      name: "Credential Scan",
      score: 100,
      passed: true,
      details: [{ label: "No diff", status: "pass", message: "Empty diff — nothing to scan" }],
    });
  }

  const addedLines = extractAddedLines(diff);
  const findings: Finding[] = [];
  const details: SignalDetail[] = [];

  for (const { file, line, content } of addedLines) {
    const inTestFile = isTestPath(file);
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(content)) {
        // In test files, skip generic/fixture-like values for password/secret patterns
        if (inTestFile && pattern.name === "Hardcoded Password") {
          const match = content.match(pattern.regex);
          const value = match ? match[0] : "";
          if (isGenericTestValue(value)) continue;
        }

        const status = inTestFile ? "warn" : "fail";
        findings.push({ pattern: pattern.name, file, line });
        details.push({
          label: `${pattern.name} in ${file}:${line}`,
          status,
          message: inTestFile
            ? `Possible ${pattern.name} in test file (review recommended): ${redactMatch(content, pattern.regex)}`
            : `Possible ${pattern.name} detected: ${redactMatch(content, pattern.regex)}`,
          file,
          line,
        });
      }
    }
  }

  if (findings.length === 0) {
    return createSignal({
      id: "credential-scan",
      name: "Credential Scan",
      score: 100,
      passed: true,
      details: [{ label: "Clean", status: "pass", message: `Scanned ${addedLines.length} added lines — no secrets found` }],
    });
  }

  // Findings only in test files → score 70 (warning, not failure)
  // Findings in source files → score 0 (critical)
  const hasSourceFindings = findings.some((f) => !isTestPath(f.file));
  const score = hasSourceFindings ? 0 : 70;

  return createSignal({
    id: "credential-scan",
    name: "Credential Scan",
    score,
    passed: !hasSourceFindings,
    details,
  });
}
