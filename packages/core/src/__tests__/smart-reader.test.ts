import { describe, it, expect } from "vitest";
import { extractKeywords, findRelevantLines, prepareFileContent } from "../smart-reader.js";

// ---------------------------------------------------------------------------
// extractKeywords
// ---------------------------------------------------------------------------

describe("extractKeywords", () => {
  it("extracts backtick-delimited names", () => {
    const keywords = extractKeywords("`buildOnboardingTips` returns a details block");
    expect(keywords).toContain("buildOnboardingTips");
  });

  it("extracts dotted path last segment", () => {
    const keywords = extractKeywords("`signal.passed` is true");
    expect(keywords).toContain("passed");
  });

  it("skips file paths in backticks", () => {
    const keywords = extractKeywords("`packages/api/src/routes/targets.ts` has PATCH");
    // Should not include the full path as a keyword
    expect(keywords.some((k) => k.includes("/"))).toBe(false);
  });

  it("extracts camelCase identifiers ≥ 6 chars", () => {
    const keywords = extractKeywords("the handleEdit function prevents double submit");
    expect(keywords).toContain("handleEdit");
  });

  it("ignores short identifiers", () => {
    const keywords = extractKeywords("the foo function");
    expect(keywords).not.toContain("foo");
  });

  it("extracts from code blocks", () => {
    const keywords = extractKeywords("exports function", ["getRemediation"]);
    expect(keywords).toContain("getRemediation");
  });

  it("returns empty for no matches", () => {
    const keywords = extractKeywords("a simple text with no identifiers");
    expect(keywords).toEqual([]);
  });

  it("deduplicates keywords", () => {
    const keywords = extractKeywords("`buildOnboardingTips` calls buildOnboardingTips internally");
    const count = keywords.filter((k) => k === "buildOnboardingTips").length;
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// findRelevantLines
// ---------------------------------------------------------------------------

describe("findRelevantLines", () => {
  const makeFile = (lineCount: number, targetLine: number, targetContent: string): string => {
    const lines: string[] = [];
    for (let i = 0; i < lineCount; i++) {
      lines.push(i === targetLine ? targetContent : `// line ${i + 1}`);
    }
    return lines.join("\n");
  };

  it("finds keyword at end of large file", () => {
    const content = makeFile(600, 590, "export function buildOnboardingTips() {");
    const result = findRelevantLines(content, ["buildOnboardingTips"]);
    expect(result).not.toBeNull();
    expect(result).toContain("buildOnboardingTips");
    expect(result).toContain("600 total lines");
  });

  it("returns null when no keywords match", () => {
    const content = makeFile(100, 50, "some unrelated code");
    const result = findRelevantLines(content, ["nonExistentFunction"]);
    expect(result).toBeNull();
  });

  it("returns null for empty keywords", () => {
    const content = "some content";
    expect(findRelevantLines(content, [])).toBeNull();
  });

  it("includes context lines around match", () => {
    const content = makeFile(100, 50, "export function target() {}");
    const result = findRelevantLines(content, ["target"], 5);
    expect(result).not.toBeNull();
    // Should include lines 45-55 approximately
    expect(result).toContain("line 46"); // line 45 (0-indexed)
    expect(result).toContain("line 56"); // line 55 (0-indexed)
  });

  it("merges overlapping windows", () => {
    const lines: string[] = [];
    for (let i = 0; i < 100; i++) {
      if (i === 40) lines.push("function alpha() {}");
      else if (i === 45) lines.push("function alpha_helper() {}");
      else lines.push(`// line ${i + 1}`);
    }
    const content = lines.join("\n");
    const result = findRelevantLines(content, ["alpha"], 10);
    expect(result).not.toBeNull();
    // Both matches should be in a single merged range (40±10 and 45±10 overlap)
    expect(result!.match(/--- Lines/g)?.length).toBe(1);
  });

  it("shows multiple ranges for distant matches", () => {
    const lines: string[] = [];
    for (let i = 0; i < 200; i++) {
      if (i === 10) lines.push("function alpha() {}");
      else if (i === 190) lines.push("function alpha_end() {}");
      else lines.push(`// line ${i + 1}`);
    }
    const content = lines.join("\n");
    const result = findRelevantLines(content, ["alpha"], 5);
    expect(result).not.toBeNull();
    // Two separate ranges
    expect(result!.match(/--- Lines/g)?.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// prepareFileContent
// ---------------------------------------------------------------------------

describe("prepareFileContent", () => {
  it("returns full content for small files", () => {
    const content = "small file content";
    const result = prepareFileContent(content, "check something");
    expect(result).toBe(content);
  });

  it("uses keyword extraction for large files", () => {
    const lines: string[] = [];
    for (let i = 0; i < 600; i++) {
      if (i === 590) lines.push("export function buildOnboardingTips() { return '<details>'; }");
      else lines.push(`// padding line ${i + 1} ${"x".repeat(30)}`);
    }
    const content = lines.join("\n");

    const result = prepareFileContent(content, "`buildOnboardingTips` returns a details block");
    expect(result).toContain("buildOnboardingTips");
    expect(result).toContain("600 total lines");
    // Should NOT be the blind truncation (first 20KB wouldn't reach line 590)
    expect(result).not.toContain("padding line 1");
  });

  it("falls back to truncation when no keywords match", () => {
    const lines: string[] = [];
    for (let i = 0; i < 600; i++) {
      lines.push(`// padding line ${i + 1} ${"x".repeat(30)}`);
    }
    const content = lines.join("\n");

    const result = prepareFileContent(content, "no matching keywords here");
    expect(result).toContain("padding line 1"); // First lines preserved
    expect(result).toContain("...(truncated)");
  });

  it("falls back to truncation when keywords exist but don't match file", () => {
    const lines: string[] = [];
    for (let i = 0; i < 600; i++) {
      lines.push(`// padding line ${i + 1} ${"x".repeat(30)}`);
    }
    const content = lines.join("\n");

    const result = prepareFileContent(content, "`nonExistentFunction` does something");
    expect(result).toContain("...(truncated)");
  });
});
