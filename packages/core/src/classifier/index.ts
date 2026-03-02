import type { TestPlanItem, ClassifiedItem } from "../types.js";
import { applyRules } from "./rules.js";
import { classifyWithLLM } from "./llm-classifier.js";

export { applyRules } from "./rules.js";
export { classifyWithLLM } from "./llm-classifier.js";
export {
  CLASSIFIER_SYSTEM_PROMPT,
  FEW_SHOT_EXAMPLES,
  buildUserPrompt,
} from "./prompts.js";

export interface ClassifyOptions {
  /** Anthropic API key for the LLM pass. If omitted, LLM pass is skipped. */
  apiKey?: string;
  /** Skip the LLM pass entirely — only use rule-based classification. */
  rulesOnly?: boolean;
}

/**
 * Classify an array of parsed test plan items using a two-pass approach:
 *
 * 1. **Rule-based pass** — Fast, free, deterministic. Handles items with
 *    clear signals (Manual: prefix, shell commands, HTTP verbs).
 *
 * 2. **LLM pass** — Sends remaining items to Claude Haiku in a single
 *    batched API call for classification.
 *
 * Items that the rule-based pass cannot classify and no API key is
 * provided are classified as LOW/none.
 */
export async function classifyItems(
  items: TestPlanItem[],
  options: ClassifyOptions = {},
): Promise<ClassifiedItem[]> {
  if (items.length === 0) return [];

  const results: ClassifiedItem[] = new Array(items.length);
  const deferredIndices: number[] = [];

  // Pass 1: Rule-based classification
  for (let i = 0; i < items.length; i++) {
    const result = applyRules(items[i]);
    if (result) {
      results[i] = result;
    } else {
      deferredIndices.push(i);
    }
  }

  // Pass 2: LLM classification for remaining items
  if (deferredIndices.length > 0) {
    const deferredItems = deferredIndices.map((i) => items[i]);

    if (options.rulesOnly || !options.apiKey) {
      // No LLM available — classify as LOW/none
      for (const idx of deferredIndices) {
        results[idx] = {
          item: items[idx],
          confidence: "LOW",
          executorType: "none",
          category: "vague",
          reasoning: options.rulesOnly
            ? "Rules-only mode — no LLM classification"
            : "No API key provided — LLM classification skipped",
        };
      }
    } else {
      try {
        const llmResults = await classifyWithLLM(deferredItems, options.apiKey);
        for (let j = 0; j < deferredIndices.length; j++) {
          results[deferredIndices[j]] = llmResults[j];
        }
      } catch {
        for (const idx of deferredIndices) {
          results[idx] = {
            item: items[idx],
            confidence: "LOW",
            executorType: "none",
            category: "vague",
            reasoning: "LLM classification failed unexpectedly",
          };
        }
      }
    }
  }

  return results;
}
