/**
 * Playwright spec generator for the browser test executor.
 *
 * Translates a natural-language test plan item into structured
 * `BrowserActionSpec` objects using Claude Haiku. Each spec describes
 * a single browser action (navigate, click, fill, assert, etc.).
 *
 * Security: the generator only produces RELATIVE paths — full URLs are
 * rejected. The base URL is always provided by the caller via
 * `BrowserExecutionContext`.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { BrowserActionSpec, BrowserActionType } from "@vigil/core/types";

const MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 15_000;
const MAX_WAIT_MS = 10_000;

const VALID_ACTIONS = new Set<string>([
  "navigate", "click", "fill", "select", "wait",
  "screenshot", "assertVisible", "assertText", "assertUrl",
]);

/** Actions that require a CSS selector */
const SELECTOR_REQUIRED = new Set<string>([
  "click", "fill", "select", "assertVisible", "assertText",
]);

const SYSTEM_PROMPT = `You generate browser action specifications from test plan items written in natural language.

Output a JSON array of action specs. Each spec must match this schema:
{
  "action": "navigate" | "click" | "fill" | "select" | "wait" | "screenshot" | "assertVisible" | "assertText" | "assertUrl",
  "selector": string,    // CSS selector (required for click, fill, select, assertVisible, assertText)
  "value": string,       // for fill/select
  "path": string,        // relative URL for navigate — MUST start with "/", NEVER a full URL
  "expected": string,    // for assertText (expected text) or assertUrl (URL substring)
  "waitMs": number,      // for wait (max 10000)
  "description": string  // what this step does
}

Rules:
- "path" MUST start with "/" and MUST NOT contain "://" or "//"
- Use simple CSS selectors — prefer [data-testid], button, a, input[type=...], h1, .class-name
- Always start with a "navigate" action
- For HIGH confidence items: end with at least one assertion (assertVisible, assertText, or assertUrl)
- For visual/screenshot checks: end with "screenshot" and NO assertions
- Keep flows linear — maximum 8 steps
- Output ONLY valid JSON — no markdown, no explanation

Examples:
- "Click login button and verify dashboard appears"
  → [{"action":"navigate","path":"/","description":"Open home page"},{"action":"click","selector":"button[data-testid=login]","description":"Click login"},{"action":"assertVisible","selector":".dashboard","description":"Dashboard is visible"}]

- "Verify the landing page has a hero section"
  → [{"action":"navigate","path":"/","description":"Open landing page"},{"action":"assertVisible","selector":".hero, [data-testid=hero], section:first-of-type","description":"Hero section is visible"}]

- "Check mobile responsiveness of the page"
  → [{"action":"navigate","path":"/","description":"Open page"},{"action":"screenshot","description":"Capture current state"}]

- "Verify OG tags are present"
  → [{"action":"navigate","path":"/","description":"Open page"},{"action":"screenshot","description":"Capture page for evidence"}]`;

/**
 * Validate that a path from the LLM is safe.
 * Rejects full URLs, protocol-relative URLs, and path traversal.
 */
function validatePath(path: string): void {
  if (path.includes("://") || path.startsWith("//")) {
    throw new Error(`LLM returned full URL in path field: "${path}"`);
  }
  if (path.includes("..")) {
    throw new Error(`Path traversal detected in path: "${path}"`);
  }
  if (!path.startsWith("/")) {
    throw new Error(`LLM returned non-relative path: "${path}"`);
  }
}

/**
 * Parse and validate the LLM JSON response into BrowserActionSpec[].
 * Exported for unit testing.
 */
export function parseBrowserSpecResponse(raw: string): BrowserActionSpec[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    throw new Error(`LLM returned invalid JSON: ${raw.substring(0, 200)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("LLM response is not an array");
  }

  return parsed.map((item: unknown, index: number) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`Spec at index ${index} is not an object`);
    }
    const raw = item as Record<string, unknown>;

    // Validate action type
    if (typeof raw.action !== "string") {
      throw new Error(`Spec[${index}].action missing`);
    }
    if (!VALID_ACTIONS.has(raw.action)) {
      throw new Error(`Spec[${index}].action invalid: "${raw.action}"`);
    }
    const action = raw.action as BrowserActionType;

    // Validate selector is present when required
    if (SELECTOR_REQUIRED.has(action) && typeof raw.selector !== "string") {
      throw new Error(`Spec[${index}].selector required for action "${action}"`);
    }

    // Validate path for navigate
    if (action === "navigate") {
      if (typeof raw.path !== "string") {
        throw new Error(`Spec[${index}].path required for navigate action`);
      }
      validatePath(raw.path);
    }

    // Validate and cap waitMs
    let waitMs = raw.waitMs as number | undefined;
    if (action === "wait") {
      if (typeof waitMs !== "number" || waitMs <= 0) {
        waitMs = 1000; // default wait
      }
      waitMs = Math.min(waitMs, MAX_WAIT_MS);
    }

    // Validate value for fill/select
    if ((action === "fill" || action === "select") && typeof raw.value !== "string") {
      throw new Error(`Spec[${index}].value required for action "${action}"`);
    }

    const spec: BrowserActionSpec = { action };

    if (typeof raw.selector === "string") spec.selector = raw.selector;
    if (typeof raw.value === "string") spec.value = raw.value;
    if (typeof raw.path === "string") spec.path = raw.path;
    if (typeof raw.expected === "string") spec.expected = raw.expected;
    if (action === "wait") spec.waitMs = waitMs;
    if (typeof raw.description === "string") spec.description = raw.description;

    return spec;
  });
}

/**
 * Generate browser action specs from a natural-language test plan item.
 * Returns an empty array if the LLM determines no browser actions apply.
 * Throws on LLM or validation errors.
 */
export async function generateBrowserSpec(
  itemText: string,
  apiKey: string,
): Promise<BrowserActionSpec[]> {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: itemText }],
    },
    { timeout: TIMEOUT_MS },
  );

  const firstBlock = message.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    throw new Error("LLM returned no text content");
  }

  return parseBrowserSpecResponse(firstBlock.text);
}
