import type { ProbotOctokit } from "probot";
import type { ConfidenceScore } from "@vigil/core";
import type { ReportItem, ReportSummary, CheckConclusion } from "./reporter.js";

export interface UpdateCheckRunParams {
  octokit: ProbotOctokit;
  owner: string;
  repo: string;
  checkRunId: number;
  conclusion: CheckConclusion;
  summary: ReportSummary;
  items: ReportItem[];
  pipelineError?: string;
  correlationId?: string;
  confidenceScore?: ConfidenceScore;
}

/** GitHub Check Run text field limit is 65,535 bytes. We target 60,000 bytes to stay well clear. */
const MAX_TEXT_BYTES = 60_000;
const TRUNCATION_SUFFIX = "\n\n...(truncated)";

/** Update the pending Check Run with final results and conclusion. */
export async function updateCheckRun(params: UpdateCheckRunParams): Promise<void> {
  const { octokit, owner, repo, checkRunId, conclusion, summary, items, pipelineError, correlationId, confidenceScore } = params;
  const title = pipelineError && items.length === 0 ? pipelineError : buildCheckRunTitle(summary, confidenceScore);
  const summaryMd = buildCheckRunSummary(summary, conclusion, pipelineError, correlationId, confidenceScore);
  const text = buildCheckRunText(items);

  await octokit.rest.checks.update({
    owner,
    repo,
    check_run_id: checkRunId,
    status: "completed",
    conclusion,
    completed_at: new Date().toISOString(),
    output: { title, summary: summaryMd, text },
  });
}

/** Determine the Check Run conclusion based on item verdicts. */
export function determineConclusion(items: ReportItem[]): CheckConclusion {
  const executed = items.filter(i => i.classified.confidence !== "SKIP");

  if (executed.length === 0) {
    return "neutral";
  }

  const blocking = executed.filter(
    i => i.classified.confidence === "DETERMINISTIC" || i.classified.confidence === "HIGH",
  );

  if (blocking.some(i => i.verdict === "failed" || i.verdict === "error")) {
    return "failure";
  }

  const nonBlocking = executed.filter(
    i => i.classified.confidence === "MEDIUM" || i.classified.confidence === "LOW",
  );

  if (nonBlocking.some(i => i.verdict === "failed" || i.verdict === "error")) {
    return "neutral";
  }

  return "success";
}

/** Map a ConfidenceScore recommendation to a CheckConclusion. */
export function conclusionFromScore(score: ConfidenceScore): CheckConclusion {
  if (score.recommendation === "safe") return "success";
  if (score.recommendation === "review") return "neutral";
  return "failure";
}

/** Build the Check Run title string. */
export function buildCheckRunTitle(summary: ReportSummary, confidenceScore?: ConfidenceScore): string {
  if (confidenceScore) {
    return `Confidence: ${confidenceScore.score}/100 — ${confidenceScore.recommendation}`;
  }

  const { passed, failed, needsReview, skipped, total } = summary;

  if (total === 0) return "No test plan items found";

  const verifiable = total - skipped;
  if (verifiable === 0) return "No verifiable items found";

  if (failed === 0 && needsReview === 0) {
    return `All ${verifiable} items verified successfully`;
  }

  const parts: string[] = [];
  if (passed > 0) parts.push(`${passed} passed`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (needsReview > 0) parts.push(`${needsReview} need review`);
  return parts.join(", ");
}

/** Build the Check Run summary markdown. */
export function buildCheckRunSummary(summary: ReportSummary, conclusion: CheckConclusion, pipelineError?: string, correlationId?: string, confidenceScore?: ConfidenceScore): string {
  const lines: string[] = [];

  if (confidenceScore) {
    lines.push(
      `## Vigil Confidence Score: ${confidenceScore.score}/100`,
      "",
      `**Recommendation:** ${confidenceScore.recommendation}`,
      "",
      "| Signal | Score | Weight | Passed |",
      "|--------|-------|--------|--------|",
    );
    for (const sig of confidenceScore.signals) {
      lines.push(`| ${sig.name} | ${sig.score}/100 | ${sig.weight} | ${sig.passed ? "Yes" : "No"} |`);
    }
    lines.push("");
  }

  lines.push(
    "## Vigil Test Plan Results",
    "",
    "| Metric | Count |",
    "|--------|-------|",
    `| Passed | ${summary.passed} |`,
    `| Failed | ${summary.failed} |`,
    `| Needs Review | ${summary.needsReview} |`,
    `| Skipped | ${summary.skipped} |`,
    `| **Total** | **${summary.total}** |`,
    "",
  );

  const explanations: Record<CheckConclusion, string> = {
    success: "All high-confidence items passed verification.",
    failure: "One or more high-confidence items failed.",
    neutral: summary.total - summary.skipped === 0
      ? "No verifiable items found — all items require human review."
      : "Non-blocking issues found. High-confidence items passed, but some lower-confidence items need review.",
  };

  lines.push(`**Conclusion:** \`${conclusion}\` — ${explanations[conclusion]}`);

  if (pipelineError) {
    lines.push("", `> **Note:** ${pipelineError}`);
  }

  if (correlationId) {
    lines.push("", `<sub>Run ID: ${correlationId}</sub>`);
  }

  return lines.join("\n");
}

/** Build the Check Run detailed text. */
export function buildCheckRunText(items: ReportItem[]): string {
  if (items.length === 0) return "No test plan items to report.";

  const parts: string[] = [
    "### Results by Item",
    "",
    "| # | Item | Confidence | Executor | Status | Duration |",
    "|---|------|------------|----------|--------|----------|",
  ];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const num = i + 1;
    const text = truncate(escapeTableCell(item.classified.item.text), 60);
    const confidence = item.classified.confidence;
    const executor = item.classified.executorType === "none" ? "--" : item.classified.executorType;
    const status = statusIcon(item);
    const duration = item.result ? formatDuration(item.result.duration) : "--";
    parts.push(`| ${num} | ${text} | ${confidence} | ${executor} | ${status} | ${duration} |`);
  }

  const failedItems = items.filter(
    i => i.verdict === "failed" || i.verdict === "error",
  );

  if (failedItems.length > 0) {
    parts.push("", "### Evidence", "");
    for (const item of failedItems) {
      const label = `${item.classified.item.id}: ${truncate(escapeHtml(item.classified.item.text), 60)}`;
      const evidence = item.result
        ? formatEvidenceText(item.result.evidence)
        : "No execution result available.";
      parts.push(
        `<details>`,
        `<summary>${label}</summary>`,
        "",
        evidence,
        "",
        `</details>`,
        "",
      );
    }
  }

  let text = parts.join("\n");
  text = truncateToBytes(text, MAX_TEXT_BYTES, TRUNCATION_SUFFIX);

  return text;
}

function statusIcon(item: ReportItem): string {
  switch (item.verdict) {
    case "passed": return ":white_check_mark: Passed";
    case "failed": {
      const conf = item.classified.confidence;
      if (conf === "MEDIUM" || conf === "LOW") return ":warning: Needs Review";
      return ":x: Failed";
    }
    case "error": return ":x: Error";
    case "skipped": return ":construction: Human";
  }
}

function formatEvidenceText(evidence: Record<string, unknown>): string {
  const json = JSON.stringify(evidence, null, 2);
  return "```json\n" + truncate(json, 3000) + "\n```";
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function escapeTableCell(str: string): string {
  return str.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}

/**
 * Truncate a string so that its UTF-8 byte length stays within `maxBytes`.
 * Uses Buffer to count bytes correctly — handles multi-byte chars (emoji, CJK, etc).
 * The suffix (e.g., "\n\n...(truncated)") is appended when truncation occurs.
 */
export function truncateToBytes(str: string, maxBytes: number, suffix: string = ""): string {
  const suffixBytes = Buffer.byteLength(suffix, "utf8");
  const buf = Buffer.from(str, "utf8");
  if (buf.byteLength <= maxBytes) return str;

  const limit = maxBytes - suffixBytes;
  if (limit <= 0) {
    // Suffix alone exceeds maxBytes — return a safe slice of the suffix itself
    const safeSuffix = Buffer.from(suffix, "utf8").slice(0, maxBytes).toString("utf8").replace(/\uFFFD$/, "");
    return safeSuffix;
  }

  // Slice to byte limit, then decode — may produce a trailing replacement char if cut mid-codepoint
  let truncated = buf.slice(0, limit).toString("utf8");
  // Remove any trailing replacement character (U+FFFD) from a split codepoint
  truncated = truncated.replace(/\uFFFD$/, "");
  return truncated + suffix;
}
