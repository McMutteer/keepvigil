import { describe, it, expect, vi } from "vitest";
import { verifyClaims } from "../services/claims-verifier.js";
import type { LLMClient } from "@vigil/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLLM(response: string): LLMClient {
  return {
    model: "test",
    provider: "groq",
    chat: vi.fn().mockResolvedValue(response),
  };
}

function makeFailingLLM(): LLMClient {
  return {
    model: "test",
    provider: "groq",
    chat: vi.fn().mockRejectedValue(new Error("LLM timeout")),
  };
}

const SAMPLE_DIFF = `diff --git a/src/rate-limiter.ts b/src/rate-limiter.ts
new file mode 100644
--- /dev/null
+++ b/src/rate-limiter.ts
@@ -0,0 +1,20 @@
+import rateLimit from "express-rate-limit";
+export const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -10,6 +10,7 @@
   "dependencies": {
+    "express-rate-limit": "^7.0.0",
+    "ioredis": "^5.0.0"
   }`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("verifyClaims", () => {
  describe("happy path", () => {
    it("verifies claims from PR title and body", async () => {
      const llm = makeLLM(JSON.stringify({
        claims: [
          { text: "Add rate limiting to API endpoints", source: "title", verdict: "verified", evidence: "rate-limiter.ts created" },
          { text: "Add tests for rate limiter", source: "body", verdict: "unverified", evidence: "No test file found in diff" },
        ],
      }));

      const signal = await verifyClaims({
        prTitle: "feat: add rate limiting",
        prBody: "Adds rate limiting and tests for it.",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.id).toBe("claims-verifier");
      expect(signal.name).toBe("Claims Verifier");
      expect(signal.requiresLLM).toBe(true);
      expect(signal.details).toHaveLength(2);
      expect(signal.details[0].status).toBe("pass");
      expect(signal.details[1].status).toBe("warn");
    });

    it("returns score 100 when all claims verified", async () => {
      const llm = makeLLM(JSON.stringify({
        claims: [
          { text: "Add rate limiting", source: "title", verdict: "verified", evidence: "rate-limiter.ts created" },
        ],
      }));

      const signal = await verifyClaims({
        prTitle: "feat: add rate limiting",
        prBody: "",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
    });

    it("penalizes unverified claims (-10 each)", async () => {
      const llm = makeLLM(JSON.stringify({
        claims: [
          { text: "Add rate limiting", source: "title", verdict: "verified", evidence: "found" },
          { text: "Add tests", source: "body", verdict: "unverified", evidence: "not found" },
          { text: "Update docs", source: "body", verdict: "unverified", evidence: "not found" },
        ],
      }));

      const signal = await verifyClaims({
        prTitle: "feat: add rate limiting",
        prBody: "Adds tests and updates docs.",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.score).toBe(80); // 100 - 2*10
      expect(signal.passed).toBe(false); // only 1/3 verified < 50%
    });

    it("heavily penalizes contradicted claims (-25 each)", async () => {
      const llm = makeLLM(JSON.stringify({
        claims: [
          { text: "No breaking changes", source: "body", verdict: "contradicted", evidence: "API response field removed" },
        ],
      }));

      const signal = await verifyClaims({
        prTitle: "fix: minor update",
        prBody: "No breaking changes.",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.score).toBe(75); // 100 - 25
      expect(signal.passed).toBe(false); // contradictions always fail
    });
  });

  describe("scoring", () => {
    it("passed is true when no contradictions and >= 50% verified", async () => {
      const llm = makeLLM(JSON.stringify({
        claims: [
          { text: "A", source: "title", verdict: "verified", evidence: "yes" },
          { text: "B", source: "body", verdict: "verified", evidence: "yes" },
          { text: "C", source: "body", verdict: "unverified", evidence: "no" },
        ],
      }));

      const signal = await verifyClaims({
        prTitle: "feat: A",
        prBody: "Also B and C.",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.passed).toBe(true); // 2/3 verified > 50%, no contradictions
    });

    it("passed is false when any contradiction exists", async () => {
      const llm = makeLLM(JSON.stringify({
        claims: [
          { text: "A", source: "title", verdict: "verified", evidence: "yes" },
          { text: "B", source: "body", verdict: "contradicted", evidence: "opposite" },
        ],
      }));

      const signal = await verifyClaims({
        prTitle: "A",
        prBody: "B",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.passed).toBe(false);
    });

    it("score floors at 0", async () => {
      const llm = makeLLM(JSON.stringify({
        claims: [
          { text: "A", source: "title", verdict: "contradicted", evidence: "no" },
          { text: "B", source: "body", verdict: "contradicted", evidence: "no" },
          { text: "C", source: "body", verdict: "contradicted", evidence: "no" },
          { text: "D", source: "body", verdict: "contradicted", evidence: "no" },
          { text: "E", source: "body", verdict: "contradicted", evidence: "no" },
        ],
      }));

      const signal = await verifyClaims({
        prTitle: "A",
        prBody: "B C D E",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.score).toBe(0); // 100 - 5*25 = -25 → clamped to 0
    });
  });

  describe("edge cases", () => {
    it("returns neutral signal for empty diff", async () => {
      const llm = makeLLM("should not be called");

      const signal = await verifyClaims({
        prTitle: "feat: add something",
        prBody: "Adds something cool.",
        diff: "",
        llm,
      });

      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].status).toBe("skip");
      expect(llm.chat).not.toHaveBeenCalled();
    });

    it("returns neutral signal for empty title and body", async () => {
      const llm = makeLLM("should not be called");

      const signal = await verifyClaims({
        prTitle: "",
        prBody: "",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("No PR title or description");
    });

    it("returns neutral signal when no claims extracted", async () => {
      const llm = makeLLM(JSON.stringify({ claims: [] }));

      const signal = await verifyClaims({
        prTitle: "WIP",
        prBody: "",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("No verifiable claims");
    });

    it("handles LLM failure gracefully", async () => {
      const llm = makeFailingLLM();

      const signal = await verifyClaims({
        prTitle: "feat: add feature",
        prBody: "Description here.",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].message).toContain("LLM analysis unavailable");
    });

    it("handles malformed LLM response", async () => {
      const llm = makeLLM("This is not JSON at all");

      const signal = await verifyClaims({
        prTitle: "feat: add feature",
        prBody: "Description here.",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("LLM returned invalid response");
    });

    it("handles LLM response wrapped in code fence", async () => {
      const llm = makeLLM("```json\n" + JSON.stringify({
        claims: [
          { text: "Add feature", source: "title", verdict: "verified", evidence: "found" },
        ],
      }) + "\n```");

      const signal = await verifyClaims({
        prTitle: "feat: add feature",
        prBody: "",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.details).toHaveLength(1);
      expect(signal.details[0].status).toBe("pass");
    });
  });

  describe("signal metadata", () => {
    it("has correct signal ID", async () => {
      const llm = makeLLM(JSON.stringify({ claims: [] }));
      const signal = await verifyClaims({ prTitle: "x", prBody: "", diff: SAMPLE_DIFF, llm });
      expect(signal.id).toBe("claims-verifier");
    });

    it("has weight 15", async () => {
      const llm = makeLLM(JSON.stringify({ claims: [] }));
      const signal = await verifyClaims({ prTitle: "x", prBody: "", diff: SAMPLE_DIFF, llm });
      expect(signal.weight).toBe(15);
    });

    it("requires LLM", async () => {
      const llm = makeLLM(JSON.stringify({ claims: [] }));
      const signal = await verifyClaims({ prTitle: "x", prBody: "", diff: SAMPLE_DIFF, llm });
      expect(signal.requiresLLM).toBe(true);
    });
  });

  describe("input sanitization", () => {
    it("truncates claim text at word boundary", async () => {
      const longText = "A".repeat(300);
      const llm = makeLLM(JSON.stringify({
        claims: [
          { text: longText, source: "title", verdict: "verified", evidence: "found" },
        ],
      }));

      const signal = await verifyClaims({ prTitle: "x", prBody: "", diff: SAMPLE_DIFF, llm });
      // The detail label is truncated to ~120 chars with "..." suffix
      expect(signal.details[0].label.length).toBeLessThanOrEqual(124);
      expect(signal.details[0].label).toContain("...");
    });

    it("handles invalid verdict gracefully (skips claim)", async () => {
      const llm = makeLLM(JSON.stringify({
        claims: [
          { text: "Valid claim", source: "title", verdict: "verified", evidence: "yes" },
          { text: "Bad claim", source: "body", verdict: "invalid", evidence: "no" },
        ],
      }));

      const signal = await verifyClaims({ prTitle: "x", prBody: "", diff: SAMPLE_DIFF, llm });
      // Only the valid claim is included
      expect(signal.details).toHaveLength(1);
    });
  });
});
