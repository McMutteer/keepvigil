/**
 * Webhook notification service for Slack, Discord, and generic HTTPS endpoints.
 *
 * Sends test plan results to configured webhook URLs after a Vigil run completes.
 * Auto-detects the provider from the URL hostname and formats payloads accordingly.
 *
 * Design principles:
 *  - Fire-and-forget: failures are logged but never propagate
 *  - Bounded: 5-second timeout per request, max 5 URLs
 *  - No new dependencies: uses Node 22 native fetch
 */

import { createLogger } from "@vigil/core";
import type { ReportSummary, ReportItem, CheckConclusion } from "./reporter.js";

const log = createLogger("webhook-notifier");

const WEBHOOK_TIMEOUT_MS = 5_000;

export type WebhookProvider = "slack" | "discord" | "generic";

export interface WebhookNotifyParams {
  urls: string[];
  conclusion: CheckConclusion;
  summary: ReportSummary;
  items: ReportItem[];
  owner: string;
  repo: string;
  pullNumber: number;
  isRetry?: boolean;
}

/** Detect webhook provider from URL hostname. */
export function detectProvider(url: string): WebhookProvider {
  try {
    const hostname = new URL(url).hostname;
    if (hostname === "hooks.slack.com" || hostname.endsWith(".slack.com")) return "slack";
    if (hostname === "discord.com" || hostname === "discordapp.com") return "discord";
  } catch {
    // invalid URL — treat as generic
  }
  return "generic";
}

/** Build a Slack webhook payload with Block Kit. */
export function buildSlackPayload(params: WebhookNotifyParams): Record<string, unknown> {
  const { conclusion, summary, owner, repo, pullNumber, isRetry } = params;
  const color = conclusion === "success" ? "#2ea043" : conclusion === "failure" ? "#cf222e" : "#d29922";
  const icon = conclusion === "success" ? ":white_check_mark:" : conclusion === "failure" ? ":x:" : ":warning:";
  const prUrl = `https://github.com/${owner}/${repo}/pull/${pullNumber}`;
  const title = isRetry ? "Vigil Test Plan Results (retry)" : "Vigil Test Plan Results";

  const summaryParts: string[] = [];
  if (summary.passed > 0) summaryParts.push(`${summary.passed} passed`);
  if (summary.failed > 0) summaryParts.push(`${summary.failed} failed`);
  if (summary.needsReview > 0) summaryParts.push(`${summary.needsReview} need review`);
  if (summary.skipped > 0) summaryParts.push(`${summary.skipped} skipped`);
  const summaryText = summaryParts.join(" | ") || "No items";

  const failedItems = params.items
    .filter(i => i.verdict === "failed" || i.verdict === "error")
    .map(i => `• ${i.classified.item.id}: ${truncate(i.classified.item.text, 60)}`)
    .slice(0, 10);

  const fields: string[] = [`*${summaryText}*`];
  if (failedItems.length > 0) {
    fields.push(`\n*Failed items:*\n${failedItems.join("\n")}`);
  }

  return {
    text: `${icon} ${title} — ${owner}/${repo}#${pullNumber}`,
    attachments: [
      {
        color,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${icon} *<${prUrl}|${owner}/${repo}#${pullNumber}>* — ${title}\n\n${fields.join("\n")}`,
            },
          },
        ],
      },
    ],
  };
}

/** Build a Discord webhook payload with embeds. */
export function buildDiscordPayload(params: WebhookNotifyParams): Record<string, unknown> {
  const { conclusion, summary, owner, repo, pullNumber, isRetry } = params;
  const color = conclusion === "success" ? 0x2ea043 : conclusion === "failure" ? 0xcf222e : 0xd29922;
  const prUrl = `https://github.com/${owner}/${repo}/pull/${pullNumber}`;
  const title = isRetry ? "Vigil Test Plan Results (retry)" : "Vigil Test Plan Results";

  const summaryParts: string[] = [];
  if (summary.passed > 0) summaryParts.push(`**${summary.passed}** passed`);
  if (summary.failed > 0) summaryParts.push(`**${summary.failed}** failed`);
  if (summary.needsReview > 0) summaryParts.push(`**${summary.needsReview}** need review`);
  if (summary.skipped > 0) summaryParts.push(`**${summary.skipped}** skipped`);

  const failedItems = params.items
    .filter(i => i.verdict === "failed" || i.verdict === "error")
    .map(i => `• ${i.classified.item.id}: ${truncate(i.classified.item.text, 60)}`)
    .slice(0, 10);

  let description = summaryParts.join(" | ") || "No items";
  if (failedItems.length > 0) {
    description += `\n\n**Failed items:**\n${failedItems.join("\n")}`;
  }

  return {
    embeds: [
      {
        title: `${title} — ${owner}/${repo}#${pullNumber}`,
        url: prUrl,
        color,
        description,
        footer: { text: "Vigil — keepvigil.dev" },
      },
    ],
  };
}

/** Build a generic JSON payload for custom webhook integrations. */
export function buildGenericPayload(params: WebhookNotifyParams): Record<string, unknown> {
  const { conclusion, summary, owner, repo, pullNumber, isRetry } = params;
  return {
    service: "vigil",
    event: "test_plan_complete",
    conclusion,
    isRetry: !!isRetry,
    repository: `${owner}/${repo}`,
    pullRequest: pullNumber,
    prUrl: `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
    summary: {
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
      skipped: summary.skipped,
      needsReview: summary.needsReview,
    },
    failedItems: params.items
      .filter(i => i.verdict === "failed" || i.verdict === "error")
      .map(i => ({ id: i.classified.item.id, text: i.classified.item.text })),
  };
}

/**
 * Send webhook notifications to all configured URLs.
 * Uses Promise.allSettled — individual failures don't affect other webhooks.
 */
export async function notifyWebhooks(params: WebhookNotifyParams): Promise<void> {
  const results = await Promise.allSettled(
    params.urls.map(async (url) => {
      const provider = detectProvider(url);
      let payload: Record<string, unknown>;

      switch (provider) {
        case "slack":
          payload = buildSlackPayload(params);
          break;
        case "discord":
          payload = buildDiscordPayload(params);
          break;
        default:
          payload = buildGenericPayload(params);
          break;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!response.ok) {
          log.warn({ url: redactUrl(url), status: response.status }, "Webhook returned non-OK status");
        }
      } finally {
        clearTimeout(timer);
      }
    }),
  );

  const failures = results.filter(r => r.status === "rejected");
  if (failures.length > 0) {
    log.warn({ failureCount: failures.length, total: params.urls.length }, "Some webhook notifications failed");
  }
}

/** Redact webhook URL for logging (show host + first 10 chars of path). */
function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 10 ? u.pathname.slice(0, 10) + "..." : u.pathname;
    return `${u.hostname}${path}`;
  } catch {
    return "(invalid-url)";
  }
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}
