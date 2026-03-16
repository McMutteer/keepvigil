import { describe, it, expect, vi } from "vitest";
import { analyzeGaps } from "../services/gap-analyzer.js";
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

const SAMPLE_DIFF = `diff --git a/src/auth.ts b/src/auth.ts
+++ b/src/auth.ts
@@ -1,3 +1,5 @@
+const validateToken = (token) => { /* new */ };
+export { validateToken };`;

const items = [makeItem("tp-0", "npm run build")];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("analyzeGaps", () => {
  describe("scoring", () => {
    it("no gaps → score 100, passed true", async () => {
      const llm = makeLLM(JSON.stringify({ gaps: [] }));
      const signal = await analyzeGaps({ diff: SAMPLE_DIFF, classifiedItems: items, llm });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].status).toBe("pass");
    });

    it("1 critical gap → score 75, passed false", async () => {
      const llm = makeLLM(JSON.stringify({
        gaps: [{ file: "src/auth.ts", area: "JWT validation", severity: "critical", suggestion: "Add token test" }],
      }));
      const signal = await analyzeGaps({ diff: SAMPLE_DIFF, classifiedItems: items, llm });
      expect(signal.score).toBe(75);
      expect(signal.passed).toBe(false);
    });

    it("1 high gap → score 85, passed false", async () => {
      const llm = makeLLM(JSON.stringify({
        gaps: [{ file: "src/db.ts", area: "data mutation", severity: "high", suggestion: "Test insert" }],
      }));
      const signal = await analyzeGaps({ diff: SAMPLE_DIFF, classifiedItems: items, llm });
      expect(signal.score).toBe(85);
      expect(signal.passed).toBe(false);
    });

    it("2 medium + 1 low gaps → score 88, passed true", async () => {
      const llm = makeLLM(JSON.stringify({
        gaps: [
          { file: "src/ui.ts", area: "button style", severity: "medium", suggestion: "" },
          { file: "src/form.ts", area: "label text", severity: "medium", suggestion: "" },
          { file: "README.md", area: "docs update", severity: "low", suggestion: "" },
        ],
      }));
      const signal = await analyzeGaps({ diff: SAMPLE_DIFF, classifiedItems: items, llm });
      // 100 - (5+5+2) = 88
      expect(signal.score).toBe(88);
      expect(signal.passed).toBe(true);
    });

    it("mixed: 1 critical + 1 medium + 1 low → score 68, passed false", async () => {
      const llm = makeLLM(JSON.stringify({
        gaps: [
          { file: "src/auth.ts", area: "auth", severity: "critical", suggestion: "" },
          { file: "src/ui.ts", area: "display", severity: "medium", suggestion: "" },
          { file: "config.ts", area: "config", severity: "low", suggestion: "" },
        ],
      }));
      const signal = await analyzeGaps({ diff: SAMPLE_DIFF, classifiedItems: items, llm });
      // 100 - (25+5+2) = 68
      expect(signal.score).toBe(68);
      expect(signal.passed).toBe(false);
    });

    it("many gaps floor score at 0", async () => {
      const gaps = Array.from({ length: 5 }, (_, i) => ({
        file: `src/file${i}.ts`, area: "critical area", severity: "critical", suggestion: "",
      }));
      const llm = makeLLM(JSON.stringify({ gaps }));
      const signal = await analyzeGaps({ diff: SAMPLE_DIFF, classifiedItems: items, llm });
      // 100 - (25*5) = -25 → floored to 0
      expect(signal.score).toBe(0);
      expect(signal.passed).toBe(false);
    });
  });

  describe("details", () => {
    it("critical/high gaps have fail status", async () => {
      const llm = makeLLM(JSON.stringify({
        gaps: [{ file: "src/auth.ts", area: "auth", severity: "critical", suggestion: "Fix" }],
      }));
      const signal = await analyzeGaps({ diff: SAMPLE_DIFF, classifiedItems: items, llm });
      expect(signal.details[0].status).toBe("fail");
      expect(signal.details[0].label).toContain("CRITICAL");
    });

    it("medium/low gaps have warn status", async () => {
      const llm = makeLLM(JSON.stringify({
        gaps: [{ file: "src/ui.ts", area: "style", severity: "medium", suggestion: "" }],
      }));
      const signal = await analyzeGaps({ diff: SAMPLE_DIFF, classifiedItems: items, llm });
      expect(signal.details[0].status).toBe("warn");
      expect(signal.details[0].label).toContain("MEDIUM");
    });

    it("includes suggestion in message", async () => {
      const llm = makeLLM(JSON.stringify({
        gaps: [{ file: "src/auth.ts", area: "auth", severity: "high", suggestion: "Add token expiry test" }],
      }));
      const signal = await analyzeGaps({ diff: SAMPLE_DIFF, classifiedItems: items, llm });
      expect(signal.details[0].message).toContain("Add token expiry test");
    });
  });

  describe("error handling", () => {
    it("LLM throws → neutral signal (score 100, skip)", async () => {
      const signal = await analyzeGaps({ diff: SAMPLE_DIFF, classifiedItems: items, llm: makeLLM(new Error("timeout")) });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].status).toBe("skip");
    });

    it("LLM returns invalid JSON → neutral signal", async () => {
      const signal = await analyzeGaps({ diff: SAMPLE_DIFF, classifiedItems: items, llm: makeLLM("not json") });
      expect(signal.score).toBe(100);
      expect(signal.details[0].status).toBe("skip");
    });

    it("empty diff → neutral signal", async () => {
      const signal = await analyzeGaps({ diff: "", classifiedItems: items, llm: makeLLM("unused") });
      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("Empty diff");
    });

    it("empty classified items → neutral signal", async () => {
      const signal = await analyzeGaps({ diff: SAMPLE_DIFF, classifiedItems: [], llm: makeLLM("unused") });
      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("No test plan items");
    });

    it("handles fenced JSON code blocks", async () => {
      const llm = makeLLM('```json\n{"gaps":[]}\n```');
      const signal = await analyzeGaps({ diff: SAMPLE_DIFF, classifiedItems: items, llm });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
    });
  });

  describe("signal metadata", () => {
    it("has correct id", async () => {
      const signal = await analyzeGaps({ diff: "", classifiedItems: [], llm: makeLLM("") });
      expect(signal.id).toBe("gap-analyzer");
    });

    it("has correct name", async () => {
      const signal = await analyzeGaps({ diff: "", classifiedItems: [], llm: makeLLM("") });
      expect(signal.name).toBe("Gap Analysis");
    });

    it("requires LLM", async () => {
      const signal = await analyzeGaps({ diff: "", classifiedItems: [], llm: makeLLM("") });
      expect(signal.requiresLLM).toBe(true);
    });

    it("has weight 5", async () => {
      const signal = await analyzeGaps({ diff: "", classifiedItems: [], llm: makeLLM("") });
      expect(signal.weight).toBe(5);
    });
  });
});
