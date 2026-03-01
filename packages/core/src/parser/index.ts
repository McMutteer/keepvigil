import type { ParsedTestPlan } from "../types.js";
import { extractTestPlanSection } from "./section-detector.js";
import { parseCheckboxItems } from "./checkbox-parser.js";

export { extractTestPlanSection } from "./section-detector.js";
export { parseCheckboxItems } from "./checkbox-parser.js";
export { extractHints } from "./prefix-extractor.js";

/**
 * Parse a test plan from a PR description (markdown).
 *
 * Finds the "Test Plan" section, extracts all checkbox items with their
 * checked/unchecked status, indent level, and hints (Manual: prefix,
 * inline code blocks, URLs).
 *
 * Returns an empty ParsedTestPlan if no test plan section is found.
 */
export function parseTestPlan(markdown: string): ParsedTestPlan {
  if (!markdown) {
    return { items: [], sectionTitle: "", raw: "" };
  }

  const section = extractTestPlanSection(markdown);

  if (!section) {
    return { items: [], sectionTitle: "", raw: "" };
  }

  const items = parseCheckboxItems(section.body);

  return {
    items,
    sectionTitle: section.title,
    raw: section.raw,
  };
}
