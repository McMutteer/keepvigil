import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseTestPlan } from "../parser/index.js";
import { extractTestPlanSection } from "../parser/section-detector.js";
import { extractHints } from "../parser/prefix-extractor.js";
import { parseCheckboxItems } from "../parser/checkbox-parser.js";

function loadFixture(name: string): string {
  return readFileSync(resolve(import.meta.dirname, "fixtures", name), "utf-8");
}

describe("parseTestPlan", () => {
  // --- Empty / missing input ---

  it("returns empty result for empty string", () => {
    const result = parseTestPlan("");
    expect(result.items).toEqual([]);
    expect(result.sectionTitle).toBe("");
    expect(result.raw).toBe("");
  });

  it("returns empty result for undefined-like input", () => {
    const result = parseTestPlan(null as unknown as string);
    expect(result.items).toEqual([]);
  });

  it("returns empty result when no test plan section exists", () => {
    const md = loadFixture("no-test-plan.md");
    const result = parseTestPlan(md);
    expect(result.items).toEqual([]);
    expect(result.sectionTitle).toBe("");
  });

  it("returns empty items when test plan section has no checkboxes", () => {
    const md = "## Test Plan\n\nJust some text, no checkboxes here.\n\n## Next Section";
    const result = parseTestPlan(md);
    expect(result.items).toEqual([]);
    expect(result.sectionTitle).toBe("## Test Plan");
  });

  // --- Basic checkbox parsing ---

  it("parses basic checkboxes from simple fixture", () => {
    const md = loadFixture("simple.md");
    const result = parseTestPlan(md);

    expect(result.items).toHaveLength(5);
    expect(result.sectionTitle).toBe("## Test Plan");

    // First item: unchecked with code block
    expect(result.items[0].id).toBe("tp-0");
    expect(result.items[0].checked).toBe(false);
    expect(result.items[0].hints.codeBlocks).toContain("npm run build");

    // Second item: checked
    expect(result.items[1].checked).toBe(true);
    expect(result.items[1].text).toContain("Login with valid credentials");

    // Third item: unchecked
    expect(result.items[2].checked).toBe(false);
    expect(result.items[2].text).toContain("401");
  });

  it("parses asterisk-style checkboxes", () => {
    const md = "## Test Plan\n\n* [ ] First item\n* [x] Second item\n";
    const result = parseTestPlan(md);

    expect(result.items).toHaveLength(2);
    expect(result.items[0].checked).toBe(false);
    expect(result.items[0].text).toBe("First item");
    expect(result.items[1].checked).toBe(true);
    expect(result.items[1].text).toBe("Second item");
  });

  // --- Heading variations ---

  it("handles case-insensitive heading (lowercase)", () => {
    const md = "## test plan\n\n- [ ] Item one\n";
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(1);
    expect(result.sectionTitle).toBe("## test plan");
  });

  it("handles case-insensitive heading (uppercase)", () => {
    const md = "## TEST PLAN\n\n- [ ] Item one\n";
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(1);
  });

  it("handles level 3 heading", () => {
    const md = loadFixture("edge-cases.md");
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(2);
    expect(result.sectionTitle).toBe("### Test Plan");
  });

  it("handles level 4 heading", () => {
    const md = "#### Test Plan\n\n- [ ] Deep heading\n";
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(1);
  });

  it("handles bold-style heading", () => {
    const md = "**Test Plan**\n\n- [ ] Bold heading item\n- [x] Another item\n\n## Next Section\n";
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(2);
    expect(result.sectionTitle).toBe("**Test Plan**");
  });

  it("stops bold-heading section at next bold heading", () => {
    const md = "**Test Plan**\n\n- [ ] Item in plan\n\n**Notes**\n\nThis should not appear.\n- [ ] Not in plan\n";
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].text).toBe("Item in plan");
  });

  // --- Section boundary ---

  it("stops at next heading of same level", () => {
    const md = loadFixture("simple.md");
    const result = parseTestPlan(md);

    // "Notes" section should NOT leak into test plan
    expect(result.items).toHaveLength(5);
    for (const item of result.items) {
      expect(item.text).not.toContain("feature flag");
    }
  });

  it("stops at next heading of higher level", () => {
    const md = "### Test Plan\n\n- [ ] Item 1\n\n## Higher Level Section\n\n- [ ] Should not appear\n";
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(1);
  });

  it("includes content when test plan is at end of document", () => {
    const md = "## Summary\n\nSome summary.\n\n## Test Plan\n\n- [ ] Last section item\n- [x] Another last item\n";
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(2);
  });

  // --- Uppercase X ---

  it("handles uppercase X checkbox", () => {
    const md = loadFixture("edge-cases.md");
    const result = parseTestPlan(md);

    const upperX = result.items.find((item) => item.text.includes("Uppercase X"));
    expect(upperX).toBeDefined();
    expect(upperX!.checked).toBe(true);
  });

  // --- Multi-line items ---

  it("handles multi-line continuation items", () => {
    const md = loadFixture("complex.md");
    const result = parseTestPlan(md);

    // "POST /api/checkout creates a Stripe session and returns a 201 with session URL"
    const multiLine = result.items.find((item) => item.text.includes("Stripe session"));
    expect(multiLine).toBeDefined();
    expect(multiLine!.text).toContain("201 with session URL");
  });

  it("preserves isManual on multi-line Manual: items", () => {
    const md = "## Test Plan\n\n- [ ] Manual: Check the email template\n  looks correct on mobile\n";
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].hints.isManual).toBe(true);
    expect(result.items[0].text).toContain("looks correct on mobile");
    expect(result.items[0].text).not.toMatch(/^Manual:/i);
  });

  // --- Nested checkboxes ---

  it("tracks indent level for nested checkboxes", () => {
    const md = loadFixture("complex.md");
    const result = parseTestPlan(md);

    // Find nested items (indent > 0) — the sub-items under OG meta tags
    const nested = result.items.filter((item) => item.indent > 0);
    expect(nested.length).toBeGreaterThanOrEqual(2);
    expect(nested[0].indent).toBeGreaterThan(0);
  });

  // --- Manual: prefix ---

  it("detects Manual: prefix", () => {
    const md = loadFixture("complex.md");
    const result = parseTestPlan(md);

    const manualItems = result.items.filter((item) => item.hints.isManual);
    expect(manualItems.length).toBe(2);
    // Text should have "Manual:" stripped
    for (const item of manualItems) {
      expect(item.text).not.toMatch(/^Manual:/i);
    }
  });

  // --- Inline code extraction ---

  it("extracts inline code blocks", () => {
    const md = loadFixture("real-world.md");
    const result = parseTestPlan(md);

    const buildItem = result.items.find((item) => item.hints.codeBlocks.includes("pnpm build"));
    expect(buildItem).toBeDefined();

    const testItem = result.items.find((item) => item.hints.codeBlocks.includes("pnpm test"));
    expect(testItem).toBeDefined();

    const lintItem = result.items.find((item) => item.hints.codeBlocks.includes("ruff check ."));
    expect(lintItem).toBeDefined();
  });

  it("extracts multiple code blocks from a single item", () => {
    const md = '## Test Plan\n\n- [ ] Run `npm build` then `npm test` to verify\n';
    const result = parseTestPlan(md);
    expect(result.items[0].hints.codeBlocks).toEqual(["npm build", "npm test"]);
  });

  // --- URL extraction ---

  it("extracts URLs from items", () => {
    const md = loadFixture("complex.md");
    const result = parseTestPlan(md);

    const urlItem = result.items.find((item) =>
      item.hints.urls.some((url) => url.includes("localhost:3000/checkout")),
    );
    expect(urlItem).toBeDefined();
  });

  // --- Real-world fixture ---

  it("correctly parses real-world PR description", () => {
    const md = loadFixture("real-world.md");
    const result = parseTestPlan(md);

    expect(result.items.length).toBe(10);
    expect(result.sectionTitle).toBe("## Test Plan");

    // Verify mixed checked/unchecked
    const checked = result.items.filter((item) => item.checked);
    const unchecked = result.items.filter((item) => !item.checked);
    expect(checked.length).toBe(1);
    expect(unchecked.length).toBe(9);

    // Verify manual item exists
    const manual = result.items.filter((item) => item.hints.isManual);
    expect(manual.length).toBe(1);

    // Content after "How to Verify" should NOT be included
    for (const item of result.items) {
      expect(item.text).not.toContain("docker compose");
    }
  });

  // --- Raw field ---

  it("preserves raw markdown in the raw field", () => {
    const md = "## Test Plan\n\n- [ ] Simple item\n";
    const result = parseTestPlan(md);
    expect(result.items[0].raw).toBe("- [ ] Simple item");
    expect(result.raw).toContain("## Test Plan");
  });
});

describe("extractTestPlanSection", () => {
  it("returns null when no section found", () => {
    expect(extractTestPlanSection("# Hello\n\nNo test plan here.")).toBeNull();
  });

  it("returns section with title, body, and raw", () => {
    const md = "## Test Plan\n\nSome body.\n\n## Next";
    const section = extractTestPlanSection(md)!;
    expect(section.title).toBe("## Test Plan");
    expect(section.body).toBe("Some body.");
    expect(section.raw).toContain("## Test Plan");
    expect(section.raw).not.toContain("## Next");
  });
});

describe("extractHints", () => {
  it("detects Manual: prefix (case insensitive)", () => {
    const result = extractHints("MANUAL: Check the email template");
    expect(result.hints.isManual).toBe(true);
    expect(result.cleanedText).toBe("Check the email template");
  });

  it("extracts code blocks", () => {
    const result = extractHints("Run `npm test` and `npm build`");
    expect(result.hints.codeBlocks).toEqual(["npm test", "npm build"]);
  });

  it("extracts URLs", () => {
    const result = extractHints("Check https://example.com/api and http://localhost:3000");
    expect(result.hints.urls).toEqual(["https://example.com/api", "http://localhost:3000"]);
  });

  it("returns empty hints for plain text", () => {
    const result = extractHints("Just a plain description");
    expect(result.hints.isManual).toBe(false);
    expect(result.hints.codeBlocks).toEqual([]);
    expect(result.hints.urls).toEqual([]);
  });
});

describe("parseCheckboxItems", () => {
  it("returns empty array for text without checkboxes", () => {
    expect(parseCheckboxItems("Just some text\nNo checkboxes")).toEqual([]);
  });

  it("assigns sequential IDs", () => {
    const items = parseCheckboxItems("- [ ] A\n- [ ] B\n- [ ] C\n");
    expect(items.map((i) => i.id)).toEqual(["tp-0", "tp-1", "tp-2"]);
  });
});
