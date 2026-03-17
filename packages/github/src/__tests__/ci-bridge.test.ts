import { describe, it, expect, vi } from "vitest";
import { collectCISignal } from "../services/ci-bridge.js";
import type { ClassifiedItem } from "@vigil/core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(text: string, codeBlocks: string[] = [], category = "build"): ClassifiedItem {
  return {
    item: {
      id: `tp-${Math.random().toString(36).slice(2, 6)}`,
      text,
      checked: false,
      raw: text,
      indent: 0,
      hints: { isManual: false, codeBlocks, urls: [] },
    },
    confidence: "DETERMINISTIC",
    executorType: "shell",
    category: category as ClassifiedItem["category"],
    reasoning: "test",
  };
}

function makeCheckRun(name: string, conclusion: string | null = "success", status = "completed") {
  return { name, status, conclusion, html_url: `https://github.com/org/repo/runs/123` };
}

function makeOctokit(checkRuns: ReturnType<typeof makeCheckRun>[], shouldThrow = false) {
  return {
    paginate: shouldThrow
      ? vi.fn().mockRejectedValue(new Error("API error"))
      : vi.fn().mockResolvedValue(checkRuns),
    rest: {
      checks: {
        listForRef: vi.fn(),
      },
    },
  } as unknown as Parameters<typeof collectCISignal>[0]["octokit"];
}

const BASE_OPTIONS = { owner: "org", repo: "repo", headSha: "abc123" };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("collectCISignal", () => {
  describe("fuzzy matching", () => {
    it("matches item with code block against check run name", async () => {
      const items = [makeItem("Run the build", ["npm run build"])];
      const checkRuns = [makeCheckRun("build"), makeCheckRun("lint")];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.passed).toBe(true);
      expect(signal.score).toBe(100);
      expect(signal.details[0].status).toBe("pass");
    });

    it("matches against composite check run names (Build / build)", async () => {
      const items = [makeItem("Run build", ["npm run build"])];
      const checkRuns = [makeCheckRun("Build / build (ubuntu-latest)")];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.details[0].status).toBe("pass");
    });

    it("matches pytest against Test / pytest", async () => {
      const items = [makeItem("Run tests", ["pytest"])];
      const checkRuns = [makeCheckRun("Test / pytest")];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.details[0].status).toBe("pass");
    });

    it("matches via token overlap (≥2 tokens)", async () => {
      const items = [makeItem("Run ruff linting check", [])];
      const checkRuns = [makeCheckRun("Lint / ruff check")];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.details[0].status).toBe("pass");
    });

    it("case-insensitive matching", async () => {
      const items = [makeItem("Run build", ["NPM RUN BUILD"])];
      const checkRuns = [makeCheckRun("npm run build")];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.details[0].status).toBe("pass");
    });

    it("does not match unrelated items (no false positives)", async () => {
      const items = [makeItem("Check the login page renders correctly", [], "ui-flow")];
      const checkRuns = [makeCheckRun("build"), makeCheckRun("lint")];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.details[0].status).toBe("skip");
    });

    it("skips items with no matching check run", async () => {
      const items = [makeItem("Deploy to staging", ["deploy.sh"])];
      const checkRuns = [makeCheckRun("build")];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.details[0].status).toBe("skip");
    });
  });

  describe("check run states", () => {
    it("all check runs success → score 100, passed true", async () => {
      const items = [
        makeItem("Build", ["npm run build"]),
        makeItem("Test", ["npm test"]),
      ];
      const checkRuns = [makeCheckRun("npm run build"), makeCheckRun("npm test")];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
    });

    it("one check run failed → passed false", async () => {
      const items = [
        makeItem("Build", ["npm run build"]),
        makeItem("Test", ["npm test"]),
      ];
      const checkRuns = [makeCheckRun("npm run build"), makeCheckRun("npm test", "failure")];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.passed).toBe(false);
      expect(signal.score).toBe(50); // 1/2 passed
    });

    it("check run still running → warn status", async () => {
      const items = [makeItem("Build", ["npm run build"])];
      const checkRuns = [{ name: "npm run build", status: "in_progress", conclusion: null, html_url: null }];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.details[0].status).toBe("warn");
      expect(signal.details[0].message).toContain("still running");
    });

    it("check run skipped → skip status", async () => {
      const items = [makeItem("Build", ["npm run build"])];
      const checkRuns = [makeCheckRun("npm run build", "skipped")];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.details[0].status).toBe("skip");
    });

    it("failed check run includes URL in message", async () => {
      const items = [makeItem("Build", ["npm run build"])];
      const checkRuns = [makeCheckRun("npm run build", "failure")];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.details[0].message).toContain("https://github.com");
    });
  });

  describe("edge cases", () => {
    it("no check runs found → score 100, passed true (neutral)", async () => {
      const items = [makeItem("Build", ["npm run build"])];
      const octokit = makeOctokit([]);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].message).toContain("No GitHub Actions");
    });

    it("no items match any check run → score 100 (neutral)", async () => {
      const items = [makeItem("Visual check", [], "ui-flow")];
      const checkRuns = [makeCheckRun("build")];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
    });

    it("Vigil check run is excluded from matching", async () => {
      const items = [makeItem("Vigil test plan", ["vigil"])];
      const checkRuns = [makeCheckRun("Vigil — Test Plan Verification")];
      const octokit = makeOctokit(checkRuns);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      // Vigil's own check run should be filtered out → no CI check runs remain
      expect(signal.score).toBe(100);
      expect(signal.details[0].message).toContain("No GitHub Actions");
    });

    it("empty classified items → score 100, passed true", async () => {
      const octokit = makeOctokit([makeCheckRun("build")]);
      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: [] });
      expect(signal.score).toBe(100);
      expect(signal.passed).toBe(true);
    });

    it("API error → score 50, passed true, warn detail", async () => {
      const items = [makeItem("Build", ["npm run build"])];
      const octokit = makeOctokit([], true);

      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: items });
      expect(signal.score).toBe(50);
      expect(signal.passed).toBe(true);
      expect(signal.details[0].status).toBe("warn");
    });
  });

  describe("signal metadata", () => {
    it("has correct signal id", async () => {
      const octokit = makeOctokit([]);
      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: [] });
      expect(signal.id).toBe("ci-bridge");
    });

    it("has correct signal name", async () => {
      const octokit = makeOctokit([]);
      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: [] });
      expect(signal.name).toBe("CI Bridge");
    });

    it("does not require LLM", async () => {
      const octokit = makeOctokit([]);
      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: [] });
      expect(signal.requiresLLM).toBe(false);
    });

    it("has weight 25", async () => {
      const octokit = makeOctokit([]);
      const signal = await collectCISignal({ ...BASE_OPTIONS, octokit, classifiedItems: [] });
      expect(signal.weight).toBe(25);
    });
  });
});
