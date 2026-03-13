import OpenAI from "openai";
import type {
  TestPlanItem,
  ClassifiedItem,
  ConfidenceTier,
  ExecutorType,
  CategoryLabel,
} from "../types.js";
import { CLASSIFIER_SYSTEM_PROMPT, buildUserPrompt } from "./prompts.js";

/** Model used for batch classification */
const MODEL = "llama-3.3-70b-versatile";

/** Timeout for the API call in milliseconds */
const TIMEOUT_MS = 10_000;

/** Valid values for runtime validation */
const VALID_CONFIDENCE: Set<string> = new Set([
  "DETERMINISTIC",
  "HIGH",
  "MEDIUM",
  "LOW",
  "SKIP",
]);
const VALID_EXECUTOR: Set<string> = new Set([
  "shell",
  "api",
  "browser",
  "none",
]);
const VALID_CATEGORY: Set<string> = new Set([
  "build",
  "api",
  "ui-flow",
  "visual",
  "metadata",
  "manual",
  "vague",
]);

interface LLMClassification {
  category: string;
  confidence: string;
  executorType: string;
  reasoning: string;
}

/**
 * Create a fallback ClassifiedItem for when the LLM is unavailable.
 *
 * Uses SKIP/manual rather than LOW/vague so the item appears as "Human" in the
 * report — honest about the fact that we couldn't classify it, not that the
 * item itself is low-confidence.
 */
function makeFallback(item: TestPlanItem, reason: string): ClassifiedItem {
  return {
    item,
    confidence: "SKIP",
    executorType: "none",
    category: "manual",
    reasoning: reason,
  };
}

/**
 * Parse and validate the LLM response JSON.
 * Returns null if the response is malformed.
 */
function parseLLMResponse(
  responseText: string,
  expectedCount: number,
): LLMClassification[] | null {
  // Extract JSON array from response — check for fenced code block first
  const fenced = responseText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : responseText;

  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length !== expectedCount) return null;

  // Validate each element has the required fields
  for (const entry of parsed) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof entry.category !== "string" ||
      typeof entry.confidence !== "string" ||
      typeof entry.executorType !== "string" ||
      typeof entry.reasoning !== "string"
    ) {
      return null;
    }
  }

  return parsed as LLMClassification[];
}

/**
 * Classify a batch of test plan items using Claude Haiku.
 *
 * Sends all items in a single API call with few-shot examples.
 * On any error (timeout, invalid response, API failure), all items
 * are classified as LOW/none with an explanatory reasoning.
 */
export async function classifyWithLLM(
  items: TestPlanItem[],
  apiKey: string,
): Promise<ClassifiedItem[]> {
  if (items.length === 0) return [];

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
  const itemTexts = items.map((item) => item.text);

  let responseText: string;
  try {
    const completion = await client.chat.completions.create(
      {
        model: MODEL,
        max_tokens: Math.max(1024, items.length * 150),
        messages: [
          { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(itemTexts) },
        ],
      },
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      return items.map((item) =>
        makeFallback(item, "LLM returned no text content"),
      );
    }
    responseText = text;
  } catch {
    return items.map((item) =>
      makeFallback(item, "LLM classification unavailable"),
    );
  }

  const classifications = parseLLMResponse(responseText, items.length);
  if (!classifications) {
    return items.map((item) =>
      makeFallback(item, "LLM returned invalid JSON response"),
    );
  }

  return items.map((item, i) => {
    const c = classifications[i];
    if (!c) {
      return makeFallback(item, "LLM response missing expected item at index " + i);
    }
    return {
      item,
      confidence: VALID_CONFIDENCE.has(c.confidence)
        ? (c.confidence as ConfidenceTier)
        : "LOW",
      executorType: VALID_EXECUTOR.has(c.executorType)
        ? (c.executorType as ExecutorType)
        : "none",
      category: VALID_CATEGORY.has(c.category)
        ? (c.category as CategoryLabel)
        : "vague",
      reasoning: c.reasoning || "No reasoning provided",
    };
  });
}
