import { describe, it, expect, vi } from "vitest";
import { checkContracts } from "../services/contract-checker.js";
import type { LLMClient } from "@vigil/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLLM(response: string | Error): LLMClient {
  return {
    model: "test-model",
    provider: "groq",
    chat: response instanceof Error
      ? vi.fn().mockRejectedValue(response)
      : vi.fn().mockResolvedValue(response),
  };
}

/** Diff that touches both API route and frontend page */
const CROSS_BOUNDARY_DIFF = `diff --git a/packages/api/src/routes/reports.ts b/packages/api/src/routes/reports.ts
--- /dev/null
+++ b/packages/api/src/routes/reports.ts
@@ -0,0 +1,10 @@
+router.get("/summary", async (req, res) => {
+  res.json({ totals: { targets: 5, scans: 12 } });
+});
diff --git a/packages/web/app/dashboard/reports/page.tsx b/packages/web/app/dashboard/reports/page.tsx
--- /dev/null
+++ b/packages/web/app/dashboard/reports/page.tsx
@@ -0,0 +1,10 @@
+interface ReportSummary { totalTargets: number; totalScans: number; }
+const data = await fetch("/api/reports/summary");
`;

/** Diff that only touches backend */
const BACKEND_ONLY_DIFF = `diff --git a/packages/api/src/routes/targets.ts b/packages/api/src/routes/targets.ts
--- a/packages/api/src/routes/targets.ts
+++ b/packages/api/src/routes/targets.ts
@@ -1,3 +1,5 @@
+router.patch("/:id", async (req, res) => {
+  res.json({ updated: true });
+});`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("checkContracts", () => {
  describe("skips gracefully", () => {
    it("returns neutral on empty diff", async () => {
      const signal = await checkContracts({ diff: "", llm: makeLLM("unused") });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].status).toBe("skip");
    });

    it("skips when PR only touches backend files", async () => {
      const signal = await checkContracts({ diff: BACKEND_ONLY_DIFF, llm: makeLLM("unused") });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].message).toContain("does not touch both");
    });

    it("returns neutral on LLM failure", async () => {
      const signal = await checkContracts({
        diff: CROSS_BOUNDARY_DIFF,
        llm: makeLLM(new Error("API timeout")),
      });
      expect(signal.score).toBe(100);
      expect(signal.details[0].status).toBe("skip");
    });

    it("returns neutral on invalid LLM response", async () => {
      const signal = await checkContracts({
        diff: CROSS_BOUNDARY_DIFF,
        llm: makeLLM("not json at all"),
      });
      expect(signal.details[0].status).toBe("skip");
    });
  });

  describe("contract analysis", () => {
    it("all contracts compatible → score 100, passed true", async () => {
      const response = JSON.stringify({
        contracts: [
          {
            producer: "packages/api/src/routes/reports.ts",
            consumer: "packages/web/app/dashboard/reports/page.tsx",
            endpoint: "GET /summary",
            compatible: true,
            issue: "",
          },
        ],
      });

      const signal = await checkContracts({ diff: CROSS_BOUNDARY_DIFF, llm: makeLLM(response) });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details.filter((d) => d.status === "pass")).toHaveLength(1);
    });

    it("incompatible contract → score 0, passed false", async () => {
      const response = JSON.stringify({
        contracts: [
          {
            producer: "packages/api/src/routes/reports.ts",
            consumer: "packages/web/app/dashboard/reports/page.tsx",
            endpoint: "GET /summary",
            compatible: false,
            issue: "Backend returns { totals: { targets: N } } but frontend expects { totalTargets: N }",
          },
        ],
      });

      const signal = await checkContracts({ diff: CROSS_BOUNDARY_DIFF, llm: makeLLM(response) });
      expect(signal.score).toBe(0);
      expect(signal.passed).toBe(false);
      expect(signal.details.filter((d) => d.status === "fail")).toHaveLength(1);
      expect(signal.details[0].message).toContain("totals");
    });

    it("mixed contracts → partial score", async () => {
      const response = JSON.stringify({
        contracts: [
          { producer: "a.ts", consumer: "b.tsx", endpoint: "GET /a", compatible: true, issue: "" },
          { producer: "c.ts", consumer: "d.tsx", endpoint: "GET /b", compatible: false, issue: "mismatch" },
        ],
      });

      const signal = await checkContracts({ diff: CROSS_BOUNDARY_DIFF, llm: makeLLM(response) });
      expect(signal.score).toBe(50); // 1/2 compatible
      expect(signal.passed).toBe(false);
    });

    it("empty contracts array → score 100", async () => {
      const response = JSON.stringify({ contracts: [] });
      const signal = await checkContracts({ diff: CROSS_BOUNDARY_DIFF, llm: makeLLM(response) });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
    });
  });

  describe("signal metadata", () => {
    it("has correct signal id and requiresLLM", async () => {
      const signal = await checkContracts({ diff: "", llm: makeLLM("unused") });
      expect(signal.id).toBe("contract-checker");
      expect(signal.name).toBe("Contract Check");
      expect(signal.requiresLLM).toBe(true);
    });
  });
});
