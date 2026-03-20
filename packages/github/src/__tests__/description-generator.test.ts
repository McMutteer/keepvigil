import { describe, it, expect, vi } from "vitest";
import type { LLMClient } from "@vigil/core";
import { shouldGenerate, generateDescription } from "../services/description-generator.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLLM(response: string): LLMClient {
  return {
    chat: vi.fn().mockResolvedValue(response),
    model: "test-model",
    provider: "openai",
  };
}

function makeLLMError(error: string): LLMClient {
  return {
    chat: vi.fn().mockRejectedValue(new Error(error)),
    model: "test-model",
    provider: "openai",
  };
}

const validResponse = JSON.stringify({
  summary: "Add rate limiting middleware to API endpoints",
  changes: [
    { category: "feat", description: "Rate limiting middleware with Redis backend", files: ["src/middleware/rate-limiter.ts"] },
    { category: "chore", description: "Added ioredis dependency", files: ["package.json"] },
  ],
  dependencies: ["ioredis"],
  breakingChanges: [],
  notes: ["Requires REDIS_URL environment variable"],
});

const simpleDiff = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,5 @@
+import { rateLimit } from "./rate-limiter";
+app.use(rateLimit());
 export const app = "test";`;

// ---------------------------------------------------------------------------
// shouldGenerate
// ---------------------------------------------------------------------------

describe("shouldGenerate", () => {
  it("returns true for empty body", () => {
    expect(shouldGenerate("", "feat: add feature")).toBe(true);
  });

  it("returns true for whitespace-only body", () => {
    expect(shouldGenerate("   \n  ", "feat: add feature")).toBe(true);
  });

  it("returns true for short body with generic title", () => {
    expect(shouldGenerate("minor changes", "fix")).toBe(true);
    expect(shouldGenerate("done", "wip")).toBe(true);
    expect(shouldGenerate("updates", "update")).toBe(true);
    expect(shouldGenerate("small fix", "feat:")).toBe(true);
    expect(shouldGenerate("small fix", "fix:")).toBe(true);
  });

  it("returns false for short body with descriptive scoped title", () => {
    expect(shouldGenerate("small fix", "feat(api): add Redis-backed rate limiting")).toBe(false);
    expect(shouldGenerate("small fix", "fix: resolve login timeout")).toBe(false);
  });

  it("returns true when claimsFound is 0", () => {
    expect(shouldGenerate("Some body text that is long enough", "feat: add feature", 0)).toBe(true);
  });

  it("returns false for adequate body", () => {
    expect(shouldGenerate(
      "This PR adds rate limiting to all API endpoints using Redis as the backend store. It includes configuration via environment variables.",
      "feat: add rate limiting",
    )).toBe(false);
  });

  it("returns false for short body with specific title", () => {
    expect(shouldGenerate(
      "Added rate limiting with Redis backend for API protection.",
      "feat(api): add Redis-backed rate limiting to all endpoints",
    )).toBe(false);
  });

  it("returns false when claims were found", () => {
    expect(shouldGenerate("short", "fix", 3)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateDescription
// ---------------------------------------------------------------------------

describe("generateDescription", () => {
  it("returns neutral signal when PR body is adequate", async () => {
    const signal = await generateDescription({
      prTitle: "feat: add rate limiting",
      prBody: "This PR adds rate limiting to all API endpoints using Redis as the backend store. It includes configuration via environment variables.",
      diff: simpleDiff,
      llm: makeLLM(validResponse),
    });
    expect(signal.id).toBe("description-generator");
    expect(signal.details[0].status).toBe("skip");
    expect(signal.details[0].message).toContain("adequate");
  });

  it("returns neutral signal for empty diff", async () => {
    const signal = await generateDescription({
      prTitle: "fix",
      prBody: "",
      diff: "",
      llm: makeLLM(validResponse),
    });
    expect(signal.details[0].status).toBe("skip");
    expect(signal.details[0].message).toContain("Empty diff");
  });

  it("generates description when body is empty", async () => {
    const signal = await generateDescription({
      prTitle: "feat: add rate limiting",
      prBody: "",
      diff: simpleDiff,
      llm: makeLLM(validResponse),
    });
    expect(signal.score).toBe(100);
    expect(signal.passed).toBe(true);
    expect(signal.requiresLLM).toBe(true);

    const summaryDetail = signal.details.find((d) => d.label === "Summary");
    expect(summaryDetail).toBeDefined();
    expect(summaryDetail!.message).toContain("rate limiting");

    const genDetail = signal.details.find((d) => d.label === "generated-description");
    expect(genDetail).toBeDefined();
    expect(genDetail!.message).toContain("rate limiting");
  });

  it("generates description when claimsFound is 0", async () => {
    const signal = await generateDescription({
      prTitle: "feat: add rate limiting",
      prBody: "Some text without claims.",
      diff: simpleDiff,
      llm: makeLLM(validResponse),
      claimsFound: 0,
    });
    expect(signal.details.find((d) => d.label === "generated-description")).toBeDefined();
  });

  it("includes change categories in details", async () => {
    const signal = await generateDescription({
      prTitle: "fix",
      prBody: "",
      diff: simpleDiff,
      llm: makeLLM(validResponse),
    });
    const changeDetails = signal.details.filter((d) => d.label !== "Summary" && d.label !== "generated-description" && d.label !== "Skipped");
    expect(changeDetails.length).toBeGreaterThan(0);
    expect(changeDetails[0].label).toBe("feat");
  });

  it("handles LLM failure gracefully", async () => {
    const signal = await generateDescription({
      prTitle: "fix",
      prBody: "",
      diff: simpleDiff,
      llm: makeLLMError("connection timeout"),
    });
    expect(signal.details[0].status).toBe("skip");
    expect(signal.details[0].message).toContain("unavailable");
  });

  it("handles invalid JSON response", async () => {
    const signal = await generateDescription({
      prTitle: "fix",
      prBody: "",
      diff: simpleDiff,
      llm: makeLLM("not valid json at all"),
    });
    expect(signal.details[0].status).toBe("skip");
    expect(signal.details[0].message).toContain("invalid response");
  });

  it("handles empty LLM response", async () => {
    const signal = await generateDescription({
      prTitle: "fix",
      prBody: "",
      diff: simpleDiff,
      llm: makeLLM(JSON.stringify({ summary: "", changes: [], dependencies: [], breakingChanges: [], notes: [] })),
    });
    expect(signal.details[0].status).toBe("skip");
    expect(signal.details[0].message).toContain("meaningful");
  });

  it("handles response wrapped in code fences", async () => {
    const signal = await generateDescription({
      prTitle: "fix",
      prBody: "",
      diff: simpleDiff,
      llm: makeLLM("```json\n" + validResponse + "\n```"),
    });
    expect(signal.details.find((d) => d.label === "generated-description")).toBeDefined();
  });

  it("truncates very long summaries", async () => {
    const longResponse = JSON.stringify({
      summary: "A".repeat(500),
      changes: [],
      dependencies: [],
      breakingChanges: [],
      notes: [],
    });
    const signal = await generateDescription({
      prTitle: "fix",
      prBody: "",
      diff: simpleDiff,
      llm: makeLLM(longResponse),
    });
    const summaryDetail = signal.details.find((d) => d.label === "Summary");
    expect(summaryDetail!.message.length).toBeLessThanOrEqual(300);
  });

  it("limits change groups to 5", async () => {
    const manyChanges = JSON.stringify({
      summary: "Big update",
      changes: Array.from({ length: 10 }, (_, i) => ({
        category: "feat",
        description: `Change ${i}`,
        files: [`file${i}.ts`],
      })),
      dependencies: [],
      breakingChanges: [],
      notes: [],
    });
    const signal = await generateDescription({
      prTitle: "fix",
      prBody: "",
      diff: simpleDiff,
      llm: makeLLM(manyChanges),
    });
    // 1 summary + 5 changes + 1 generated-description = 7 max
    const changeDetails = signal.details.filter((d) => d.label !== "Summary" && d.label !== "generated-description");
    expect(changeDetails.length).toBeLessThanOrEqual(5);
  });

  it("includes dependencies in formatted description", async () => {
    const signal = await generateDescription({
      prTitle: "fix",
      prBody: "",
      diff: simpleDiff,
      llm: makeLLM(validResponse),
    });
    const genDetail = signal.details.find((d) => d.label === "generated-description");
    expect(genDetail!.message).toContain("ioredis");
    expect(genDetail!.message).toContain("Dependencies");
  });

  it("includes notes in formatted description", async () => {
    const signal = await generateDescription({
      prTitle: "fix",
      prBody: "",
      diff: simpleDiff,
      llm: makeLLM(validResponse),
    });
    const genDetail = signal.details.find((d) => d.label === "generated-description");
    expect(genDetail!.message).toContain("REDIS_URL");
    expect(genDetail!.message).toContain("Notes");
  });

  it("signal metadata is correct", async () => {
    const signal = await generateDescription({
      prTitle: "fix",
      prBody: "",
      diff: simpleDiff,
      llm: makeLLM(validResponse),
    });
    expect(signal.id).toBe("description-generator");
    expect(signal.name).toBe("Description Generator");
    expect(signal.requiresLLM).toBe(true);
    expect(signal.score).toBe(100);
    expect(signal.passed).toBe(true);
  });
});
