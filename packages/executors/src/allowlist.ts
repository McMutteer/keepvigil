/**
 * Command allowlist for the shell executor.
 *
 * Only commands matching these patterns are permitted to run in the sandbox.
 * This prevents arbitrary code execution from untrusted test plan items.
 */

/** Patterns that match safe, known build/test commands. */
const ALLOWED_PATTERNS: RegExp[] = [
  /^npm\s+(run|test|build|install|ci)\b/,
  /^pnpm\s+(run|test|build|install|dlx)\b/,
  /^yarn\s+(run|test|build|install)\b/,
  /^bun\s+(run|test|build|install)\b/,
  /^npx\s+\S+/,
  /^ruff\s+(check|format)\b/,
  /^docker\s+(build|run|compose)\b/,
  /^make\b/,
  /^cargo\s+(test|build|check|clippy)\b/,
  /^go\s+(test|build|vet)\b/,
  /^pytest\b/,
  /^jest\b/,
  /^vitest\b/,
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

  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: true, reason: `Matches allowlist pattern` };
    }
  }

  const preview = trimmed.length > 40 ? `${trimmed.substring(0, 40)}...` : trimmed;
  return { allowed: false, reason: `Command not in allowlist: "${preview}"` };
}
