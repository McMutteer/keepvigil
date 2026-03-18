/**
 * Command allowlist for the shell executor.
 *
 * Only commands matching these patterns are permitted to run in the sandbox.
 * This prevents arbitrary code execution from untrusted test plan items.
 */

/**
 * Dangerous shell metacharacters that immediately reject a command.
 * Does NOT include `&` — we allow `&&` chains with per-segment validation.
 *
 * Covers: semicolons, pipes, backticks, $() substitution,
 * redirects, and newlines.
 */
const DANGEROUS_METACHARACTERS = /[;|`$<>\n\r(){}]/;

/**
 * Legacy export — used by vigil-config.ts to reject metacharacters in
 * custom allowlist prefixes. Points to DANGEROUS_METACHARACTERS (same set
 * minus `&`, which is safe in that context too since prefixes are single
 * commands, not chains).
 */
export const SHELL_METACHARACTERS = DANGEROUS_METACHARACTERS;

/** Patterns that match safe, known build/test commands. */
const ALLOWED_PATTERNS: RegExp[] = [
  /^npm\s+(run|test|build|install|ci|lint)\b/,
  /^pnpm\s+(run|test|build|install|dlx|lint|typecheck)\b/,
  /^pnpm\s+(--filter|-r|--recursive)\s/,
  /^yarn\s+(run|test|build|install|lint)\b/,
  /^bun\s+(run|test|build|install|lint)\b/,
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
 * Check a command against allowlist patterns and custom prefixes.
 * Shared logic used by both single-command and chain validation.
 */
function matchAgainstAllowlist(cmd: string, extraAllowPrefixes: string[]): ValidationResult | null {
  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(cmd)) {
      // Extra validation for npx: reject dangerous flags
      if (cmd.startsWith("npx ")) {
        const args = cmd.split(/\s+/).slice(2); // skip "npx <tool>"
        for (const raw of args) {
          // Strip surrounding quotes, then check each potential flag.
          // Also check the raw arg — `eslint="--config=x"` should not bypass.
          const cleaned = raw.replace(/^['"]|['"]$/g, "");
          const candidates = [cleaned, ...cleaned.split("=")];
          for (const candidate of candidates) {
            if (DANGEROUS_NPX_FLAGS.includes(candidate)) {
              return { allowed: false, reason: `npx flag not allowed: "${candidate}"` };
            }
          }
        }
      }
      return { allowed: true, reason: "Matches allowlist pattern" };
    }
  }

  // Check custom prefixes from .vigil.yml.
  // Require a word boundary after the prefix: the command must equal the prefix
  // exactly, or be followed by whitespace. This prevents "echo" from matching "echoevil".
  for (const prefix of extraAllowPrefixes) {
    if (cmd === prefix || cmd.startsWith(prefix + " ")) {
      return { allowed: true, reason: "Matches custom allowlist prefix" };
    }
  }

  return null; // No match
}

/**
 * Validate a shell command against the allowlist.
 *
 * Pure function — no side effects. Returns `allowed: true` if the command
 * matches any known-safe pattern or an extra prefix from .vigil.yml.
 *
 * @param command - The shell command to validate
 * @param extraAllowPrefixes - Additional command prefixes from .vigil.yml shell.allow
 */
export function validateCommand(command: string, extraAllowPrefixes: string[] = []): ValidationResult {
  const trimmed = command.trim();

  if (!trimmed) {
    return { allowed: false, reason: "Empty command" };
  }

  // Handle `&&` chains: split into segments and validate each independently
  if (trimmed.includes("&&")) {
    // First check for truly dangerous metacharacters (everything except `&`)
    if (DANGEROUS_METACHARACTERS.test(trimmed)) {
      return { allowed: false, reason: "Command contains shell control characters" };
    }
    return validateChain(trimmed, extraAllowPrefixes);
  }

  // Single command: check for dangerous metacharacters (& without && is also blocked here
  // since standalone `&` means background execution)
  if (DANGEROUS_METACHARACTERS.test(trimmed) || trimmed.includes("&")) {
    return { allowed: false, reason: "Command contains shell control characters" };
  }

  const result = matchAgainstAllowlist(trimmed, extraAllowPrefixes);
  if (result) return result;

  const preview = trimmed.length > 40 ? `${trimmed.substring(0, 40)}...` : trimmed;
  return { allowed: false, reason: `Command not in allowlist: "${preview}"` };
}

// ---------------------------------------------------------------------------
// && chain validation
// ---------------------------------------------------------------------------

/**
 * Validate a `&&`-chained command by splitting into segments.
 * `cd <path>` segments are always allowed (just a directory change) but
 * the path must not contain `..` (path traversal).
 * All other segments must pass the normal allowlist check.
 */
function validateChain(command: string, extraAllowPrefixes: string[]): ValidationResult {
  const segments = command.split("&&").map(s => s.trim());

  for (const segment of segments) {
    if (!segment) {
      return { allowed: false, reason: "Empty segment in && chain" };
    }

    // `cd <path>` is safe as long as there's no path traversal or absolute paths
    if (/^cd\s+/.test(segment)) {
      const cdPathRaw = segment.replace(/^cd\s+/, "").trim();
      // Strip surrounding quotes so `cd "/etc"` is caught
      const cdPath = cdPathRaw.replace(/^['"]|['"]$/g, "");
      if (cdPath.includes("..")) {
        return { allowed: false, reason: `Path traversal not allowed in cd: "${segment}"` };
      }
      if (cdPath.startsWith("/") || cdPath.startsWith("~") || /^[a-zA-Z]:[\\/]/.test(cdPath)) {
        return { allowed: false, reason: `Absolute paths not allowed in cd: "${segment}"` };
      }
      continue;
    }

    // Other segments: validate against the allowlist
    const result = matchAgainstAllowlist(segment, extraAllowPrefixes);
    if (!result) {
      const preview = segment.length > 40 ? `${segment.substring(0, 40)}...` : segment;
      return { allowed: false, reason: `Command not in allowlist: "${preview}"` };
    }
    if (!result.allowed) return result;
  }

  return { allowed: true, reason: "All segments in && chain pass allowlist" };
}
