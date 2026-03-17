import type { TestPlanItem, ClassifiedItem } from "../types.js";

/**
 * Shell command prefixes that indicate a deterministic build/test step.
 * Matched against the start of inline code blocks.
 */
const SHELL_COMMAND_PREFIXES = [
  "npm",
  "pnpm",
  "yarn",
  "bun",
  "npx",
  "ruff",
  "docker",
  "make",
  "cargo",
  "go ",
  "pytest",
  "jest",
  "vitest",
];

/**
 * Pattern to detect curl commands in code blocks.
 * Curl is treated as an API call (HIGH/api) rather than a shell command.
 */
const CURL_PATTERN = /^curl\s/;

/**
 * Pattern to detect file paths with known extensions in code blocks.
 * Matches paths like "src/auth.ts", "packages/api/Dockerfile", "config.yml".
 */
const FILE_PATH_PATTERN = /^[a-zA-Z0-9._/-]+\.(ts|tsx|js|jsx|py|go|rs|java|yml|yaml|json|toml|sql|sh|prisma|graphql|css|scss|html|dockerfile)$/i;

/**
 * Pattern to detect paths without extension but with directory separators.
 * Matches paths like "packages/api/Dockerfile", "src/lib/Makefile".
 */
const FILE_REF_PATTERN = /^[a-zA-Z0-9._/-]*\/[a-zA-Z0-9._-]+$/;

/**
 * Pattern to detect HTTP verb + path in item text.
 * Matches: GET /api/foo, POST /users, etc.
 * Requires a slash followed by a non-space path segment.
 */
const HTTP_VERB_PATH_PATTERN =
  /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\/\S+/i;

/**
 * Pattern to detect HTTP status code references: "returns 200", "returns 4xx", etc.
 * Matches both numeric codes (200, 401) and range shorthand (4xx, 5xx).
 */
const STATUS_CODE_PATTERN = /\breturns?\s+(?:[2-5]\d{2}|[45]xx)\b(?!\s+(?:items?|rows?|records?|results?|entries|bytes?))/i;

/**
 * Attempt to classify a test plan item using deterministic rules.
 *
 * Returns a ClassifiedItem if a rule matches, or null if the item
 * should be deferred to the LLM classifier.
 *
 * Rule priority:
 * 1. Manual items → SKIP / none / "manual"
 * 2. Code blocks with curl → HIGH / api / "api"
 * 3. Code blocks with shell commands → DETERMINISTIC / shell / "build"
 * 4. Text with HTTP verb + path → HIGH / api / "api"
 * 5. No match → null (deferred to LLM)
 */
export function applyRules(item: TestPlanItem): ClassifiedItem | null {
  // Rule 1: Manual items
  if (item.hints.isManual) {
    return {
      item,
      confidence: "SKIP",
      executorType: "none",
      category: "manual",
      reasoning: "Item has Manual: prefix — requires human action",
    };
  }

  // Rule 2, 3, 3b: Code blocks — check file paths FIRST, then commands
  if (item.hints.codeBlocks.length > 0) {
    for (const block of item.hints.codeBlocks) {
      const trimmed = block.trim();

      // Rule 2b: File path assertions (checked BEFORE shell commands)
      // Prevents "docker-compose.prod.yml" from matching the "docker" shell prefix
      if (FILE_PATH_PATTERN.test(trimmed) || FILE_REF_PATTERN.test(trimmed)) {
        return {
          item,
          confidence: "HIGH",
          executorType: "assertion",
          category: "assertion",
          reasoning: "File path reference — will verify assertion against file contents",
        };
      }

      // Rule 2: curl → API call
      if (CURL_PATTERN.test(trimmed)) {
        return {
          item,
          confidence: "HIGH",
          executorType: "api",
          category: "api",
          reasoning: "Code block contains curl command",
        };
      }

      // Rule 3: Shell commands → deterministic build step
      for (const prefix of SHELL_COMMAND_PREFIXES) {
        if (trimmed.startsWith(prefix)) {
          return {
            item,
            confidence: "DETERMINISTIC",
            executorType: "shell",
            category: "build",
            reasoning: `Code block matches shell command pattern: ${prefix}`,
          };
        }
      }

    }
  }

  // Rule 4: HTTP verb + path pattern in text
  if (HTTP_VERB_PATH_PATTERN.test(item.text)) {
    return {
      item,
      confidence: "HIGH",
      executorType: "api",
      category: "api",
      reasoning: "Text contains HTTP verb + path pattern",
    };
  }

  // Supporting signal: status code references without verb
  // Still indicates an API-related item
  if (STATUS_CODE_PATTERN.test(item.text) && item.hints.urls.length === 0) {
    return {
      item,
      confidence: "HIGH",
      executorType: "api",
      category: "api",
      reasoning: "Text references HTTP status code",
    };
  }

  // No rule matched — defer to LLM
  return null;
}
