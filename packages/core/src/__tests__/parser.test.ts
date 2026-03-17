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

  describe("boilerplate filtering", () => {
    it("does not append 'Generated with Claude Code' line to last item", () => {
      const body = [
        "- [ ] `pnpm typecheck` passes with zero errors",
        "",
        "🤖 Generated with [Claude Code](https://claude.com/claude-code)",
      ].join("\n");
      const items = parseCheckboxItems(body);
      expect(items).toHaveLength(1);
      expect(items[0].text).toBe("`pnpm typecheck` passes with zero errors");
      expect(items[0].text).not.toContain("Generated");
      expect(items[0].text).not.toContain("Claude Code");
    });

    it("does not append 'Generated with Cursor' to last item", () => {
      const body = "- [ ] Last item\nGenerated with [Cursor](https://cursor.com)";
      const items = parseCheckboxItems(body);
      expect(items).toHaveLength(1);
      expect(items[0].text).not.toContain("Cursor");
    });

    it("does not append HTML comment lines to last item", () => {
      const body = "- [ ] Last item\n<!-- end of auto-generated comment -->";
      const items = parseCheckboxItems(body);
      expect(items).toHaveLength(1);
      expect(items[0].text).not.toContain("auto-generated");
    });

    it("does not append --- separator to last item", () => {
      const body = "- [ ] Last item\n---";
      const items = parseCheckboxItems(body);
      expect(items).toHaveLength(1);
      expect(items[0].text).toBe("Last item");
    });

    it("does not append <sub> footer tags to last item", () => {
      const body = "- [ ] Last item\n<sub>Vigil v0.1.0 | keepvigil.dev</sub>";
      const items = parseCheckboxItems(body);
      expect(items).toHaveLength(1);
      expect(items[0].text).not.toContain("Vigil");
    });

    it("still appends legitimate continuation lines", () => {
      const body = "- [ ] This is a long assertion that\n  continues on the next line";
      const items = parseCheckboxItems(body);
      expect(items).toHaveLength(1);
      expect(items[0].text).toContain("continues on the next line");
    });

    it("handles emoji-prefixed boilerplate line", () => {
      const body = "- [ ] Run tests\n🤖 Generated with [Claude Code](https://claude.com)";
      const items = parseCheckboxItems(body);
      expect(items).toHaveLength(1);
      expect(items[0].text).toBe("Run tests");
    });
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("parseTestPlan — edge cases", () => {
  it("parses unicode checkbox text with accents and special chars", () => {
    const md = "## Test Plan\n\n- [x] Verificar ítem con acentos y ñ\n- [ ] Tester l'écran en français\n";
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].text).toContain("Verificar ítem con acentos y ñ");
    expect(result.items[0].checked).toBe(true);
    expect(result.items[1].text).toContain("Tester l'écran en français");
  });

  it("does not terminate section on a bold sentence with punctuation", () => {
    // A bold line ending in period is a prose sentence, not a heading — section continues
    const md = "## Test Plan\n\n- [ ] First item\n\n**This is a full sentence.**\n\n- [ ] Second item\n";
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(2);
    expect(result.items[1].text).toContain("Second item");
  });

  it("terminates bold-style test plan section on a short bold heading without punctuation", () => {
    // A bold-style **Test Plan** heading (headingLevel=0) is terminated by any bold heading
    const md = "**Test Plan**\n\n- [ ] Only item\n\n**Next Section**\n\n- [ ] Should not be included\n";
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].text).toContain("Only item");
  });

  it("only parses the first test plan section when multiple exist", () => {
    const md = [
      "## Test Plan",
      "- [ ] First section item",
      "",
      "## Other Stuff",
      "Some content",
      "",
      "## Test Plan",
      "- [ ] Second section item",
    ].join("\n");
    const result = parseTestPlan(md);
    // Only items from the first section
    expect(result.items).toHaveLength(1);
    expect(result.items[0].text).toContain("First section item");
  });

  it("heading with trailing colon does not match as test plan section", () => {
    // "## Test plan:" has a colon — does not match HEADING_PATTERN (/test\s*plan\s*$/)
    const md = "## Test plan:\n\n- [ ] Item A\n";
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(0);
    expect(result.sectionTitle).toBe("");
  });

  it("returns sectionTitle with empty items for a section with no checkboxes", () => {
    const md = "## Test Plan\n\nJust prose, no checkboxes.\n\n## Next\n";
    const result = parseTestPlan(md);
    expect(result.sectionTitle).toBe("## Test Plan");
    expect(result.items).toHaveLength(0);
  });

  it("handles very long PR body (50KB) without losing items", () => {
    // Padding goes BEFORE the test plan section so it doesn't affect parsing
    const padding = "x".repeat(50_000);
    const md = `<!-- ${padding} -->\n\n## Test Plan\n\n- [ ] Item A\n- [x] Item B\n`;
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].text).toBe("Item A");
    expect(result.items[1].text).toBe("Item B");
  });

  it("handles checkbox with empty text after whitespace trim", () => {
    const md = "## Test Plan\n\n- [ ]   \n- [ ] Normal item\n";
    const result = parseTestPlan(md);
    // Normal item should still be parsed; whitespace-only item behaviour is implementation-defined
    const normalItems = result.items.filter((i) => i.text.trim() === "Normal item");
    expect(normalItems).toHaveLength(1);
  });

  it("accumulates multiple code blocks in continuation block", () => {
    const md = [
      "## Test Plan",
      "- [ ] Run the full suite",
      "  `npm install`",
      "  `npm run build`",
      "  `npm test`",
    ].join("\n");
    const result = parseTestPlan(md);
    expect(result.items).toHaveLength(1);
    // All three code blocks should appear in hints
    const codeBlocks = result.items[0].hints.codeBlocks;
    expect(codeBlocks).toContain("npm install");
    expect(codeBlocks).toContain("npm run build");
    expect(codeBlocks).toContain("npm test");
  });
});
