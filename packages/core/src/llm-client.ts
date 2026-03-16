/**
 * Provider-agnostic LLM client for Vigil v2 (BYOLLM).
 *
 * Users configure their LLM provider via `.vigil.yml`. The factory creates
 * a client that all LLM consumers (classifier, API spec gen, browser spec gen)
 * use through the same interface.
 *
 * OpenAI-compatible providers (OpenAI, Groq, Ollama) share a single code path.
 */

import OpenAI from "openai";
import type { LLMClient, LLMConfig, LLMProvider } from "./types.js";

/** Base URLs for OpenAI-compatible providers */
const PROVIDER_BASE_URLS: Record<LLMProvider, string | undefined> = {
  openai: undefined, // SDK default
  groq: "https://api.groq.com/openai/v1",
  ollama: "http://localhost:11434/v1",
};

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Create an LLM client from a provider configuration.
 *
 * All supported providers use the OpenAI SDK with different base URLs.
 * This keeps the dependency footprint minimal.
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

    async chat({ system, user, timeoutMs }) {
      const response = await client.chat.completions.create(
        {
          model: config.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0,
        },
        { timeout: timeoutMs ?? DEFAULT_TIMEOUT_MS },
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error(`LLM returned empty response (provider: ${config.provider}, model: ${config.model})`);
      }
      return content;
    },
  };
}
