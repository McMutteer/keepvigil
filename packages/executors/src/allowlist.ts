/**
 * Command allowlist for the shell executor.
 *
 * Only commands matching these patterns are permitted to run in the sandbox.
 * This prevents arbitrary code execution from untrusted test plan items.
 */

/**
 * Shell metacharacters that could be used to chain or inject commands.
 * Checked before allowlist patterns — any match immediately rejects the command.
 *
 * Covers: semicolons, ampersands, pipes, backticks, $() substitution,
 * redirects, and newlines.
 */
const SHELL_METACHARACTERS = /[;&|`$<>\n\r(){}]/;

/** Patterns that match safe, known build/test commands. */
const ALLOWED_PATTERNS: RegExp[] = [
  /^npm\s+(run|test|build|install|ci)\b/,
  /^pnpm\s+(run|test|build|install|dlx)\b/,
  /^yarn\s+(run|test|build|install)\b/,
  /^bun\s+(run|test|build|install)\b/,
  // npx: restricted to known-safe dev tools only.
  // Arbitrary npx packages can execute post-install scripts with full access.
  // Flag validation applied separately via DANGEROUS_NPX_FLAGS.
  /^npx\s+(eslint|prettier|tsc|tsup|vitest|jest|playwright|biome|oxlint|svelte-check|astro|next|nuxt|turbo)\b/,
  /^ruff\s+(check|format)\b/,
  /^docker\s+(build|run|compose)\b/,
  /^make\b/,
  /^cargo\s+(test|build|check|clippy)\b/,
  /^go\s+(test|build|vet)\b/,
  /^pytest\b/,
  /^jest\b/,
  /^vitest\b/,
];

/** Dangerous npx flags that could be used to load arbitrary code */
const DANGEROUS_NPX_FLAGS = [
  "--config",
  "--resolve-plugins-relative-to",
  "--rulesdir",
  "--plugin",
  "-c",
];

export interface ValidationResult {
  allowed: boolean;
  /** Human-readable reason for the decision. */
  reason: string;
}

/**
 * Validate a shell command against the allowlist.
 *
 * Pure function — no side effects. Returns `allowed: true` if the command
 * matches any known-safe pattern, `allowed: false` otherwise.
 */
export function validateCommand(command: string): ValidationResult {
  const trimmed = command.trim();

  if (!trimmed) {
    return { allowed: false, reason: "Empty command" };
  }

  if (SHELL_METACHARACTERS.test(trimmed)) {
    return { allowed: false, reason: "Command contains shell control characters" };
  }

  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(trimmed)) {
      // Extra validation for npx: reject dangerous flags
      if (trimmed.startsWith("npx ")) {
        const args = trimmed.split(/\s+/).slice(2); // skip "npx <tool>"
        for (const arg of args) {
          const cleaned = arg.replace(/^['"]|['"]$/g, "");
          const flag = cleaned.split("=")[0];
          if (DANGEROUS_NPX_FLAGS.includes(flag)) {
            return { allowed: false, reason: `npx flag not allowed: "${flag}"` };
          }
        }
      }
      return { allowed: true, reason: `Matches allowlist pattern` };
    }
  }

  const preview = trimmed.length > 40 ? `${trimmed.substring(0, 40)}...` : trimmed;
  return { allowed: false, reason: `Command not in allowlist: "${preview}"` };
}
