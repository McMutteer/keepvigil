import type { VigilConfig } from "@vigil/core";
import type { ReportItem, ReportSummary } from "./reporter.js";
import { truncateToBytes } from "./check-run-updater.js";

const COMMENT_MARKER = "<!-- vigil-results -->";
/** GitHub PR comment body limit is ~262,144 bytes. We target 60,000 bytes to stay safe. */
const MAX_COMMENT_BYTES = 60_000;
const MAX_EVIDENCE_BLOCK_BYTES = 2000;
const TRUNCATION_SUFFIX = "\n\n...(truncated)";

/** Build the full PR comment markdown body. Pure function — no I/O. */
export function buildCommentBody(items: ReportItem[], summary: ReportSummary, pipelineError?: string, correlationId?: string, vigiConfig?: VigilConfig, configWarnings?: string[], retryItemIds?: string[]): string {
  const isRetry = Array.isArray(retryItemIds) && retryItemIds.length > 0;
  const parts: string[] = [
    COMMENT_MARKER,
    isRetry ? "## Vigil Test Plan Results _(retry)_" : "## Vigil Test Plan Results",
    "",
    buildSummaryLine(summary),
  ];

  if (isRetry) {
    parts.push("", `> **Retry:** re-ran ${retryItemIds!.join(", ")} — other items not re-executed.`);
  }

  if (pipelineError) {
    parts.push("", `> **Note:** ${pipelineError}`);
  }

  parts.push("", buildResultsTable(items));

  const evidenceBlocks = items
    .filter(i => i.verdict === "failed" || i.verdict === "error" || isNeedsReview(i))
    .map(i => buildEvidenceBlock(i))
    .filter(Boolean);

  if (evidenceBlocks.length > 0) {
    parts.push("", ...evidenceBlocks);
  }

  const configBlock = buildConfigBlock(vigiConfig, configWarnings);
  if (configBlock) {
    parts.push("", configBlock);
  }

  const footer = correlationId
    ? `<sub>Vigil v0.1.0 | keepvigil.dev | run: ${correlationId}</sub>`
    : `<sub>Vigil v0.1.0 | keepvigil.dev</sub>`;
  parts.push("", "---", footer);

  let body = parts.join("\n");
  body = truncateToBytes(body, MAX_COMMENT_BYTES, TRUNCATION_SUFFIX);

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

  let evidence = item.result ? formatEvidence(item) : "No execution result available.";

  // Truncate the evidence content *before* wrapping in HTML tags so we never
  // cut the output mid-tag (which would produce malformed HTML in the comment).
  const openTag = `<details>\n<summary>:${icon}: ${label}</summary>\n\n${meta}\n\n`;
  const closeTag = `\n\n</details>`;
  const evidenceTruncSuffix = "\n\n...(truncated)";
  const wrapperBytes = Buffer.byteLength(openTag + closeTag, "utf8");
  const maxEvidenceBytes = MAX_EVIDENCE_BLOCK_BYTES - wrapperBytes;
  if (Buffer.byteLength(evidence, "utf8") > maxEvidenceBytes) {
    evidence = truncateToBytes(evidence, maxEvidenceBytes - Buffer.byteLength(evidenceTruncSuffix, "utf8"), evidenceTruncSuffix);
  }

  return openTag + evidence + closeTag;
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
  const commands = Array.isArray(ev.commands) ? (ev.commands as string[]) : undefined;
  if (commands?.length) {
    parts.push(`**Commands:** \`${commands.join("; ")}\``);
  }
  const exitCode = typeof ev.exitCode === "number" ? ev.exitCode : undefined;
  if (exitCode !== undefined) {
    parts.push(`**Exit code:** ${exitCode}`);
  }
  const stdout = typeof ev.stdout === "string" ? ev.stdout : undefined;
  if (stdout) {
    parts.push("```\n" + truncate(stdout, 500) + "\n```");
  }
  const stderr = typeof ev.stderr === "string" ? ev.stderr : undefined;
  if (stderr) {
    parts.push("**stderr:**\n```\n" + truncate(stderr, 500) + "\n```");
  }
  const reason = typeof ev.reason === "string" ? ev.reason : undefined;
  if (reason) {
    parts.push(`**Reason:** ${reason}`);
  }
  return parts.join("\n\n") || "No evidence captured.";
}

function formatApiEvidence(ev: Record<string, unknown>): string {
  const requests = Array.isArray(ev.requests) ? (ev.requests as Array<Record<string, unknown>>) : undefined;
  if (!requests?.length) {
    const error = typeof ev.error === "string" ? ev.error : undefined;
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

  const actions = Array.isArray(ev.actions) ? (ev.actions as Array<Record<string, unknown>>) : undefined;
  if (actions?.length) {
    for (const action of actions) {
      const desc = action.description ?? action.spec ?? "action";
      const passed = typeof action.passed === "boolean" ? action.passed : undefined;
      const failReason = typeof action.failReason === "string" ? action.failReason : undefined;
      const icon = passed ? "pass" : "fail";
      parts.push(`- [${icon}] ${typeof desc === "string" ? desc : JSON.stringify(desc)}${failReason ? ` — ${failReason}` : ""}`);
    }
  }

  const consoleErrors = Array.isArray(ev.consoleErrors) ? (ev.consoleErrors as string[]) : undefined;
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
  if (item.verdict === "skipped" && item.result?.evidence?.notRetried) return ":next_track_button: Not retried";
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

/**
 * Build a collapsible config summary block for the PR comment.
 * Shows applied settings and any validation warnings from parsing .vigil.yml.
 * Returns an empty string when nothing was applied and there are no warnings.
 */
export function buildConfigBlock(vigiConfig?: VigilConfig, configWarnings?: string[]): string {
  const hasConfig = !!vigiConfig;
  const hasWarnings = !!configWarnings?.length;

  if (!hasConfig && !hasWarnings) return "";

  const rows: string[] = [];

  if (hasConfig) {
    if (vigiConfig!.timeouts?.shell !== undefined) {
      rows.push(`| Shell timeout | ${vigiConfig!.timeouts.shell}s |`);
    }
    if (vigiConfig!.timeouts?.api !== undefined) {
      rows.push(`| API timeout | ${vigiConfig!.timeouts.api}s |`);
    }
    if (vigiConfig!.timeouts?.browser !== undefined) {
      rows.push(`| Browser timeout | ${vigiConfig!.timeouts.browser}s |`);
    }
    if (vigiConfig!.skip?.categories?.length) {
      const categories = vigiConfig!.skip.categories.map((c) => escapeTableCell(c)).join(", ");
      rows.push(`| Skip categories | ${categories} |`);
    }
    if (vigiConfig!.viewports?.length) {
      const vpStr = vigiConfig!.viewports
        .map((vp) => `${escapeTableCell(vp.label)} (${vp.width}×${vp.height})`)
        .join(", ");
      rows.push(`| Viewports | ${vpStr} |`);
    }
    if (vigiConfig!.shell?.allow?.length) {
      const count = vigiConfig!.shell.allow.length;
      rows.push(`| Shell allowlist | +${count} custom prefix${count === 1 ? "" : "es"} |`);
    }
  }

  const parts: string[] = [];

  if (rows.length > 0) {
    parts.push(`| Setting | Value |\n|---------|-------|\n${rows.join("\n")}`);
  }

  if (hasWarnings) {
    const warningLines = configWarnings!.map((w) => `- ⚠️ ${w}`).join("\n");
    parts.push(`**Config warnings:**\n${warningLines}`);
  }

  if (parts.length === 0) return "";

  const title = rows.length > 0
    ? "⚙️ Config applied from <code>.vigil.yml</code>"
    : "⚙️ <code>.vigil.yml</code> found — no valid settings applied";

  return `<details>\n<summary>${title}</summary>\n\n${parts.join("\n\n")}\n\n</details>`;
}

export { COMMENT_MARKER };
