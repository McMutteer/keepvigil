import type { TestPlanHints } from "../types.js";

/** Match "Manual:" prefix (case-insensitive, optional trailing space) */
const MANUAL_PREFIX = /^manual:\s*/i;

/** Match inline code blocks: `some code here` */
const CODE_BLOCK_PATTERN = /`([^`]+)`/g;

/** Match HTTP/HTTPS URLs */
const URL_PATTERN = /https?:\/\/[^\s)>\]]+/g;

/**
 * Extract hints from a test plan item's text.
 *
 * Detects:
 * - "Manual:" prefix → isManual
 * - Inline code blocks → codeBlocks
 * - HTTP/HTTPS URLs → urls
 *
 * Returns the cleaned text (with "Manual:" stripped) alongside hints.
 */
export function extractHints(text: string): { cleanedText: string; hints: TestPlanHints } {
  let cleanedText = text;
  const isManual = MANUAL_PREFIX.test(cleanedText);

  if (isManual) {
    cleanedText = cleanedText.replace(MANUAL_PREFIX, "");
  }

  const codeBlocks: string[] = [];
  for (const match of cleanedText.matchAll(CODE_BLOCK_PATTERN)) {
    codeBlocks.push(match[1]);
  }

  const urls: string[] = [];
  for (const match of cleanedText.matchAll(URL_PATTERN)) {
    urls.push(match[0]);
  }

  return {
    cleanedText: cleanedText.trim(),
    hints: { isManual, codeBlocks, urls },
  };
}
