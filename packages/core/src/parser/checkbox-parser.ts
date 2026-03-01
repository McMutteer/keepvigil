import type { TestPlanItem } from "../types.js";
import { extractHints } from "./prefix-extractor.js";

/**
 * Match a markdown checkbox line:
 * - Group 1: leading whitespace (for indent level)
 * - Group 2: bullet character (- or *)
 * - Group 3: checkbox content (space, x, or X)
 * - Group 4: the text after the checkbox
 */
const CHECKBOX_PATTERN = /^(\s*)([-*])\s*\[([ xX])\]\s+(.*)$/;

/** Spaces per indent level for nesting calculation */
const SPACES_PER_INDENT = 2;

/**
 * Parse checkbox items from the body of a test plan section.
 *
 * Handles:
 * - `- [ ]` and `- [x]` checkboxes (and `*` bullet variant)
 * - Indented/nested checkboxes with indent level tracking
 * - Multi-line continuation (non-checkbox lines appended to previous item)
 */
export function parseCheckboxItems(sectionBody: string): TestPlanItem[] {
  const lines = sectionBody.split("\n");
  const items: TestPlanItem[] = [];

  for (const line of lines) {
    const match = line.match(CHECKBOX_PATTERN);

    if (match) {
      const [, leadingSpace, , checkChar, rawText] = match;
      const indent = Math.floor(leadingSpace.length / SPACES_PER_INDENT);
      const checked = checkChar === "x" || checkChar === "X";
      const { cleanedText, hints } = extractHints(rawText.trim());

      items.push({
        id: `tp-${items.length}`,
        text: cleanedText,
        checked,
        raw: line,
        indent,
        hints,
      });
    } else if (items.length > 0 && line.trim() !== "" && !line.match(/^#{1,6}\s+/)) {
      // Multi-line continuation: append to previous item
      const prev = items[items.length - 1];
      prev.raw += `\n${line}`;

      const continuationText = line.trim();
      prev.text += ` ${continuationText}`;

      // Re-extract hints from the updated full text
      const { cleanedText, hints } = extractHints(prev.text);
      prev.text = cleanedText;
      prev.hints = hints;
    }
  }

  return items;
}
