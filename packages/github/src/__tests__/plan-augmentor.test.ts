import { describe, it, expect, vi } from "vitest";
import { augmentPlan } from "../services/plan-augmentor.js";
import type { ClassifiedItem, LLMClient } from "@vigil/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(id: string, text: string, codeBlocks: string[] = []): ClassifiedItem {
  return {
    item: { id, text, checked: false, raw: text, indent: 0, hints: { isManual: false, codeBlocks, urls: [] } },
    confidence: "HIGH",
    executorType: "assertion",
    category: "assertion",
    reasoning: "test",
  };
}

function makeLLM(responses: (string | Error)[]): LLMClient {
  let callIndex = 0;
  return {
    model: "test-model",
    provider: "groq",
    chat: vi.fn().mockImplementation(() => {
      const resp = responses[callIndex] ?? responses[responses.length - 1];
      callIndex++;
      if (resp instanceof Error) return Promise.reject(resp);
      return Promise.resolve(resp);
    }),
  };
}

const SAMPLE_DIFF = `diff --git a/src/routes/targets.ts b/src/routes/targets.ts
--- a/src/routes/targets.ts
+++ b/src/routes/targets.ts
@@ -50,6 +50,20 @@
+router.patch("/:id", async (req, res) => {
+  const data = updateTargetSchema.parse(req.body);
+  if (data.value) {
+    data.value = normalizeTargetValue(data.type || "DOMAIN", data.value);
+  }
+  const target = await prisma.target.update({ where: { id: req.params.id } });
+  res.json(target);
+});`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("augmentPlan", () => {
  describe("skips gracefully", () => {
    it("returns neutral on empty diff", async () => {
      const signal = await augmentPlan({
        diff: "",
        classifiedItems: [makeItem("tp-0", "test")],
        llm: makeLLM(["unused"]),
        repoPath: "/tmp/repo",
      });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].status).toBe("skip");
    });

    it("returns neutral on empty test plan", async () => {
      const signal = await augmentPlan({
        diff: SAMPLE_DIFF,
        classifiedItems: [],
        llm: makeLLM(["unused"]),
        repoPath: "/tmp/repo",
      });
      expect(signal.details[0].message).toContain("No test plan");
    });

    it("returns neutral when no repo available", async () => {
      const signal = await augmentPlan({
        diff: SAMPLE_DIFF,
        classifiedItems: [makeItem("tp-0", "test")],
        llm: makeLLM(["unused"]),
        repoPath: null,
      });
      expect(signal.details[0].message).toContain("No repo");
    });

    it("returns neutral on LLM generation failure", async () => {
      const signal = await augmentPlan({
        diff: SAMPLE_DIFF,
        classifiedItems: [makeItem("tp-0", "test")],
        llm: makeLLM([new Error("API timeout")]),
        repoPath: "/tmp/repo",
      });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].status).toBe("skip");
    });

    it("returns neutral on invalid LLM response", async () => {
      const signal = await augmentPlan({
        diff: SAMPLE_DIFF,
        classifiedItems: [makeItem("tp-0", "test")],
        llm: makeLLM(["this is not json"]),
        repoPath: "/tmp/repo",
      });
      expect(signal.details[0].status).toBe("skip");
    });
  });

  describe("generation + verification", () => {
    it("all augmented items pass → score 100", async () => {
      const generateResponse = JSON.stringify({
        items: [
          { file: "package.json", assertion: "Has name field", category: "logic", severity: "medium" },
        ],
      });
      const verifyResponse = JSON.stringify({
        verified: true,
        reasoning: "package.json has a name field",
      });

      // Use process.cwd() as repoPath so package.json exists
      const signal = await augmentPlan({
        diff: SAMPLE_DIFF,
        classifiedItems: [makeItem("tp-0", "test")],
        llm: makeLLM([generateResponse, verifyResponse]),
        repoPath: process.cwd(),
      });

      expect(signal.id).toBe("plan-augmentor");
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details.filter((d) => d.status === "pass")).toHaveLength(1);
    });

    it("augmented item fails → score 0, high severity fails passed", async () => {
      const generateResponse = JSON.stringify({
        items: [
          { file: "package.json", assertion: "Has field nonExistentField12345", category: "contract", severity: "high" },
        ],
      });
      const verifyResponse = JSON.stringify({
        verified: false,
        reasoning: "No such field exists",
      });

      const signal = await augmentPlan({
        diff: SAMPLE_DIFF,
        classifiedItems: [makeItem("tp-0", "test")],
        llm: makeLLM([generateResponse, verifyResponse]),
        repoPath: process.cwd(),
      });

      expect(signal.score).toBe(0);
      expect(signal.passed).toBe(false);
      expect(signal.details.filter((d) => d.status === "fail")).toHaveLength(1);
    });

    it("file not found → skip detail", async () => {
      const generateResponse = JSON.stringify({
        items: [
          { file: "nonexistent/file.ts", assertion: "Has something", category: "logic", severity: "medium" },
        ],
      });

      const signal = await augmentPlan({
        diff: SAMPLE_DIFF,
        classifiedItems: [makeItem("tp-0", "test")],
        llm: makeLLM([generateResponse]),
        repoPath: process.cwd(),
      });

      expect(signal.details.filter((d) => d.status === "skip")).toHaveLength(1);
    });
  });

  describe("signal metadata", () => {
    it("has correct signal id and requiresLLM", async () => {
      const signal = await augmentPlan({
        diff: "",
        classifiedItems: [makeItem("tp-0", "test")],
        llm: makeLLM(["unused"]),
        repoPath: "/tmp/repo",
      });
      expect(signal.id).toBe("plan-augmentor");
      expect(signal.name).toBe("Plan Augmentation");
      expect(signal.requiresLLM).toBe(true);
    });
  });
});
