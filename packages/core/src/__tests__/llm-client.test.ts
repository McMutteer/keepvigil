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

import { createLLMClient } from "../llm-client.js";

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
  });
});
