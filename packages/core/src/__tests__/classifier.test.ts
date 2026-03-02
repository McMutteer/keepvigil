import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyRules } from "../classifier/rules.js";
import { classifyItems } from "../classifier/index.js";
import { buildUserPrompt, FEW_SHOT_EXAMPLES } from "../classifier/prompts.js";
import { parseTestPlan } from "../parser/index.js";
import type { TestPlanItem, TestPlanHints } from "../types.js";

/** Shared mock for the Anthropic messages.create method */
const mockCreate = vi.fn();

// Mock the Anthropic SDK with a proper class
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

function loadFixture(name: string): string {
  return readFileSync(resolve(import.meta.dirname, "fixtures", name), "utf-8");
}

/** Helper to create a TestPlanItem for testing */
function makeItem(
  text: string,
  hints: Partial<TestPlanHints> = {},
  id = "tp-0",
): TestPlanItem {
  return {
    id,
    text,
    checked: false,
    raw: `- [ ] ${text}`,
    indent: 0,
    hints: {
      isManual: false,
      codeBlocks: [],
      urls: [],
      ...hints,
    },
  };
}

// ============================================================
// Rule-based classifier tests (no API, pure functions)
// ============================================================

describe("applyRules", () => {
  // --- Manual items ---

  it("classifies Manual: prefix as SKIP/none/manual", () => {
    const item = makeItem("Ask client for approval", { isManual: true });
    const result = applyRules(item);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe("SKIP");
    expect(result!.executorType).toBe("none");
    expect(result!.category).toBe("manual");
  });

  // --- Shell commands in code blocks ---

  it("classifies npm run build as DETERMINISTIC/shell/build", () => {
    const item = makeItem('Run `npm run build` and verify no errors', {
      codeBlocks: ["npm run build"],
    });
    const result = applyRules(item);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe("DETERMINISTIC");
    expect(result!.executorType).toBe("shell");
    expect(result!.category).toBe("build");
  });

  it("classifies pnpm test as DETERMINISTIC/shell/build", () => {
    const item = makeItem("Run `pnpm test`", {
      codeBlocks: ["pnpm test"],
    });
    const result = applyRules(item);
    expect(result!.confidence).toBe("DETERMINISTIC");
    expect(result!.executorType).toBe("shell");
    expect(result!.category).toBe("build");
  });

  it("classifies ruff check as DETERMINISTIC/shell/build", () => {
    const item = makeItem("Run `ruff check .`", {
      codeBlocks: ["ruff check ."],
    });
    const result = applyRules(item);
    expect(result!.confidence).toBe("DETERMINISTIC");
    expect(result!.executorType).toBe("shell");
  });

  it("classifies yarn test as DETERMINISTIC/shell/build", () => {
    const item = makeItem("Run `yarn test`", {
      codeBlocks: ["yarn test"],
    });
    const result = applyRules(item);
    expect(result!.confidence).toBe("DETERMINISTIC");
    expect(result!.executorType).toBe("shell");
  });

  it("classifies docker build as DETERMINISTIC/shell/build", () => {
    const item = makeItem("Run `docker build .`", {
      codeBlocks: ["docker build ."],
    });
    const result = applyRules(item);
    expect(result!.confidence).toBe("DETERMINISTIC");
    expect(result!.executorType).toBe("shell");
  });

  it("classifies vitest as DETERMINISTIC/shell/build", () => {
    const item = makeItem("Run `vitest run`", {
      codeBlocks: ["vitest run"],
    });
    const result = applyRules(item);
    expect(result!.confidence).toBe("DETERMINISTIC");
    expect(result!.executorType).toBe("shell");
  });

  it("classifies cargo test as DETERMINISTIC/shell/build", () => {
    const item = makeItem("Run `cargo test`", {
      codeBlocks: ["cargo test"],
    });
    const result = applyRules(item);
    expect(result!.confidence).toBe("DETERMINISTIC");
    expect(result!.executorType).toBe("shell");
  });

  // --- curl → API ---

  it("classifies curl command as HIGH/api/api", () => {
    const item = makeItem(
      "Run `curl -X POST http://localhost:3000/api/test`",
      { codeBlocks: ["curl -X POST http://localhost:3000/api/test"] },
    );
    const result = applyRules(item);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe("HIGH");
    expect(result!.executorType).toBe("api");
    expect(result!.category).toBe("api");
  });

  // --- HTTP verb + path in text ---

  it("classifies POST /api/users returns 201 as HIGH/api/api", () => {
    const item = makeItem("POST /api/users returns 201");
    const result = applyRules(item);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe("HIGH");
    expect(result!.executorType).toBe("api");
    expect(result!.category).toBe("api");
  });

  it("classifies GET /health returns 200 as HIGH/api/api", () => {
    const item = makeItem("GET /health returns 200");
    const result = applyRules(item);
    expect(result!.confidence).toBe("HIGH");
    expect(result!.executorType).toBe("api");
  });

  it("classifies text with Send requests to GET /api/products as HIGH/api", () => {
    const item = makeItem(
      "Send 6 requests to GET /api/v1/public/products and verify the 6th returns 429",
    );
    const result = applyRules(item);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe("HIGH");
    expect(result!.executorType).toBe("api");
  });

  // --- Status code without verb ---

  it("classifies text with status code reference as HIGH/api", () => {
    const item = makeItem("Login with invalid password returns 401");
    const result = applyRules(item);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBe("HIGH");
    expect(result!.executorType).toBe("api");
  });

  // --- Deferred to LLM ---

  it("returns null for UI flow items", () => {
    const item = makeItem("Click login button and verify dashboard loads");
    const result = applyRules(item);
    expect(result).toBeNull();
  });

  it("returns null for vague items", () => {
    const item = makeItem("Verify it works correctly");
    const result = applyRules(item);
    expect(result).toBeNull();
  });

  it("returns null for items with empty code blocks", () => {
    const item = makeItem("Check the output", { codeBlocks: [] });
    const result = applyRules(item);
    expect(result).toBeNull();
  });

  it("returns null for visual/browser items", () => {
    const item = makeItem("Skeleton loading appears before content loads");
    const result = applyRules(item);
    expect(result).toBeNull();
  });

  it("returns null for metadata items", () => {
    const item = makeItem("Verify OG meta tags are present");
    const result = applyRules(item);
    expect(result).toBeNull();
  });
});

// ============================================================
// LLM classifier tests (mocked Anthropic SDK)
// ============================================================

describe("classifyWithLLM (mocked)", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("classifies a batch of items via LLM", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            {
              category: "ui-flow",
              confidence: "HIGH",
              executorType: "browser",
              reasoning: "UI interaction test",
            },
            {
              category: "visual",
              confidence: "MEDIUM",
              executorType: "browser",
              reasoning: "Visual rendering check",
            },
          ]),
        },
      ],
    });

    const { classifyWithLLM } = await import(
      "../classifier/llm-classifier.js"
    );

    const items = [
      makeItem("Click login and verify dashboard loads", {}, "tp-0"),
      makeItem("Skeleton appears before content", {}, "tp-1"),
    ];

    const results = await classifyWithLLM(items, "test-key");
    expect(results).toHaveLength(2);
    expect(results[0].confidence).toBe("HIGH");
    expect(results[0].executorType).toBe("browser");
    expect(results[0].category).toBe("ui-flow");
    expect(results[1].confidence).toBe("MEDIUM");
    expect(results[1].category).toBe("visual");
  });

  it("falls back to LOW/none on API error", async () => {
    mockCreate.mockRejectedValue(new Error("API timeout"));

    const { classifyWithLLM } = await import(
      "../classifier/llm-classifier.js"
    );

    const items = [makeItem("Some ambiguous item")];
    const results = await classifyWithLLM(items, "test-key");
    expect(results).toHaveLength(1);
    expect(results[0].confidence).toBe("LOW");
    expect(results[0].executorType).toBe("none");
    expect(results[0].reasoning).toContain("unavailable");
  });

  it("falls back to LOW/none on invalid JSON response", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not json at all" }],
    });

    const { classifyWithLLM } = await import(
      "../classifier/llm-classifier.js"
    );

    const items = [makeItem("Another item")];
    const results = await classifyWithLLM(items, "test-key");
    expect(results[0].confidence).toBe("LOW");
    expect(results[0].reasoning).toContain("invalid JSON");
  });

  it("falls back when array length mismatches", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            {
              category: "api",
              confidence: "HIGH",
              executorType: "api",
              reasoning: "test",
            },
          ]),
        },
      ],
    });

    const { classifyWithLLM } = await import(
      "../classifier/llm-classifier.js"
    );

    // Send 2 items but mock returns 1
    const items = [makeItem("Item 1"), makeItem("Item 2")];
    const results = await classifyWithLLM(items, "test-key");
    expect(results).toHaveLength(2);
    expect(results[0].confidence).toBe("LOW"); // fallback
  });

  it("returns empty array for empty input", async () => {
    const { classifyWithLLM } = await import(
      "../classifier/llm-classifier.js"
    );
    const results = await classifyWithLLM([], "test-key");
    expect(results).toEqual([]);
  });

  it("normalizes invalid confidence/executor values", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            {
              category: "api",
              confidence: "ULTRA_HIGH",
              executorType: "quantum",
              reasoning: "test",
            },
          ]),
        },
      ],
    });

    const { classifyWithLLM } = await import(
      "../classifier/llm-classifier.js"
    );

    const results = await classifyWithLLM([makeItem("Test")], "test-key");
    expect(results[0].confidence).toBe("LOW"); // normalized from invalid
    expect(results[0].executorType).toBe("none"); // normalized from invalid
  });
});

// ============================================================
// classifyItems (orchestrator) tests
// ============================================================

describe("classifyItems", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns empty array for empty input", async () => {
    const results = await classifyItems([]);
    expect(results).toEqual([]);
  });

  it("classifies rule-matched items without LLM", async () => {
    const items = [
      makeItem("Run `npm run build`", { codeBlocks: ["npm run build"] }, "tp-0"),
      makeItem("Verify manually", { isManual: true }, "tp-1"),
    ];

    const results = await classifyItems(items, { rulesOnly: true });
    expect(results).toHaveLength(2);
    expect(results[0].confidence).toBe("DETERMINISTIC");
    expect(results[0].executorType).toBe("shell");
    expect(results[1].confidence).toBe("SKIP");
    expect(results[1].executorType).toBe("none");
  });

  it("classifies deferred items as LOW/none in rulesOnly mode", async () => {
    const items = [
      makeItem("Click login button", {}, "tp-0"),
      makeItem("Verify dashboard loads", {}, "tp-1"),
    ];

    const results = await classifyItems(items, { rulesOnly: true });
    expect(results).toHaveLength(2);
    expect(results[0].confidence).toBe("LOW");
    expect(results[0].reasoning).toContain("Rules-only");
    expect(results[1].confidence).toBe("LOW");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("classifies deferred items as LOW/none when no apiKey", async () => {
    const items = [makeItem("Navigate to /settings", {}, "tp-0")];
    const results = await classifyItems(items);
    expect(results[0].confidence).toBe("LOW");
    expect(results[0].reasoning).toContain("No API key");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("preserves order with mixed rule and deferred items", async () => {
    const items = [
      makeItem("Click login", {}, "tp-0"),           // deferred
      makeItem("Run `pnpm build`", { codeBlocks: ["pnpm build"] }, "tp-1"),  // rule
      makeItem("Check the UI", {}, "tp-2"),           // deferred
      makeItem("Manual: approve", { isManual: true }, "tp-3"),  // rule
    ];

    const results = await classifyItems(items, { rulesOnly: true });
    expect(results).toHaveLength(4);
    expect(results[0].item.id).toBe("tp-0");
    expect(results[0].confidence).toBe("LOW");       // deferred
    expect(results[1].item.id).toBe("tp-1");
    expect(results[1].confidence).toBe("DETERMINISTIC"); // rule
    expect(results[2].item.id).toBe("tp-2");
    expect(results[2].confidence).toBe("LOW");       // deferred
    expect(results[3].item.id).toBe("tp-3");
    expect(results[3].confidence).toBe("SKIP");      // rule
  });
});

// ============================================================
// Prompts module tests
// ============================================================

describe("prompts", () => {
  it("has 8 few-shot examples", () => {
    expect(FEW_SHOT_EXAMPLES).toHaveLength(8);
  });

  it("buildUserPrompt includes all items", () => {
    const prompt = buildUserPrompt(["item A", "item B", "item C"]);
    expect(prompt).toContain('"item A"');
    expect(prompt).toContain('"item B"');
    expect(prompt).toContain('"item C"');
    expect(prompt).toContain("1.");
    expect(prompt).toContain("2.");
    expect(prompt).toContain("3.");
  });

  it("buildUserPrompt includes few-shot examples", () => {
    const prompt = buildUserPrompt(["test"]);
    expect(prompt).toContain("Run npm run build");
    expect(prompt).toContain("POST /api/users returns 201");
  });
});

// ============================================================
// Integration: parse → classify (using real fixtures)
// ============================================================

describe("parse → classify integration", () => {
  it("classifies real-world.md fixture with rules only", async () => {
    const md = loadFixture("real-world.md");
    const parsed = parseTestPlan(md);
    expect(parsed.items.length).toBeGreaterThan(0);

    const results = await classifyItems(parsed.items, { rulesOnly: true });
    expect(results).toHaveLength(parsed.items.length);

    // Item 0: "Run `pnpm build` to verify no compilation errors" → DETERMINISTIC/shell
    expect(results[0].confidence).toBe("DETERMINISTIC");
    expect(results[0].executorType).toBe("shell");

    // Item 1: "Run `pnpm test` to verify all existing tests pass" → DETERMINISTIC/shell
    expect(results[1].confidence).toBe("DETERMINISTIC");
    expect(results[1].executorType).toBe("shell");

    // Item 2: "Send 6 requests to GET /api/..." → HIGH/api
    expect(results[2].confidence).toBe("HIGH");
    expect(results[2].executorType).toBe("api");

    // Item 5: "Manual: Verify rate limit resets..." → SKIP/none
    expect(results[5].confidence).toBe("SKIP");
    expect(results[5].executorType).toBe("none");
    expect(results[5].category).toBe("manual");

    // Item 7: "Run `ruff check .`..." → DETERMINISTIC/shell
    expect(results[7].confidence).toBe("DETERMINISTIC");
    expect(results[7].executorType).toBe("shell");
  });

  it("classifies simple.md fixture with rules only", async () => {
    const md = loadFixture("simple.md");
    const parsed = parseTestPlan(md);
    const results = await classifyItems(parsed.items, { rulesOnly: true });

    expect(results).toHaveLength(5);
    // Item 0: "Run `npm run build`..." → DETERMINISTIC/shell
    expect(results[0].confidence).toBe("DETERMINISTIC");
    expect(results[0].executorType).toBe("shell");
  });

  it("handles no-test-plan.md gracefully", async () => {
    const md = loadFixture("no-test-plan.md");
    const parsed = parseTestPlan(md);
    expect(parsed.items).toHaveLength(0);

    const results = await classifyItems(parsed.items, { rulesOnly: true });
    expect(results).toEqual([]);
  });
});
