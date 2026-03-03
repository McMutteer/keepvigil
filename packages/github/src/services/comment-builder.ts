import type { ReportItem, ReportSummary } from "./reporter.js";

const COMMENT_MARKER = "<!-- vigil-results -->";
const MAX_EVIDENCE_BLOCK_CHARS = 2000;
const MAX_COMMENT_CHARS = 60_000;

/** Build the full PR comment markdown body. Pure function — no I/O. */
export function buildCommentBody(items: ReportItem[], summary: ReportSummary): string {
  const parts: string[] = [
    COMMENT_MARKER,
    "## Vigil Test Plan Results",
    "",
    buildSummaryLine(summary),
    "",
    buildResultsTable(items),
  ];

  const evidenceBlocks = items
    .filter(i => i.verdict === "failed" || i.verdict === "error" || isNeedsReview(i))
    .map(i => buildEvidenceBlock(i))
    .filter(Boolean);

  if (evidenceBlocks.length > 0) {
    parts.push("", ...evidenceBlocks);
  }

  parts.push("", "---", `<sub>Vigil v0.1.0 | keepvigil.dev</sub>`);

  let body = parts.join("\n");

  if (body.length > MAX_COMMENT_CHARS) {
    body = body.slice(0, MAX_COMMENT_CHARS - 20) + "\n\n...(truncated)";
  }

  return body;
}

/** Build the summary counts line. */
export function buildSummaryLine(summary: ReportSummary): string {
  const parts: string[] = [];
  if (summary.passed > 0) parts.push(`**${summary.passed}** passed`);
  if (summary.failed > 0) parts.push(`**${summary.failed}** failed`);
  if (summary.needsReview > 0) parts.push(`**${summary.needsReview}** need review`);
  if (summary.skipped > 0) parts.push(`**${summary.skipped}** skipped`);

  if (parts.length === 0) return "No test plan items found.";
  return parts.join(" | ");
}

/** Build the results table rows. */
export function buildResultsTable(items: ReportItem[]): string {
  const header = "| # | Item | Confidence | Status |\n|---|------|------------|--------|";
  const rows = items.map((item, index) => {
    const num = index + 1;
    const text = truncate(escapeTableCell(item.classified.item.text), 80);
    const confidence = item.classified.confidence;
    const status = verdictToStatus(item);
    return `| ${num} | ${text} | ${confidence} | ${status} |`;
  });

  return [header, ...rows].join("\n");
}

/** Build a single item's evidence section as a <details> block. */
export function buildEvidenceBlock(item: ReportItem): string {
  if (item.verdict === "passed" || item.verdict === "skipped") return "";

  const icon = item.verdict === "failed" || item.verdict === "error" ? "x" : "warning";
  const label = `${item.classified.item.id}: ${truncate(escapeHtml(item.classified.item.text), 60)}`;
  const meta = [
    `**Executor:** ${item.classified.executorType}`,
    `**Confidence:** ${item.classified.confidence}`,
    item.result ? `**Duration:** ${formatDuration(item.result.duration)}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const evidence = item.result ? formatEvidence(item) : "No execution result available.";

  let block = `<details>\n<summary>:${icon}: ${label}</summary>\n\n${meta}\n\n${evidence}\n\n</details>`;

  const truncSuffix = "\n\n...(truncated)\n\n</details>";
  if (block.length > MAX_EVIDENCE_BLOCK_CHARS) {
    block = block.slice(0, MAX_EVIDENCE_BLOCK_CHARS - truncSuffix.length) + truncSuffix;
  }

  return block;
}

/** Format evidence from a specific executor type. */
export function formatEvidence(item: ReportItem): string {
  if (!item.result) return "";
  const ev = item.result.evidence;
  const executor = item.classified.executorType;

  switch (executor) {
    case "shell":
      return formatShellEvidence(ev);
    case "api":
      return formatApiEvidence(ev);
    case "browser":
      return formatBrowserEvidence(ev);
    default:
      return formatGenericEvidence(ev);
  }
}

function formatShellEvidence(ev: Record<string, unknown>): string {
  const parts: string[] = [];
  const commands = ev.commands as string[] | undefined;
  if (commands?.length) {
    parts.push(`**Commands:** \`${commands.join("; ")}\``);
  }
  const exitCode = ev.exitCode as number | undefined;
  if (exitCode !== undefined) {
    parts.push(`**Exit code:** ${exitCode}`);
  }
  const stdout = ev.stdout as string | undefined;
  if (stdout) {
    parts.push("```\n" + truncate(stdout, 500) + "\n```");
  }
  const stderr = ev.stderr as string | undefined;
  if (stderr) {
    parts.push("**stderr:**\n```\n" + truncate(stderr, 500) + "\n```");
  }
  const reason = ev.reason as string | undefined;
  if (reason) {
    parts.push(`**Reason:** ${reason}`);
  }
  return parts.join("\n\n") || "No evidence captured.";
}

function formatApiEvidence(ev: Record<string, unknown>): string {
  const requests = ev.requests as Array<Record<string, unknown>> | undefined;
  if (!requests?.length) {
    const error = ev.error as string | undefined;
    return error ? `**Error:** ${error}` : "No evidence captured.";
  }

  return requests
    .map((req) => {
      const spec = req.spec as Record<string, unknown> | undefined;
      const method = spec?.method ?? "?";
      const path = spec?.path ?? "?";
      const status = req.status ?? "?";
      const passed = req.passed as boolean | undefined;
      const failReason = req.failReason as string | undefined;
      const body = req.body;

      const parts: string[] = [`\`${method} ${path}\` → **${status}**`];
      if (failReason) parts.push(`Reason: ${failReason}`);
      if (!passed && body !== undefined) {
        const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
        parts.push("```\n" + truncate(bodyStr, 500) + "\n```");
      }
      return parts.join("\n");
    })
    .join("\n\n");
}

function formatBrowserEvidence(ev: Record<string, unknown>): string {
  const parts: string[] = [];

  const actions = ev.actions as Array<Record<string, unknown>> | undefined;
  if (actions?.length) {
    for (const action of actions) {
      const desc = action.description ?? action.spec ?? "action";
      const passed = action.passed as boolean | undefined;
      const failReason = action.failReason as string | undefined;
      const icon = passed ? "pass" : "fail";
      parts.push(`- [${icon}] ${typeof desc === "string" ? desc : JSON.stringify(desc)}${failReason ? ` — ${failReason}` : ""}`);
    }
  }

  const consoleErrors = ev.consoleErrors as string[] | undefined;
  if (consoleErrors?.length) {
    parts.push(`\n**Console errors:** ${consoleErrors.length}\n\`\`\`\n${truncate(consoleErrors.join("\n"), 300)}\n\`\`\``);
  }

  if (ev.ogTags || ev.jsonLd) {
    parts.push(formatMetadataEvidence(ev));
  }

  return parts.join("\n") || "Evidence captured for human review.";
}

function formatMetadataEvidence(ev: Record<string, unknown>): string {
  const parts: string[] = [];
  const missingOgTags = ev.missingOgTags as string[] | undefined;
  if (missingOgTags?.length) {
    parts.push(`**Missing OG tags:** ${missingOgTags.join(", ")}`);
  }
  const jsonLdValid = ev.jsonLdValid as boolean | undefined;
  if (jsonLdValid === false) {
    const errors = ev.jsonLdErrors as string[] | undefined;
    parts.push(`**JSON-LD invalid:** ${errors?.join(", ") ?? "unknown error"}`);
  }
  return parts.join("\n\n") || "Metadata check completed.";
}

function formatGenericEvidence(ev: Record<string, unknown>): string {
  const json = JSON.stringify(ev, null, 2);
  return "```json\n" + truncate(json, 1000) + "\n```";
}

function isNeedsReview(item: ReportItem): boolean {
  const conf = item.classified.confidence;
  return (
    (item.verdict === "failed" || item.verdict === "error") &&
    (conf === "MEDIUM" || conf === "LOW")
  );
}

function verdictToStatus(item: ReportItem): string {
  if (item.verdict === "skipped") return ":construction: Human";
  if (item.verdict === "passed") return ":white_check_mark: Passed";
  if (isNeedsReview(item)) return ":warning: Needs Review";
  if (item.verdict === "error") return ":x: Error";
  return ":x: Failed";
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

export { COMMENT_MARKER };
