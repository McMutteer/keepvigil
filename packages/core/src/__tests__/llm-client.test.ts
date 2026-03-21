import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist the mock so it's available before module import
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      constructor(public config: Record<string, unknown>) {}
      chat = { completions: { create: mockCreate } };
    },
  };
});

import { createLLMClient, createLLMClientWithFallback } from "../llm-client.js";

describe("createLLMClient", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("creates a client with groq provider", () => {
    const client = createLLMClient({ provider: "groq", model: "llama-3.3-70b-versatile", apiKey: "gsk_test" });
    expect(client.provider).toBe("groq");
    expect(client.model).toBe("llama-3.3-70b-versatile");
  });

  it("creates a client with openai provider", () => {
    const client = createLLMClient({ provider: "openai", model: "gpt-4o-mini", apiKey: "sk-test" });
    expect(client.provider).toBe("openai");
    expect(client.model).toBe("gpt-4o-mini");
  });

  it("creates a client with ollama provider", () => {
    const client = createLLMClient({ provider: "ollama", model: "llama3", apiKey: "unused" });
    expect(client.provider).toBe("ollama");
    expect(client.model).toBe("llama3");
  });

  describe("chat()", () => {
    it("returns response content", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "hello world" } }],
      });

      const client = createLLMClient({ provider: "groq", model: "test", apiKey: "key" });
      const result = await client.chat({ system: "sys", user: "usr" });
      expect(result).toBe("hello world");
    });

    it("passes system and user messages correctly", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "ok" } }],
      });

      const client = createLLMClient({ provider: "groq", model: "my-model", apiKey: "key" });
      await client.chat({ system: "You are helpful", user: "Classify this" });

      expect(mockCreate).toHaveBeenCalledWith(
        {
          model: "my-model",
          messages: [
            { role: "system", content: "You are helpful" },
            { role: "user", content: "Classify this" },
          ],
          temperature: 0,
        },
        { timeout: 15_000 },
      );
    });

    it("uses custom timeout when provided", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "ok" } }],
      });

      const client = createLLMClient({ provider: "groq", model: "test", apiKey: "key" });
      await client.chat({ system: "sys", user: "usr", timeoutMs: 5000 });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.any(Object),
        { timeout: 5000 },
      );
    });

    it("throws on empty response content", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const client = createLLMClient({ provider: "groq", model: "test", apiKey: "key" });
      await expect(client.chat({ system: "sys", user: "usr" }))
        .rejects.toThrow("LLM returned empty response");
    });

    it("throws on empty choices array", async () => {
      mockCreate.mockResolvedValueOnce({ choices: [] });

      const client = createLLMClient({ provider: "groq", model: "test", apiKey: "key" });
      await expect(client.chat({ system: "sys", user: "usr" }))
        .rejects.toThrow("LLM returned empty response");
    });

    it("propagates API errors", async () => {
      mockCreate.mockRejectedValueOnce(new Error("rate limited"));

      const client = createLLMClient({ provider: "groq", model: "test", apiKey: "key" });
      await expect(client.chat({ system: "sys", user: "usr" }))
        .rejects.toThrow("rate limited");
    });

    it("retries on 429 status and succeeds", async () => {
      const retryError = Object.assign(new Error("rate limited"), { status: 429 });
      mockCreate
        .mockRejectedValueOnce(retryError)
        .mockResolvedValueOnce({ choices: [{ message: { content: "retried ok" } }] });

      const client = createLLMClient({ provider: "groq", model: "test", apiKey: "key" });
      const result = await client.chat({ system: "sys", user: "usr" });
      expect(result).toBe("retried ok");
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it("retries on 503 and eventually fails after max retries", async () => {
      const retryError = Object.assign(new Error("service unavailable"), { status: 503 });
      mockCreate
        .mockRejectedValueOnce(retryError)
        .mockRejectedValueOnce(retryError)
        .mockRejectedValueOnce(retryError);

      const client = createLLMClient({ provider: "groq", model: "test", apiKey: "key" });
      await expect(client.chat({ system: "sys", user: "usr" }))
        .rejects.toThrow("service unavailable");
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it("does not retry on non-retryable errors (400)", async () => {
      const error = Object.assign(new Error("bad request"), { status: 400 });
      mockCreate.mockRejectedValueOnce(error);

      const client = createLLMClient({ provider: "groq", model: "test", apiKey: "key" });
      await expect(client.chat({ system: "sys", user: "usr" }))
        .rejects.toThrow("bad request");
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it("fires onUsage callback with cost data", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      const onUsage = vi.fn();
      const client = createLLMClient({ provider: "groq", model: "test", apiKey: "key", onUsage });
      await client.chat({ system: "sys", user: "usr" });

      expect(onUsage).toHaveBeenCalledOnce();
      expect(onUsage).toHaveBeenCalledWith(expect.objectContaining({
        provider: "groq",
        model: "test",
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      }));
    });
  });
});

describe("createLLMClientWithFallback", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("uses primary on success", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "primary ok" } }],
    });

    const client = createLLMClientWithFallback(
      { provider: "openai", model: "gpt-5.4-mini", apiKey: "sk-test" },
      { provider: "groq", model: "fallback", apiKey: "gsk-test" },
    );

    const result = await client.chat({ system: "sys", user: "usr" });
    expect(result).toBe("primary ok");
  });

  it("falls back to secondary when primary fails", async () => {
    // Primary fails all retries, then fallback succeeds
    const error = Object.assign(new Error("primary down"), { status: 500 });
    mockCreate
      .mockRejectedValueOnce(error) // primary attempt
      .mockResolvedValueOnce({ choices: [{ message: { content: "fallback ok" } }] }); // fallback

    const client = createLLMClientWithFallback(
      { provider: "openai", model: "gpt-5.4-mini", apiKey: "sk-test" },
      { provider: "groq", model: "fallback", apiKey: "gsk-test" },
    );

    const result = await client.chat({ system: "sys", user: "usr" });
    expect(result).toBe("fallback ok");
  });
});
