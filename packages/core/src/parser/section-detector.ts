/**
 * Detects and extracts the "Test Plan" section from a markdown PR description.
 *
 * Supports:
 * - Heading levels 1-6: `## Test Plan`, `### Test Plan`, etc.
 * - Case-insensitive matching: "test plan", "Test Plan", "TEST PLAN"
 * - Bold-style headings: `**Test Plan**`
 * - Section ends at the next heading of same or higher level, or EOF
 */

export interface DetectedSection {
  /** The matched heading line (e.g., "## Test Plan") */
  title: string;
  /** Content between the heading and the next same/higher-level heading */
  body: string;
  /** The full raw section including heading */
  raw: string;
}

/** Match markdown headings: `# Test Plan` through `###### Test Plan` */
const HEADING_PATTERN = /^(#{1,6})\s+test\s*plan\s*$/im;

/** Match bold-style headings: `**Test Plan**` on its own line */
const BOLD_HEADING_PATTERN = /^\*\*test\s*plan\*\*\s*$/im;

/**
 * Extract the test plan section from a markdown document.
 * Returns null if no test plan section is found.
 */
export function extractTestPlanSection(markdown: string): DetectedSection | null {
  const lines = markdown.split("\n");

  let headingIndex = -1;
  let headingLevel = 0;
  let headingLine = "";

  // Find the first "Test Plan" heading
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const headingMatch = line.match(HEADING_PATTERN);
    if (headingMatch) {
      headingIndex = i;
      headingLevel = headingMatch[1].length;
      headingLine = line;
      break;
    }

    if (BOLD_HEADING_PATTERN.test(line)) {
      headingIndex = i;
      headingLevel = 0; // Bold headings have no level — section ends at any heading
      headingLine = line;
      break;
    }
  }

  if (headingIndex === -1) {
    return null;
  }

  // Find the section boundary: next heading of same or higher level (fewer #), or EOF
  let endIndex = lines.length;
  for (let i = headingIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const hashMatch = line.match(/^(#{1,6})\s+/);
    // Only treat as a bold heading if it's short (< 80 chars) and not a sentence
    const isBoldHeading = /^\*\*.+\*\*\s*$/.test(line)
      && line.length < 80
      && !/[.,;:!?]\*\*\s*$/.test(line);

    // For bold "Test Plan" heading: any heading style terminates the section
    if (headingLevel === 0) {
      if (hashMatch || isBoldHeading) {
        endIndex = i;
        break;
      }
      continue;
    }

    // For regular headings: same or higher-level hash heading ends the section
    if (hashMatch) {
      const level = hashMatch[1].length;
      if (level <= headingLevel) {
        endIndex = i;
        break;
      }
    }
  }

  const bodyLines = lines.slice(headingIndex + 1, endIndex);
  const rawLines = lines.slice(headingIndex, endIndex);

  return {
    title: headingLine.trim(),
    body: bodyLines.join("\n").trim(),
    raw: rawLines.join("\n"),
  };
}
