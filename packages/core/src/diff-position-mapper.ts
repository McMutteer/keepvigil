/**
 * Diff Position Mapper — converts {file, line} to GitHub review comment positions.
 *
 * GitHub's review comment API requires a "position" which is the 1-indexed
 * line number within the unified diff (counting from the first @@ hunk header).
 * This module parses a unified diff and builds a lookup table for fast mapping.
 *
 * Pure functions, no side effects, no I/O.
 */

/** A single review comment location ready for the GitHub API */
export interface ReviewCommentLocation {
  /** File path as it appears in the diff (e.g., "src/auth.ts") */
  path: string;
  /** 1-indexed position in the unified diff — required by GitHub API */
  position: number;
}

/** Internal map: file → (lineNumber → diffPosition) */
type DiffPositionMap = Map<string, Map<number, number>>;

/**
 * Parse a unified diff and build a position lookup table.
 *
 * For each file, maps new-file line numbers to their diff positions.
 * Only added (+) and context ( ) lines have positions — removed lines don't
 * correspond to new-file line numbers.
 */
export function buildDiffPositionMap(diff: string): DiffPositionMap {
  const lines = diff.split("\n");
  const map: DiffPositionMap = new Map();

  let currentFile = "";
  let fileMap: Map<number, number> = new Map();
  let position = 0; // 1-indexed position within the current file's diff
  let lineInNewFile = 0;

  for (const line of lines) {
    // New file header: reset position counter
    if (line.startsWith("diff --git ")) {
      // Save previous file's map
      if (currentFile && fileMap.size > 0) {
        map.set(currentFile, fileMap);
      }
      currentFile = "";
      fileMap = new Map();
      position = 0;
      continue;
    }

    // Track file path from +++ header
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      continue;
    }
    if (line.startsWith("+++ ")) {
      currentFile = line.slice(4);
      continue;
    }

    // Skip --- header and index lines
    if (line.startsWith("--- ") || line.startsWith("index ")) {
      continue;
    }

    // Hunk header: extract new-file start line, increment position
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      lineInNewFile = Number(hunkMatch[1]);
      position++;
      continue;
    }

    // Added line: maps to a new-file line number
    if (line.startsWith("+")) {
      position++;
      if (currentFile) {
        fileMap.set(lineInNewFile, position);
      }
      lineInNewFile++;
      continue;
    }

    // Removed line: has a position but no new-file line number
    if (line.startsWith("-")) {
      position++;
      continue;
    }

    // Context line: has both a position and a new-file line number
    if (currentFile && position > 0) {
      position++;
      fileMap.set(lineInNewFile, position);
      lineInNewFile++;
    }
  }

  // Save last file
  if (currentFile && fileMap.size > 0) {
    map.set(currentFile, fileMap);
  }

  return map;
}

/**
 * Map a file path and line number to a GitHub review comment location.
 *
 * Returns null if the file/line is not in the diff (e.g., the line wasn't
 * changed or the file isn't part of this PR).
 */
export function mapToReviewComment(
  positionMap: DiffPositionMap,
  file: string,
  line: number,
): ReviewCommentLocation | null {
  // Try exact match first
  const fileMap = positionMap.get(file);
  if (fileMap) {
    const position = fileMap.get(line);
    if (position !== undefined) {
      return { path: file, position };
    }
    // Try nearby lines (±3) — LLM-reported line numbers can be off by a few
    for (let offset = 1; offset <= 3; offset++) {
      const above = fileMap.get(line - offset);
      if (above !== undefined) return { path: file, position: above };
      const below = fileMap.get(line + offset);
      if (below !== undefined) return { path: file, position: below };
    }
  }

  // Try with/without leading path normalization
  const normalized = file.replace(/^\.\//, "");
  if (normalized !== file) {
    return mapToReviewComment(positionMap, normalized, line);
  }

  return null;
}
