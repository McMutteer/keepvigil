import { describe, it, expect, vi } from "vitest";
import { analyzeDiff } from "../services/diff-analyzer.js";
import type { ClassifiedItem, LLMClient } from "@vigil/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(id: string, text: string): ClassifiedItem {
  return {
    item: { id, text, checked: false, raw: text, indent: 0, hints: { isManual: false, codeBlocks: [], urls: [] } },
    confidence: "HIGH",
    executorType: "shell",
    category: "build",
    reasoning: "test",
  };
}

function makeLLM(response: string | Error): LLMClient {
  return {
    model: "test-model",
    provider: "groq",
    chat: response instanceof Error
      ? vi.fn().mockRejectedValue(response)
      : vi.fn().mockResolvedValue(response),
  };
}

const SAMPLE_DIFF = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,5 @@
 const x = 1;
+const y = 2;
+const z = 3;
 export default x;`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("analyzeDiff", () => {
  describe("valid LLM responses", () => {
    it("all items covered, no uncovered changes → score 100, passed true", async () => {
      const items = [makeItem("tp-0", "npm run build"), makeItem("tp-1", "npm test")];
      const llmResponse = JSON.stringify({
        items: [
          { id: "tp-0", covered: true, reasoning: "Build matches package changes" },
          { id: "tp-1", covered: true, reasoning: "Tests match code changes" },
        ],
        uncoveredChanges: [],
      });

      const signal = await analyzeDiff({ diff: SAMPLE_DIFF, classifiedItems: items, llm: makeLLM(llmResponse) });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details.filter((d) => d.status === "pass")).toHaveLength(2);
    });

    it("some items not covered + uncovered changes → reduced score", async () => {
      const items = [makeItem("tp-0", "npm run build"), makeItem("tp-1", "npm test")];
      const llmResponse = JSON.stringify({
        items: [
          { id: "tp-0", covered: true, reasoning: "Matches" },
          { id: "tp-1", covered: false, reasoning: "No test changes in diff" },
        ],
        uncoveredChanges: ["New auth middleware not in test plan"],
      });

      const signal = await analyzeDiff({ diff: SAMPLE_DIFF, classifiedItems: items, llm: makeLLM(llmResponse) });
      // 50% covered (1/2) = 50, minus 10 penalty = 40
      expect(signal.score).toBe(40);
      expect(signal.passed).toBe(false); // <70% covered
    });

    it("80% covered, 1 uncovered change → score 70, passed true", async () => {
      const items = Array.from({ length: 5 }, (_, i) => makeItem(`tp-${i}`, `item ${i}`));
      const llmResponse = JSON.stringify({
        items: [
          { id: "tp-0", covered: true, reasoning: "ok" },
          { id: "tp-1", covered: true, reasoning: "ok" },
          { id: "tp-2", covered: true, reasoning: "ok" },
          { id: "tp-3", covered: true, reasoning: "ok" },
          { id: "tp-4", covered: false, reasoning: "not related" },
        ],
        uncoveredChanges: ["Minor change"],
      });

      const signal = await analyzeDiff({ diff: SAMPLE_DIFF, classifiedItems: items, llm: makeLLM(llmResponse) });
      // 80% = 80, minus 10 = 70
      expect(signal.score).toBe(70);
      expect(signal.passed).toBe(true); // ≥70% AND ≤2 uncovered
    });

    it("50% covered, 3 uncovered changes → score 20", async () => {
      const items = [makeItem("tp-0", "build"), makeItem("tp-1", "test")];
      const llmResponse = JSON.stringify({
        items: [
          { id: "tp-0", covered: true, reasoning: "ok" },
          { id: "tp-1", covered: false, reasoning: "no" },
        ],
        uncoveredChanges: ["change 1", "change 2", "change 3"],
      });

      const signal = await analyzeDiff({ diff: SAMPLE_DIFF, classifiedItems: items, llm: makeLLM(llmResponse) });
      // 50% = 50, minus 30 = 20
      expect(signal.score).toBe(20);
      expect(signal.passed).toBe(false);
    });

    it("handles fenced JSON code blocks in response", async () => {
      const items = [makeItem("tp-0", "build")];
      const llmResponse = '```json\n{"items":[{"id":"tp-0","covered":true,"reasoning":"ok"}],"uncoveredChanges":[]}\n```';

      const signal = await analyzeDiff({ diff: SAMPLE_DIFF, classifiedItems: items, llm: makeLLM(llmResponse) });
      expect(signal.score).toBe(100);
    });

    it("items not in LLM response get warn status", async () => {
      const items = [makeItem("tp-0", "build"), makeItem("tp-1", "test")];
      const llmResponse = JSON.stringify({
        items: [{ id: "tp-0", covered: true, reasoning: "ok" }],
        uncoveredChanges: [],
      });

      const signal = await analyzeDiff({ diff: SAMPLE_DIFF, classifiedItems: items, llm: makeLLM(llmResponse) });
      expect(signal.details[1].status).toBe("warn");
      expect(signal.details[1].message).toContain("Not assessed");
    });

    it("uncovered changes appear as fail details", async () => {
      const items = [makeItem("tp-0", "build")];
      const llmResponse = JSON.stringify({
        items: [{ id: "tp-0", covered: true, reasoning: "ok" }],
        uncoveredChanges: ["Auth middleware added without test"],
      });

      const signal = await analyzeDiff({ diff: SAMPLE_DIFF, classifiedItems: items, llm: makeLLM(llmResponse) });
      const failDetails = signal.details.filter((d) => d.status === "fail");
      expect(failDetails).toHaveLength(1);
      expect(failDetails[0].message).toContain("Auth middleware");
    });
  });

  describe("error handling", () => {
    it("LLM throws → neutral signal (score 100, skip)", async () => {
      const items = [makeItem("tp-0", "build")];
      const signal = await analyzeDiff({ diff: SAMPLE_DIFF, classifiedItems: items, llm: makeLLM(new Error("timeout")) });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].status).toBe("skip");
      expect(signal.details[0].message).toContain("unavailable");
    });

    it("LLM returns invalid JSON → neutral signal", async () => {
      const items = [makeItem("tp-0", "build")];
      const signal = await analyzeDiff({ diff: SAMPLE_DIFF, classifiedItems: items, llm: makeLLM("not json at all") });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].status).toBe("skip");
    });

    it("empty diff → neutral signal", async () => {
      const items = [makeItem("tp-0", "build")];
      const signal = await analyzeDiff({ diff: "", classifiedItems: items, llm: makeLLM("unused") });
      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("Empty diff");
    });

    it("empty classified items → neutral signal", async () => {
      const signal = await analyzeDiff({ diff: SAMPLE_DIFF, classifiedItems: [], llm: makeLLM("unused") });
      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("No test plan items");
    });
  });

  describe("signal metadata", () => {
    it("has correct id", async () => {
      const signal = await analyzeDiff({ diff: "", classifiedItems: [], llm: makeLLM("") });
      expect(signal.id).toBe("diff-analyzer");
    });

    it("has correct name", async () => {
      const signal = await analyzeDiff({ diff: "", classifiedItems: [], llm: makeLLM("") });
      expect(signal.name).toBe("Diff vs Claims");
    });

    it("requires LLM", async () => {
      const signal = await analyzeDiff({ diff: "", classifiedItems: [], llm: makeLLM("") });
      expect(signal.requiresLLM).toBe(true);
    });

    it("has weight 10", async () => {
      const signal = await analyzeDiff({ diff: "", classifiedItems: [], llm: makeLLM("") });
      expect(signal.weight).toBe(10);
    });
  });
});
