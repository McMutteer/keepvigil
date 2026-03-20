/**
 * Provider-agnostic LLM client for Vigil.
 *
 * Supports OpenAI (GPT-5.4 nano/mini), Groq, and Ollama.
 * Includes exponential backoff retry and optional fallback provider.
 *
 * Reasoning effort: models that support chain-of-thought (GPT-5.4 family)
 * accept a `reasoning.effort` parameter that controls thinking depth.
 */

import OpenAI from "openai";
import type { LLMClient, LLMConfig, LLMProvider } from "./types.js";
import { createLogger } from "./logger.js";

const log = createLogger("llm-client");

/** Base URLs for OpenAI-compatible providers */
const PROVIDER_BASE_URLS: Record<LLMProvider, string | undefined> = {
  openai: undefined, // SDK default
  groq: "https://api.groq.com/openai/v1",
  ollama: "http://localhost:11434/v1",
};

/** Models known to support the reasoning.effort parameter */
const REASONING_MODELS = new Set([
  "gpt-5.4-nano",
  "gpt-5.4-mini",
  "gpt-5.4",
]);

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function supportsReasoning(model: string): boolean {
  return REASONING_MODELS.has(model);
}

/**
 * Create an LLM client from a provider configuration.
 *
 * All supported providers use the OpenAI SDK with different base URLs.
 * Includes exponential backoff retry for transient failures (rate limits, timeouts).
 */
export function createLLMClient(config: LLMConfig): LLMClient {
  const baseURL = PROVIDER_BASE_URLS[config.provider];

  const client = new OpenAI({
    apiKey: config.apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  return {
    model: config.model,
    provider: config.provider,

    async chat({ system, user, timeoutMs, reasoningEffort }) {
      const effort = reasoningEffort ?? config.reasoningEffort;
      let lastError: unknown;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
            model: config.model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            temperature: 0,
          };

          const response = await client.chat.completions.create({
            ...params,
            // Reasoning effort for GPT-5.4 models — undocumented param, SDK passes it through
            ...(effort && effort !== "none" && supportsReasoning(config.model)
              ? { reasoning: { effort } }
              : {}),
          } as typeof params, { timeout: timeoutMs ?? DEFAULT_TIMEOUT_MS });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error(`LLM returned empty response (provider: ${config.provider}, model: ${config.model})`);
          }

          // Log token usage for cost tracking
          const usage = response.usage;
          if (usage) {
            log.info({
              provider: config.provider,
              model: config.model,
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
            }, "LLM call completed");
          }

          return content;
        } catch (err) {
          lastError = err;
          const status = (err as { status?: number }).status;
          const isRetryable = status === 429 || status === 503 || status === 502;

          if (isRetryable && attempt < MAX_RETRIES - 1) {
            await sleep(Math.pow(2, attempt) * 1000); // 1s, 2s, 4s
            continue;
          }
          break;
        }
      }

      throw lastError;
    },
  };
}

/**
 * Create an LLM client with automatic fallback to a secondary provider.
 *
 * If the primary provider fails after all retries, falls back to the secondary.
 * Useful for OpenAI primary → Groq fallback.
 */
export function createLLMClientWithFallback(
  primary: LLMConfig,
  fallback: LLMConfig,
): LLMClient {
  const primaryClient = createLLMClient(primary);
  const fallbackClient = createLLMClient(fallback);

  return {
    model: primary.model,
    provider: primary.provider,

    async chat(params) {
      try {
        return await primaryClient.chat(params);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const status = (err as { status?: number }).status;
        log.warn({ provider: primary.provider, model: primary.model, error: msg, status }, "Primary LLM failed — falling back");
        // Primary failed — try fallback without reasoning (Groq doesn't support it)
        return await fallbackClient.chat({
          ...params,
          reasoningEffort: undefined,
        });
      }
    },
  };
}
