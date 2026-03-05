import type { ProbotOctokit } from "probot";
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
}

const MAX_TEXT_CHARS = 60_000;

/** Update the pending Check Run with final results and conclusion. */
export async function updateCheckRun(params: UpdateCheckRunParams): Promise<void> {
  const { octokit, owner, repo, checkRunId, conclusion, summary, items, pipelineError, correlationId } = params;
  const title = pipelineError && items.length === 0 ? pipelineError : buildCheckRunTitle(summary);
  const summaryMd = buildCheckRunSummary(summary, conclusion, pipelineError, correlationId);
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

/** Build the Check Run title string. */
export function buildCheckRunTitle(summary: ReportSummary): string {
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
export function buildCheckRunSummary(summary: ReportSummary, conclusion: CheckConclusion, pipelineError?: string, correlationId?: string): string {
  const lines: string[] = [
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
  ];

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
  if (text.length > MAX_TEXT_CHARS) {
    text = text.slice(0, MAX_TEXT_CHARS - 20) + "\n\n...(truncated)";
  }

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
