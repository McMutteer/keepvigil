/**
 * CI Bridge signal — maps GitHub Actions check run results to test plan items.
 *
 * Highest-weight signal (30). Fetches check runs for the PR's head SHA,
 * fuzzy-matches them against classified test plan items, and builds a Signal
 * reporting which items CI already verified.
 *
 * Conservative matching: when unsure, reports "warn" not "pass".
 */

import type { ProbotOctokit } from "probot";
import type { ClassifiedItem, Signal, SignalDetail } from "@vigil/core";
import { createSignal, createLogger } from "@vigil/core";

const log = createLogger("ci-bridge");

export interface CIBridgeOptions {
  octokit: ProbotOctokit;
  owner: string;
  repo: string;
  headSha: string;
  classifiedItems: ClassifiedItem[];
}

interface CheckRun {
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string | null;
}

// ---------------------------------------------------------------------------
// Fuzzy matching
// ---------------------------------------------------------------------------

/** Stop words excluded from token matching */
const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "in", "on", "to", "for", "is", "it", "of", "run", "check", "verify", "that", "should", "returns"]);

/** Naive stem: strip common suffixes for better matching */
function stem(word: string): string {
  return word
    .replace(/(?:ing|ed|s)$/, "")
    .replace(/(?:ation|ment)$/, "");
}

/** Tokenize a string: lowercase, split on non-alphanumeric, filter stop words, stem */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
    .map((t) => stem(t) || t);
}

/** Extract matchable keywords from a classified item (text + code blocks) */
function extractItemKeywords(item: ClassifiedItem): string[] {
  const tokens = tokenize(item.item.text);
  for (const block of item.item.hints.codeBlocks) {
    tokens.push(...tokenize(block));
  }
  return [...new Set(tokens)];
}

/**
 * Try to match a test plan item against available check runs.
 * Returns the best matching check run or null.
 *
 * Matching rules (conservative — avoid false positives):
 * 1. Exact substring: check run name contains a code block command
 * 2. Token overlap: ≥2 shared tokens between item keywords and check run name
 */
function findMatchingCheckRun(
  item: ClassifiedItem,
  checkRuns: CheckRun[],
): CheckRun | null {
  const keywords = extractItemKeywords(item);
  if (keywords.length === 0) return null;

  // Try exact substring match first (strongest signal)
  // Check both directions: code block in check run name OR check run name in code block
  for (const block of item.item.hints.codeBlocks) {
    const normalized = block.toLowerCase().trim();
    if (normalized.length < 3) continue;
    for (const run of checkRuns) {
      const runName = run.name.toLowerCase();
      if (runName.includes(normalized) || normalized.includes(runName)) return run;
    }
  }

  // Token overlap match
  // For items with code blocks: ≥1 token overlap (code blocks are high-signal)
  // For items without code blocks: ≥2 token overlap (natural language is noisier)
  const hasCodeBlocks = item.item.hints.codeBlocks.length > 0;
  const minOverlap = hasCodeBlocks ? 1 : 2;

  let bestMatch: CheckRun | null = null;
  let bestOverlap = 0;

  for (const run of checkRuns) {
    const runTokens = new Set(tokenize(run.name));
    const overlap = keywords.filter((k) => runTokens.has(k)).length;
    if (overlap >= minOverlap && overlap > bestOverlap) {
      bestOverlap = overlap;
      bestMatch = run;
    }
  }

  return bestMatch;
}

// ---------------------------------------------------------------------------
// Check run state mapping
// ---------------------------------------------------------------------------

type DetailStatus = SignalDetail["status"];

function mapCheckRunStatus(run: CheckRun): DetailStatus {
  if (run.status === "in_progress" || run.status === "queued") return "warn";
  if (run.conclusion === "success") return "pass";
  if (run.conclusion === "failure") return "fail";
  if (run.conclusion === "skipped" || run.conclusion === "cancelled") return "skip";
  return "warn"; // neutral, timed_out, action_required, stale
}

function statusMessage(run: CheckRun, status: DetailStatus): string {
  if (status === "pass") return `Check run "${run.name}" passed`;
  if (status === "fail") return `Check run "${run.name}" failed${run.html_url ? ` — ${run.html_url}` : ""}`;
  if (status === "warn") return `Check run "${run.name}" is ${run.status === "in_progress" ? "still running" : run.conclusion ?? run.status}`;
  return `Check run "${run.name}" was ${run.conclusion ?? "skipped"}`;
}

// ---------------------------------------------------------------------------
// Signal collector
// ---------------------------------------------------------------------------

/**
 * Collect the CI Bridge signal for a PR.
 *
 * Fetches check runs from GitHub, matches them against test plan items,
 * and builds a Signal with per-item details.
 */
export async function collectCISignal(options: CIBridgeOptions): Promise<Signal> {
  const { octokit, owner, repo, headSha, classifiedItems } = options;

  if (classifiedItems.length === 0) {
    return createSignal({
      id: "ci-bridge",
      name: "CI Bridge",
      score: 100,
      passed: true,
      details: [{ label: "No items", status: "pass", message: "No test plan items to match against CI" }],
    });
  }

  // Fetch check runs for the head SHA
  let checkRuns: CheckRun[];
  try {
    const allRuns = await octokit.paginate(octokit.rest.checks.listForRef, {
      owner,
      repo,
      ref: headSha,
      per_page: 100,
    });
    // Filter out Vigil's own check run
    checkRuns = allRuns
      .filter((r) => !r.name.includes("Vigil"))
      .map((r) => ({
        name: r.name,
        status: r.status,
        conclusion: r.conclusion,
        html_url: r.html_url,
      }));
  } catch (err) {
    log.warn({ err, owner, repo, headSha }, "Could not fetch check runs");
    return createSignal({
      id: "ci-bridge",
      name: "CI Bridge",
      score: 50,
      passed: true,
      details: [{ label: "API error", status: "warn", message: "Could not fetch GitHub Actions check runs" }],
    });
  }

  if (checkRuns.length === 0) {
    return createSignal({
      id: "ci-bridge",
      name: "CI Bridge",
      score: 50,
      passed: true,
      details: [{ label: "No CI", status: "warn", message: "No GitHub Actions check runs found for this PR" }],
    });
  }

  // Match items to check runs
  const details: SignalDetail[] = [];
  let matchedCount = 0;
  let passedCount = 0;
  let failedCount = 0;

  for (const item of classifiedItems) {
    const match = findMatchingCheckRun(item, checkRuns);
    if (!match) {
      details.push({
        label: item.item.text.slice(0, 80),
        status: "skip",
        message: "No matching CI check run found",
      });
      continue;
    }

    matchedCount++;
    const status = mapCheckRunStatus(match);
    if (status === "pass") passedCount++;
    if (status === "fail") failedCount++;

    details.push({
      label: item.item.text.slice(0, 80),
      status,
      message: statusMessage(match, status),
    });
  }

  // Score calculation
  if (matchedCount === 0) {
    return createSignal({
      id: "ci-bridge",
      name: "CI Bridge",
      score: 50,
      passed: true,
      details,
    });
  }

  const score = Math.round((passedCount / matchedCount) * 100);
  const passed = failedCount === 0;

  log.info({ matchedCount, passedCount, failedCount, total: classifiedItems.length }, "CI Bridge matching complete");

  return createSignal({
    id: "ci-bridge",
    name: "CI Bridge",
    score,
    passed,
    details,
  });
}
