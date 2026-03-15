import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TestPlanHints, TestPlanItem, ClassifiedItem } from "@vigil/core";
import {
  detectProvider,
  buildSlackPayload,
  buildDiscordPayload,
  buildGenericPayload,
  notifyWebhooks,
} from "../services/webhook-notifier.js";
import type { WebhookNotifyParams } from "../services/webhook-notifier.js";
import type { ReportItem } from "../services/reporter.js";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeHints(overrides: Partial<TestPlanHints> = {}): TestPlanHints {
  return { isManual: false, codeBlocks: [], urls: [], ...overrides };
}

function makeItem(text: string, id = "tp-0"): TestPlanItem {
  return { id, text, checked: false, raw: `- [ ] ${text}`, indent: 0, hints: makeHints() };
}

function makeClassified(text: string, id = "tp-0"): ClassifiedItem {
  return {
    item: makeItem(text, id),
    confidence: "DETERMINISTIC",
    executorType: "shell",
    category: "build",
    reasoning: "test",
  };
}

function makeReportItem(text: string, verdict: "passed" | "failed" | "error" | "skipped", id = "tp-0"): ReportItem {
  return {
    classified: makeClassified(text, id),
    result: verdict === "skipped" ? null : { itemId: id, passed: verdict === "passed", duration: 100, evidence: {} },
    verdict,
  };
}

function makeParams(overrides: Partial<WebhookNotifyParams> = {}): WebhookNotifyParams {
  return {
    urls: ["https://hooks.slack.com/services/T/B/x"],
    conclusion: "failure",
    summary: { total: 3, passed: 1, failed: 1, skipped: 0, needsReview: 1 },
    items: [
      makeReportItem("npm run build", "passed", "tp-0"),
      makeReportItem("API health check", "failed", "tp-1"),
      makeReportItem("Login flow works", "failed", "tp-2"),
    ],
    owner: "McMutteer",
    repo: "keepvigil",
    pullNumber: 42,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// detectProvider
// ---------------------------------------------------------------------------

describe("detectProvider", () => {
  it("detects Slack from hooks.slack.com", () => {
    expect(detectProvider("https://hooks.slack.com/services/T/B/x")).toBe("slack");
  });

  it("detects Slack from subdomain.slack.com", () => {
    expect(detectProvider("https://workspace.slack.com/api/webhooks")).toBe("slack");
  });

  it("detects Discord from discord.com", () => {
    expect(detectProvider("https://discord.com/api/webhooks/123/abc")).toBe("discord");
  });

  it("detects Discord from discordapp.com", () => {
    expect(detectProvider("https://discordapp.com/api/webhooks/123/abc")).toBe("discord");
  });

  it("returns generic for unknown hosts", () => {
    expect(detectProvider("https://example.com/webhook")).toBe("generic");
  });

  it("returns generic for invalid URLs", () => {
    expect(detectProvider("not-a-url")).toBe("generic");
  });
});

// ---------------------------------------------------------------------------
// buildSlackPayload
// ---------------------------------------------------------------------------

describe("buildSlackPayload", () => {
  it("includes PR link and summary text", () => {
    const payload = buildSlackPayload(makeParams());
    expect(payload.text).toContain("McMutteer/keepvigil#42");
    expect(payload.attachments).toBeDefined();
    const attachments = payload.attachments as Array<Record<string, unknown>>;
    expect(attachments[0].color).toBe("#cf222e"); // failure = red
  });

  it("uses green color for success", () => {
    const payload = buildSlackPayload(makeParams({ conclusion: "success" }));
    const attachments = payload.attachments as Array<Record<string, unknown>>;
    expect(attachments[0].color).toBe("#2ea043");
  });

  it("includes retry marker when isRetry is true", () => {
    const payload = buildSlackPayload(makeParams({ isRetry: true }));
    expect(payload.text).toContain("(retry)");
  });

  it("lists failed items in the message", () => {
    const payload = buildSlackPayload(makeParams());
    const attachments = payload.attachments as Array<Record<string, unknown>>;
    const blocks = attachments[0].blocks as Array<Record<string, unknown>>;
    const text = (blocks[0].text as Record<string, unknown>).text as string;
    expect(text).toContain("tp-1");
  });
});

// ---------------------------------------------------------------------------
// buildDiscordPayload
// ---------------------------------------------------------------------------

describe("buildDiscordPayload", () => {
  it("includes PR link and embed with color", () => {
    const payload = buildDiscordPayload(makeParams());
    const embeds = payload.embeds as Array<Record<string, unknown>>;
    expect(embeds[0].url).toBe("https://github.com/McMutteer/keepvigil/pull/42");
    expect(embeds[0].color).toBe(0xcf222e); // failure
  });

  it("uses green color for success", () => {
    const payload = buildDiscordPayload(makeParams({ conclusion: "success" }));
    const embeds = payload.embeds as Array<Record<string, unknown>>;
    expect(embeds[0].color).toBe(0x2ea043);
  });

  it("lists failed items in description", () => {
    const payload = buildDiscordPayload(makeParams());
    const embeds = payload.embeds as Array<Record<string, unknown>>;
    const description = embeds[0].description as string;
    expect(description).toContain("tp-1");
    expect(description).toContain("Failed items");
  });

  it("includes retry marker when isRetry is true", () => {
    const payload = buildDiscordPayload(makeParams({ isRetry: true }));
    const embeds = payload.embeds as Array<Record<string, unknown>>;
    expect(embeds[0].title).toContain("(retry)");
  });
});

// ---------------------------------------------------------------------------
// buildGenericPayload
// ---------------------------------------------------------------------------

describe("buildGenericPayload", () => {
  it("returns structured JSON with all fields", () => {
    const payload = buildGenericPayload(makeParams());
    expect(payload.service).toBe("vigil");
    expect(payload.event).toBe("test_plan_complete");
    expect(payload.conclusion).toBe("failure");
    expect(payload.repository).toBe("McMutteer/keepvigil");
    expect(payload.pullRequest).toBe(42);
    expect(payload.prUrl).toBe("https://github.com/McMutteer/keepvigil/pull/42");
    expect((payload.summary as Record<string, number>).total).toBe(3);
    expect(payload.failedItems).toHaveLength(2);
  });

  it("sets isRetry flag correctly", () => {
    expect(buildGenericPayload(makeParams()).isRetry).toBe(false);
    expect(buildGenericPayload(makeParams({ isRetry: true })).isRetry).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// notifyWebhooks
// ---------------------------------------------------------------------------

describe("notifyWebhooks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("skips URLs that fail SSRF validation (localhost, private IPs, cloud metadata)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
    await notifyWebhooks(makeParams({
      urls: [
        "https://localhost/hook",
        "https://127.0.0.1/hook",
        "https://10.0.0.1/internal",
        "https://172.16.0.10/internal",
        "https://192.168.1.1/admin",
        "https://169.254.169.254/latest/meta-data",
        "https://[::1]/hook",
        "https://[fc00::1]/hook",
        "https://hooks.slack.com/services/T/B/x",
      ],
    }));
    // Only the Slack URL should be called — all others are blocked
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe("https://hooks.slack.com/services/T/B/x");
  });

  it("calls fetch for each URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
    await notifyWebhooks(makeParams({
      urls: [
        "https://hooks.slack.com/services/T/B/x",
        "https://discord.com/api/webhooks/123/abc",
      ],
    }));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not throw when a webhook returns non-OK status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("err", { status: 500 }));
    await expect(notifyWebhooks(makeParams())).resolves.not.toThrow();
  });

  it("does not throw when fetch rejects (network error)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network error"));
    await expect(notifyWebhooks(makeParams())).resolves.not.toThrow();
  });

  it("sends correct Content-Type header", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
    await notifyWebhooks(makeParams());
    const call = fetchSpy.mock.calls[0];
    const options = call[1] as RequestInit;
    expect((options.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("sends Slack payload to slack URLs and Discord payload to discord URLs", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
    await notifyWebhooks(makeParams({
      urls: [
        "https://hooks.slack.com/services/T/B/x",
        "https://discord.com/api/webhooks/123/abc",
        "https://example.com/hook",
      ],
    }));

    // Slack payload has attachments
    const slackBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(slackBody.attachments).toBeDefined();

    // Discord payload has embeds
    const discordBody = JSON.parse(fetchSpy.mock.calls[1][1]!.body as string);
    expect(discordBody.embeds).toBeDefined();

    // Generic payload has service field
    const genericBody = JSON.parse(fetchSpy.mock.calls[2][1]!.body as string);
    expect(genericBody.service).toBe("vigil");
  });
});
