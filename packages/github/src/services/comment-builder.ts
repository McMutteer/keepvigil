import type { VigilConfig, ConfidenceScore, Signal, PipelineMode } from "@vigil/core";
import { extractChangedFilesWithStatus } from "@vigil/core";
import type { ReportItem, ReportSummary } from "./reporter.js";
import { truncateToBytes } from "./check-run-updater.js";

// Pro gating disabled during testing — all signals run for all users
// const PRO_GATED_SIGNALS: Set<SignalId> = new Set(["contract-checker", "diff-analyzer"]);

const COMMENT_MARKER = "<!-- vigil-results -->";
/** GitHub PR comment body limit is ~262,144 bytes. We target 60,000 bytes to stay safe. */
const MAX_COMMENT_BYTES = 60_000;
const MAX_EVIDENCE_BLOCK_BYTES = 2000;
const TRUNCATION_SUFFIX = "\n\n...(truncated)";

/** Build the full PR comment markdown body. Pure function — no I/O. */
export function buildCommentBody(items: ReportItem[], summary: ReportSummary, pipelineError?: string, correlationId?: string, vigiConfig?: VigilConfig, configWarnings?: string[], retryItemIds?: string[], confidenceScore?: ConfidenceScore, isFirstRun?: boolean, pipelineMode?: PipelineMode, diff?: string): string {
  if (confidenceScore) {
    return buildScoreCommentBody(items, summary, confidenceScore, pipelineError, correlationId, vigiConfig, configWarnings, retryItemIds, isFirstRun, pipelineMode, diff);
  }
  return buildV1CommentBody(items, summary, pipelineError, correlationId, vigiConfig, configWarnings, retryItemIds);
}

/** V1 comment format — backward compatible, used when no confidence score is available. */
function buildV1CommentBody(items: ReportItem[], summary: ReportSummary, pipelineError?: string, correlationId?: string, vigiConfig?: VigilConfig, configWarnings?: string[], retryItemIds?: string[]): string {
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

/** Build a contextual recommendation that explains WHY, not just what. */
function buildContextualRecommendation(score: ConfidenceScore, summary: ReportSummary): string {
  if (score.recommendation === "safe") {
    const verified = summary.passed + summary.failed;
    return verified > 0
      ? `Safe to merge — ${summary.passed}/${verified} checks passed`
      : "Safe to merge";
  }

  // For review/caution — explain what's wrong
  const failedSignals = score.signals.filter((s) => !s.passed && s.weight > 0);
  if (failedSignals.length > 0) {
    const reasons = failedSignals.map((s) => s.name).join(", ");
    return score.recommendation === "caution"
      ? `Merge with caution — ${reasons} flagged issues`
      : `Review needed — ${reasons}`;
  }

  if (summary.failed > 0) {
    return `Review needed — ${summary.failed} item${summary.failed > 1 ? "s" : ""} failed`;
  }

  return score.recommendation === "caution" ? "Merge with caution" : "Review recommended";
}

/** Score-based comment format — shows confidence score, signal table, and test plan results in a details block. */
function buildScoreCommentBody(items: ReportItem[], summary: ReportSummary, confidenceScore: ConfidenceScore, pipelineError?: string, correlationId?: string, vigiConfig?: VigilConfig, configWarnings?: string[], retryItemIds?: string[], isFirstRun?: boolean, _pipelineMode?: PipelineMode, diff?: string): string {
  const isRetry = Array.isArray(retryItemIds) && retryItemIds.length > 0;
  const recommendationEmoji: Record<string, string> = { safe: "\u2705", review: "\u26A0\uFE0F", caution: "\uD83D\uDD34" };
  const emoji = recommendationEmoji[confidenceScore.recommendation] ?? "";
  const recLabel = buildContextualRecommendation(confidenceScore, summary);

  const parts: string[] = [
    COMMENT_MARKER,
    isRetry ? `## Vigil Confidence Score: ${confidenceScore.score}/100 _(retry)_` : `## Vigil Confidence Score: ${confidenceScore.score}/100`,
    "",
    `**Recommendation:** ${recLabel} ${emoji}`,
    "",
  ];

  // Compact one-line glance (files, categories, coverage, review time)
  const glanceLine = buildReviewSummary(confidenceScore.signals, diff);
  if (glanceLine) {
    parts.push(glanceLine, "");
  }

  if (isRetry) {
    parts.push(`> **Retry:** re-ran ${retryItemIds!.join(", ")} — other items not re-executed.`, "");
  }

  if (pipelineError) {
    parts.push(`> **Note:** ${pipelineError}`, "");
  }

  // Description suggestion (when PR body was empty/generic)
  const descSection = buildDescriptionSection(confidenceScore.signals);
  if (descSection) {
    parts.push(descSection, "");
  }

  // v2 sections: Claims + Undocumented Changes (when those signals are present)
  const claimsSection = buildClaimsSection(confidenceScore.signals);
  if (claimsSection) {
    parts.push(claimsSection, "");
  }

  const undocSection = buildUndocumentedSection(confidenceScore.signals);
  if (undocSection) {
    parts.push(undocSection, "");
  }

  const riskSection = buildRiskSection(confidenceScore.signals);
  if (riskSection) {
    parts.push(riskSection, "");
  }

  // Signal table — only signals that contribute to the score (weight > 0)
  const scoringSignals = confidenceScore.signals.filter((s) => s.weight > 0);
  if (scoringSignals.length > 0) {
    parts.push(
      "| Signal | Score | Status |",
      "|--------|-------|--------|",
    );
    for (const signal of scoringSignals) {
      const statusSummary = buildSignalStatusSummary(signal);
      parts.push(`| ${escapeTableCell(signal.name)} | ${signal.score}/100 | ${statusSummary} |`);
    }
    parts.push("");
  }

  // Action items — highlight failures and warnings
  const actionItems = buildActionItems(confidenceScore, items);
  if (actionItems) {
    parts.push(actionItems, "");
  }

  // Assertion evidence summary — show how many files were verified
  const assertionItems = items.filter((i) => i.classified.executorType === "assertion");
  if (assertionItems.length > 0) {
    const verified = assertionItems.filter((i) => i.verdict === "passed").length;
    const fileNames = assertionItems
      .filter((i) => i.verdict === "passed")
      .map((i) => i.classified.item.hints.codeBlocks[0] || "")
      .filter(Boolean)
      .map((f) => `\`${f.split("/").pop()}\``)
      .slice(0, 8);
    if (verified > 0) {
      parts.push(`\uD83D\uDCC1 **${verified} file${verified > 1 ? "s" : ""} verified:** ${fileNames.join(", ")}${verified > 8 ? "..." : ""}`, "");
    }
  }

  // Test plan results in a collapsible details block (only when items exist)
  if (items.length > 0) {
    const v1Content = buildV1DetailsContent(items, summary);
    parts.push(
      "<details>",
      "<summary>Test plan results</summary>",
      "",
      v1Content,
      "",
      "</details>",
    );
  }

  const configBlock = buildConfigBlock(vigiConfig, configWarnings);
  if (configBlock) {
    parts.push("", configBlock);
  }

  if (isFirstRun) {
    parts.push("", _pipelineMode === "v2-only" ? buildV2OnboardingTips() : buildOnboardingTips());
  }

  const footer = correlationId
    ? `<sub>Vigil v0.1.0 | keepvigil.dev | run: ${correlationId}</sub>`
    : `<sub>Vigil v0.1.0 | keepvigil.dev</sub>`;
  parts.push("", "---", footer);

  let body = parts.join("\n");
  body = truncateToBytes(body, MAX_COMMENT_BYTES, TRUNCATION_SUFFIX);

  return body;
}

/** Build an action items section highlighting failures and warnings. */
function buildActionItems(confidenceScore: ConfidenceScore, items: ReportItem[]): string {
  const MAX_ITEMS = 5;
  const actionLines: Array<{ icon: string; text: string }> = [];

  // Collect failed test plan items
  for (const item of items) {
    if (item.verdict === "failed" || item.verdict === "error") {
      const text = item.classified.item.text.length > 80
        ? item.classified.item.text.slice(0, 77) + "..."
        : item.classified.item.text;
      actionLines.push({ icon: "\u274C", text });
    }
  }

  // Collect signal warnings/failures
  for (const signal of confidenceScore.signals) {
    for (const detail of signal.details) {
      if (detail.status === "fail") {
        const raw = detail.message || detail.label || "Unknown issue";
        const msg = raw.length > 80 ? raw.slice(0, 77) + "..." : raw;
        actionLines.push({ icon: "\u26A0\uFE0F", text: msg });
      }
    }
  }

  if (actionLines.length === 0) return "";

  const mustFix = actionLines.filter((a) => a.icon === "\u274C").slice(0, 3);
  const consider = actionLines.filter((a) => a.icon !== "\u274C").slice(0, MAX_ITEMS - mustFix.length);

  const sections: string[] = [];

  if (mustFix.length > 0) {
    sections.push("**Must Fix**");
    sections.push(mustFix.map((a) => `- ${a.icon} ${a.text}`).join("\n"));
  }

  if (consider.length > 0) {
    sections.push("**Consider**");
    sections.push(consider.map((a) => `- ${a.icon} ${a.text}`).join("\n"));
  }

  return `### Action Items\n\n${sections.join("\n\n")}`;
}

/** Build the inner content for the test plan details block (reuses v1 building blocks). */
function buildV1DetailsContent(items: ReportItem[], summary: ReportSummary): string {
  const parts: string[] = [
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

  return parts.join("\n");
}

/** Build a short status summary for a signal (e.g., "3/3 passed", "1 warning"). */
function buildSignalStatusSummary(signal: Signal): string {
  const details = signal.details;
  if (details.length === 0) {
    return signal.passed ? "\u2705 Passed" : "\u274C Failed";
  }

  const pass = details.filter(d => d.status === "pass").length;
  const fail = details.filter(d => d.status === "fail").length;
  const warn = details.filter(d => d.status === "warn").length;
  const skip = details.filter(d => d.status === "skip").length;

  const statusParts: string[] = [];
  if (pass > 0) statusParts.push(`${pass} passed`);
  if (fail > 0) statusParts.push(`${fail} failed`);
  if (warn > 0) statusParts.push(`${warn} warning${warn > 1 ? "s" : ""}`);
  if (skip > 0) statusParts.push(`${skip} skipped`);

  const icon = signal.passed ? "\u2705" : (fail > 0 ? "\u274C" : "\u26A0\uFE0F");
  return `${icon} ${statusParts.join(", ")}`;
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
  if (item.verdict === "passed" || item.verdict === "skipped" || item.verdict === "infra-skipped") return "";

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
    case "assertion":
      return formatAssertionEvidence(ev);
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

function formatAssertionEvidence(ev: Record<string, unknown>): string {
  const parts: string[] = [];
  const file = typeof ev.file === "string" ? ev.file : undefined;
  if (file) {
    parts.push(`**File:** \`${file}\``);
  }
  const exists = ev.exists as boolean | undefined;
  if (exists === false) {
    const reason = typeof ev.reason === "string" ? ev.reason : "File not found";
    parts.push(`**Status:** File not found`);
    parts.push(`**Reason:** ${reason}`);
    return parts.join("\n\n") || "No evidence captured.";
  }
  const verified = ev.verified as boolean | undefined;
  if (verified !== undefined) {
    parts.push(`**Verified:** ${verified ? "\u2705 Yes" : "\u274C No"}`);
  }
  const reasoning = typeof ev.reasoning === "string" ? ev.reasoning : undefined;
  if (reasoning) {
    parts.push(`> ${reasoning}`);
  }
  const relevantLines = typeof ev.relevantLines === "string" ? ev.relevantLines : undefined;
  if (relevantLines) {
    parts.push(`**Relevant lines:**\n\`\`\`\n${truncate(relevantLines, 500)}\n\`\`\``);
  }
  const error = typeof ev.error === "string" ? ev.error : undefined;
  if (error) {
    parts.push(`**Error:** ${error}`);
  }
  return parts.join("\n\n") || "No evidence captured.";
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
  if (item.verdict === "infra-skipped") {
    const reason = typeof item.result?.evidence?.reason === "string" ? item.result.evidence.reason : "Infrastructure limitation";
    return `:next_track_button: Skipped — ${reason}`;
  }
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
    if (vigiConfig!.notifications?.urls?.length) {
      const urlCount = vigiConfig!.notifications.urls.length;
      const trigger = vigiConfig!.notifications.on ?? "failure";
      rows.push(`| Notifications | ${urlCount} webhook${urlCount === 1 ? "" : "s"} (on: ${trigger}) |`);
    }
    if (vigiConfig!.autoApprove?.threshold) {
      rows.push(`| Auto-approve | score >= ${vigiConfig!.autoApprove.threshold} |`);
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

/**
 * Build a collapsible onboarding tips block for first-time repos.
 * Shows tips for writing better test plans to get more out of Vigil.
 */
export function buildOnboardingTips(): string {
  return `<details>
<summary>💡 Tips for better Vigil scores (first run detected)</summary>

Vigil works best when your test plan includes **logic and contract checks**, not just existence checks.

**Structure your test plan:**
- **Existence (≤30%):** \`file.ts\` has function X
- **Logic (30-40%):** \`file.ts\` function X uses pattern A instead of B
- **Contracts (20-30%):** \`api.ts\` response keys match \`page.tsx\` interface fields
- **Edge cases (10-20%):** \`file.tsx\` handler has loading guard to prevent double submit

**Quick wins:**
- Use full file paths (\`packages/api/src/routes/targets.ts\` not \`targets.ts\`)
- Be specific: "fetches existing type before normalizing" not "handles normalization"
- Add a blank line before the "Generated with" footer

[Full guide →](https://keepvigil.dev/docs/test-plans)

</details>`;
}

/**
 * Build onboarding tips for v2-only repos (no test plan).
 * Focuses on writing better PR descriptions instead of test plans.
 */
export function buildV2OnboardingTips(): string {
  return `<details>
<summary>\uD83D\uDCA1 Tips for better Vigil verification (first run detected)</summary>

Vigil extracts claims from your **PR title and description**, then verifies each one against the actual diff.

**Write better PR descriptions:**
- **Be specific:** "Add rate limiting with Redis backend" not just "Add rate limiting"
- **Mention dependencies:** If you added a package, say so — otherwise Vigil flags it as undocumented
- **Mention env vars:** New environment variables should be noted in the description
- **Use conventional commits:** \`feat:\`, \`fix:\`, \`refactor:\` help Vigil understand intent

**What Vigil checks:**
- **Claims:** Does the code match what the title/description says?
- **Undocumented changes:** Are there significant changes not mentioned?
- **Credentials:** Any secrets accidentally committed?
- **Coverage:** Do modified files have corresponding tests?

[Learn more \u2192](https://keepvigil.dev/docs/getting-started)

</details>`;
}

// ---------------------------------------------------------------------------
// v2 section builders
// ---------------------------------------------------------------------------

/** Build a "Claims" section from the claims-verifier signal details. */
function buildClaimsSection(signals: Signal[]): string {
  const claimsSignal = signals.find((s) => s.id === "claims-verifier");
  if (!claimsSignal || claimsSignal.details.length === 0) return "";

  // Skip if the only detail is a "skip" status (neutral signal)
  if (claimsSignal.details.length === 1 && claimsSignal.details[0].status === "skip") return "";

  const lines: string[] = ["### Claims"];
  for (const detail of claimsSignal.details) {
    const icon = detail.status === "pass" ? "\u2705"
      : detail.status === "fail" ? "\u274C"
      : "\u26A0\uFE0F";
    lines.push(`${icon} **"${escapeTableCell(detail.label)}"** — ${detail.message}`);
  }

  return lines.join("\n");
}

/** Build an "Undocumented Changes" section from the undocumented-changes signal details. */
function buildUndocumentedSection(signals: Signal[]): string {
  const undocSignal = signals.find((s) => s.id === "undocumented-changes");
  if (!undocSignal || undocSignal.details.length === 0) return "";

  // Skip if the only detail is a "skip" or "pass" status (nothing found)
  if (undocSignal.details.length === 1 && (undocSignal.details[0].status === "skip" || undocSignal.details[0].status === "pass")) return "";

  const lines: string[] = ["### Undocumented Changes"];
  for (const detail of undocSignal.details) {
    const icon = detail.status === "fail" ? "\u274C" : "\u26A0\uFE0F";
    lines.push(`- ${icon} **${escapeTableCell(detail.label)}:** ${detail.message}`);
  }

  return lines.join("\n");
}

/**
 * Build a "PR at a Glance" section from existing signal data + diff.
 * Aggregates file counts, categories, deps, coverage, and review time estimate.
 * Zero LLM calls — pure computation.
 */
export function buildReviewSummary(signals: Signal[], diff?: string): string {
  if (!diff) return "";

  const segments: string[] = [];

  // File counts
  const changedFiles = extractChangedFilesWithStatus(diff);
  if (changedFiles.length > 0) {
    const fileWord = changedFiles.length === 1 ? "file" : "files";
    segments.push(`\uD83D\uDCC1 ${changedFiles.length} ${fileWord}`);
  }

  // Categories from risk-score signal
  const riskSignal = signals.find((s) => s.id === "risk-score");
  if (riskSignal) {
    const categories = new Set<string>();
    for (const detail of riskSignal.details) {
      const label = detail.label.toLowerCase();
      if (label.includes("authentication")) categories.add("auth");
      if (label.includes("database")) categories.add("database");
      if (label.includes("infrastructure")) categories.add("infra");
      if (label.includes("cross-boundary")) categories.add("API+frontend");
    }
    if (categories.size > 0) {
      segments.push(`\uD83D\uDD11 ${Array.from(categories).join(", ")}`);
    }
  }

  // New dependencies from risk-score signal
  if (riskSignal) {
    const depDetail = riskSignal.details.find((d) => d.label.includes("New dependencies"));
    if (depDetail) {
      const match = depDetail.message.match(/:\s*(.+)$/);
      if (match) {
        segments.push(`\uD83D\uDCE6 ${match[1]}`);
      }
    }
  }

  // Test coverage from coverage-mapper signal
  const coverageSignal = signals.find((s) => s.id === "coverage-mapper");
  if (coverageSignal && coverageSignal.details.length > 0) {
    const passCount = coverageSignal.details.filter((d) => d.status === "pass").length;
    const failCount = coverageSignal.details.filter((d) => d.status === "fail").length;
    const totalTestable = passCount + failCount;
    if (totalTestable > 0) {
      segments.push(`\uD83E\uDDEA ${passCount}/${totalTestable} tested`);
    }
  }

  // Estimated review time
  const addedLines = diff.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
  const removedLines = diff.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---")).length;
  const totalChangedLines = addedLines + removedLines;
  let reviewMinutes = Math.ceil(totalChangedLines / 50);
  const isHighRisk = riskSignal?.details.some((d) => d.label.includes("HIGH"));
  if (isHighRisk) reviewMinutes = Math.ceil(reviewMinutes * 1.5);
  reviewMinutes = Math.max(2, Math.min(60, reviewMinutes));
  segments.push(`\u26A1 ~${reviewMinutes} min review`);

  if (segments.length === 0) return "";

  return `> ${segments.join(" | ")}`;
}

/** Build a "Suggested PR Description" section from the description-generator signal. */
function buildDescriptionSection(signals: Signal[]): string {
  const descSignal = signals.find((s) => s.id === "description-generator");
  if (!descSignal || descSignal.details.length === 0) return "";

  // Skip if signal was skipped (PR body was adequate)
  if (descSignal.details.length === 1 && descSignal.details[0].status === "skip") return "";

  // Find the generated description in the details
  const genDetail = descSignal.details.find((d) => d.label === "generated-description");
  if (!genDetail) return "";

  const summaryDetail = descSignal.details.find((d) => d.label === "Summary");
  const summary = summaryDetail?.message || "";

  const lines: string[] = ["### Suggested PR Description"];
  if (summary) {
    lines.push(`> **Summary:** ${summary}`);
    lines.push("");
  }

  // Show change groups from details (excluding summary and generated-description)
  const changeDetails = descSignal.details.filter((d) => d.label !== "Summary" && d.label !== "generated-description" && d.status === "pass");
  if (changeDetails.length > 0) {
    lines.push("**Changes:**");
    for (const detail of changeDetails) {
      lines.push(`- **${escapeTableCell(detail.label)}:** ${detail.message}`);
    }
    lines.push("");
  }

  // Copyable markdown block — use a dynamic fence to handle embedded backticks
  const maxBackticks = (genDetail.message.match(/`{3,}/g) ?? []).reduce((max, m) => Math.max(max, m.length), 2);
  const fence = "`".repeat(maxBackticks + 1);
  lines.push("<details>");
  lines.push("<summary>\uD83D\uDCCB Copy this to your PR description</summary>");
  lines.push("");
  lines.push(`${fence}markdown`);
  lines.push(genDetail.message);
  lines.push(fence);
  lines.push("");
  lines.push("</details>");

  return lines.join("\n");
}

/** Build a "Risk Assessment" section from the risk-score signal details. */
function buildRiskSection(signals: Signal[]): string {
  const riskSignal = signals.find((s) => s.id === "risk-score");
  if (!riskSignal || riskSignal.details.length === 0) return "";

  // Skip if only detail is a pass (no risk factors)
  if (riskSignal.details.length === 1 && riskSignal.details[0].status === "pass") return "";

  const lines: string[] = ["### Risk Assessment"];
  for (const detail of riskSignal.details) {
    // The "Risk Level" summary detail is rendered differently
    if (detail.label.startsWith("Risk Level:")) {
      lines.push(`**${detail.label}**`);
      continue;
    }
    lines.push(`${escapeTableCell(detail.label)} — ${detail.message}`);
  }

  return lines.join("\n");
}

export { COMMENT_MARKER };
