import { describe, it, expect, vi } from "vitest";
import { detectUndocumentedChanges } from "../services/undocumented-changes.js";
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
   }
diff --git a/.env.example b/.env.example
--- a/.env.example
+++ b/.env.example
@@ -5,3 +5,4 @@
 DATABASE_URL=postgres://localhost:5432/app
+REDIS_URL=redis://localhost:6379`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("detectUndocumentedChanges", () => {
  describe("happy path", () => {
    it("detects undocumented changes", async () => {
      const llm = makeLLM(JSON.stringify({
        findings: [
          { category: "dependency", file: "package.json", description: "Added ioredis dependency", severity: "medium", reasoning: "Not mentioned in PR" },
          { category: "env-var", file: ".env.example", description: "REDIS_URL added", severity: "medium", reasoning: "Not documented" },
        ],
      }));

      const signal = await detectUndocumentedChanges({
        prTitle: "feat: add rate limiting",
        prBody: "Adds rate limiting to API endpoints.",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.id).toBe("undocumented-changes");
      expect(signal.name).toBe("Undocumented Changes");
      expect(signal.requiresLLM).toBe(true);
      expect(signal.details).toHaveLength(2);
      expect(signal.details[0].status).toBe("warn");
    });

    it("returns clean signal when no findings", async () => {
      const llm = makeLLM(JSON.stringify({ findings: [] }));

      const signal = await detectUndocumentedChanges({
        prTitle: "feat: add rate limiting",
        prBody: "Adds rate limiting with Redis backend and REDIS_URL config.",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].message).toContain("All significant changes are documented");
    });
  });

  describe("scoring", () => {
    it("penalizes high severity at -15", async () => {
      const llm = makeLLM(JSON.stringify({
        findings: [
          { category: "auth", file: "auth.ts", description: "Auth bypass", severity: "high", reasoning: "Security" },
        ],
      }));

      const signal = await detectUndocumentedChanges({
        prTitle: "fix: typo", prBody: "", diff: SAMPLE_DIFF, llm,
      });

      expect(signal.score).toBe(85); // 100 - 15
      expect(signal.passed).toBe(false); // high severity = not passed
    });

    it("penalizes medium severity at -8", async () => {
      const llm = makeLLM(JSON.stringify({
        findings: [
          { category: "dependency", file: "package.json", description: "New dep", severity: "medium", reasoning: "n/a" },
        ],
      }));

      const signal = await detectUndocumentedChanges({
        prTitle: "fix: typo", prBody: "", diff: SAMPLE_DIFF, llm,
      });

      expect(signal.score).toBe(92); // 100 - 8
      expect(signal.passed).toBe(true); // no high, penalty < 40
    });

    it("penalizes low severity at -3", async () => {
      const llm = makeLLM(JSON.stringify({
        findings: [
          { category: "config", file: "tsconfig.json", description: "tsconfig change", severity: "low", reasoning: "n/a" },
        ],
      }));

      const signal = await detectUndocumentedChanges({
        prTitle: "fix: typo", prBody: "", diff: SAMPLE_DIFF, llm,
      });

      expect(signal.score).toBe(97); // 100 - 3
      expect(signal.passed).toBe(true);
    });

    it("fails when total penalty >= 40", async () => {
      const llm = makeLLM(JSON.stringify({
        findings: [
          { category: "dependency", file: "a", description: "dep1", severity: "medium", reasoning: "" },
          { category: "dependency", file: "b", description: "dep2", severity: "medium", reasoning: "" },
          { category: "dependency", file: "c", description: "dep3", severity: "medium", reasoning: "" },
          { category: "dependency", file: "d", description: "dep4", severity: "medium", reasoning: "" },
          { category: "dependency", file: "e", description: "dep5", severity: "medium", reasoning: "" },
        ],
      }));

      const signal = await detectUndocumentedChanges({
        prTitle: "fix: typo", prBody: "", diff: SAMPLE_DIFF, llm,
      });

      expect(signal.score).toBe(60); // 100 - 5*8
      expect(signal.passed).toBe(false); // 40 >= 40
    });

    it("score floors at 0", async () => {
      const llm = makeLLM(JSON.stringify({
        findings: Array.from({ length: 10 }, (_, i) => ({
          category: "auth", file: `f${i}`, description: `finding ${i}`, severity: "high", reasoning: "",
        })),
      }));

      const signal = await detectUndocumentedChanges({
        prTitle: "fix: typo", prBody: "", diff: SAMPLE_DIFF, llm,
      });

      expect(signal.score).toBe(0); // 100 - 10*15 = -50 → clamped to 0
    });
  });

  describe("edge cases", () => {
    it("returns neutral signal for empty diff", async () => {
      const llm = makeLLM("should not be called");

      const signal = await detectUndocumentedChanges({
        prTitle: "feat: add something",
        prBody: "Description.",
        diff: "",
        llm,
      });

      expect(signal.score).toBe(100);
      expect(signal.details[0].status).toBe("skip");
      expect(llm.chat).not.toHaveBeenCalled();
    });

    it("handles LLM failure gracefully", async () => {
      const llm = makeFailingLLM();

      const signal = await detectUndocumentedChanges({
        prTitle: "feat: add feature",
        prBody: "Description.",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("LLM analysis unavailable");
    });

    it("handles malformed LLM response", async () => {
      const llm = makeLLM("not valid json");

      const signal = await detectUndocumentedChanges({
        prTitle: "feat: add feature",
        prBody: "",
        diff: SAMPLE_DIFF,
        llm,
      });

      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("LLM returned invalid response");
    });

    it("handles LLM response in code fence", async () => {
      const llm = makeLLM("```json\n" + JSON.stringify({
        findings: [
          { category: "dependency", file: "package.json", description: "New dep", severity: "low", reasoning: "n/a" },
        ],
      }) + "\n```");

      const signal = await detectUndocumentedChanges({
        prTitle: "feat: add feature", prBody: "", diff: SAMPLE_DIFF, llm,
      });

      expect(signal.details).toHaveLength(1);
    });

    it("defaults unknown category to other", async () => {
      const llm = makeLLM(JSON.stringify({
        findings: [
          { category: "unknown-cat", file: "x.ts", description: "something", severity: "low", reasoning: "" },
        ],
      }));

      const signal = await detectUndocumentedChanges({
        prTitle: "feat", prBody: "", diff: SAMPLE_DIFF, llm,
      });

      expect(signal.details[0].label).toContain("other");
    });

    it("defaults unknown severity to medium", async () => {
      const llm = makeLLM(JSON.stringify({
        findings: [
          { category: "dependency", file: "x", description: "dep", severity: "critical", reasoning: "" },
        ],
      }));

      const signal = await detectUndocumentedChanges({
        prTitle: "feat", prBody: "", diff: SAMPLE_DIFF, llm,
      });

      // Default to medium = -8 penalty
      expect(signal.score).toBe(92);
    });

    it("skips findings without description", async () => {
      const llm = makeLLM(JSON.stringify({
        findings: [
          { category: "dependency", file: "x", severity: "low" },
          { category: "dependency", file: "y", description: "valid", severity: "low", reasoning: "" },
        ],
      }));

      const signal = await detectUndocumentedChanges({
        prTitle: "feat", prBody: "", diff: SAMPLE_DIFF, llm,
      });

      expect(signal.details).toHaveLength(1);
    });
  });

  describe("signal metadata", () => {
    it("has correct signal ID", async () => {
      const llm = makeLLM(JSON.stringify({ findings: [] }));
      const signal = await detectUndocumentedChanges({ prTitle: "x", prBody: "", diff: SAMPLE_DIFF, llm });
      expect(signal.id).toBe("undocumented-changes");
    });

    it("has weight 10", async () => {
      const llm = makeLLM(JSON.stringify({ findings: [] }));
      const signal = await detectUndocumentedChanges({ prTitle: "x", prBody: "", diff: SAMPLE_DIFF, llm });
      expect(signal.weight).toBe(10);
    });

    it("requires LLM", async () => {
      const llm = makeLLM(JSON.stringify({ findings: [] }));
      const signal = await detectUndocumentedChanges({ prTitle: "x", prBody: "", diff: SAMPLE_DIFF, llm });
      expect(signal.requiresLLM).toBe(true);
    });
  });

  describe("trivial finding filter", () => {
    it("filters out low-severity version bump findings", async () => {
      const llm = makeLLM(JSON.stringify({
        findings: [
          { category: "other", file: "comment-builder.ts", description: "Bumped footer version string from v0.1.0 to v0.2.0", severity: "low" },
        ],
      }));
      const signal = await detectUndocumentedChanges({ prTitle: "feat: stuff", prBody: "", diff: SAMPLE_DIFF, llm });
      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("documented");
    });

    it("filters out low-severity label/text change findings", async () => {
      const llm = makeLLM(JSON.stringify({
        findings: [
          { category: "config", file: "navbar.tsx", description: "Label text changed from 'Authentication' to 'auth'", severity: "low" },
        ],
      }));
      const signal = await detectUndocumentedChanges({ prTitle: "feat: stuff", prBody: "", diff: SAMPLE_DIFF, llm });
      expect(signal.score).toBe(100);
    });

    it("does NOT filter medium-severity version changes", async () => {
      const llm = makeLLM(JSON.stringify({
        findings: [
          { category: "other", file: "package.json", description: "Bumped version from 1.0 to 2.0", severity: "medium" },
        ],
      }));
      const signal = await detectUndocumentedChanges({ prTitle: "feat: stuff", prBody: "", diff: SAMPLE_DIFF, llm });
      expect(signal.score).toBe(92); // medium = -8 penalty
    });

    it("does NOT filter high-severity findings regardless of pattern", async () => {
      const llm = makeLLM(JSON.stringify({
        findings: [
          { category: "auth", file: "auth.ts", description: "Label changed on auth endpoint", severity: "high" },
        ],
      }));
      const signal = await detectUndocumentedChanges({ prTitle: "feat: stuff", prBody: "", diff: SAMPLE_DIFF, llm });
      expect(signal.score).toBe(85); // high = -15 penalty
      expect(signal.passed).toBe(false);
    });
  });
});
