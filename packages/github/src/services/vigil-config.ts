/**
 * Parser and validator for `.vigil.yml` per-repo configuration files.
 *
 * Design principles:
 *  - Lenient: malformed YAML or unknown fields never throw — fall back to defaults
 *  - Secure: shell allow-prefixes are validated against the metacharacter blocklist
 *  - Bounded: all array/value inputs are clamped to prevent abuse
 *
 * Usage:
 *   const config = parseVigilConfig(yamlString);   // always returns a valid VigilConfig
 *   const config = parseVigilConfig(undefined);     // returns {} (all defaults)
 */

import { parse as parseYaml } from "yaml";
import type { CategoryLabel, ViewportSpec, VigilConfig } from "@vigil/core/types";

/** Valid category labels (must stay in sync with CategoryLabel type) */
const VALID_CATEGORIES = new Set<string>([
  "build", "api", "ui-flow", "visual", "metadata", "manual", "vague",
]);

/** Shell metacharacters — same set used in allowlist.ts */
const SHELL_METACHARACTERS = /[;&|`$<>\n\r(){}]/;

/** Maximum values to prevent abuse */
const MAX_TIMEOUT_SHELL_S = 3600;   // 1 hour
const MAX_TIMEOUT_API_S = 300;      // 5 minutes
const MAX_TIMEOUT_BROWSER_S = 600;  // 10 minutes
const MAX_VIEWPORTS = 10;
const MAX_SHELL_ALLOW = 20;

/**
 * Parse and validate a `.vigil.yml` YAML string.
 *
 * Returns a `VigilConfig` with only the fields that were present and valid.
 * Fields that are absent, invalid, or out of range are silently omitted
 * so executors fall back to their hardcoded defaults.
 */
export function parseVigilConfig(yamlStr: string | undefined): VigilConfig {
  if (!yamlStr?.trim()) return {};

  let raw: unknown;
  try {
    raw = parseYaml(yamlStr);
  } catch {
    // Malformed YAML — ignore, use defaults
    return {};
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};

  const obj = raw as Record<string, unknown>;

  // Reject unsupported versions
  if (obj.version !== undefined && obj.version !== 1) return {};

  const config: VigilConfig = {};

  // --- timeouts ---
  if (typeof obj.timeouts === "object" && obj.timeouts !== null && !Array.isArray(obj.timeouts)) {
    const t = obj.timeouts as Record<string, unknown>;
    const timeouts: VigilConfig["timeouts"] = {};

    if (typeof t.shell === "number" && t.shell > 0 && t.shell <= MAX_TIMEOUT_SHELL_S) {
      timeouts.shell = Math.floor(t.shell);
    }
    if (typeof t.api === "number" && t.api > 0 && t.api <= MAX_TIMEOUT_API_S) {
      timeouts.api = Math.floor(t.api);
    }
    if (typeof t.browser === "number" && t.browser > 0 && t.browser <= MAX_TIMEOUT_BROWSER_S) {
      timeouts.browser = Math.floor(t.browser);
    }

    if (Object.keys(timeouts).length > 0) config.timeouts = timeouts;
  }

  // --- skip ---
  if (typeof obj.skip === "object" && obj.skip !== null && !Array.isArray(obj.skip)) {
    const s = obj.skip as Record<string, unknown>;
    if (Array.isArray(s.categories)) {
      const cats = s.categories
        .filter((c): c is string => typeof c === "string" && VALID_CATEGORIES.has(c))
        .map((c) => c as CategoryLabel);
      if (cats.length > 0) config.skip = { categories: cats };
    }
  }

  // --- viewports ---
  if (Array.isArray(obj.viewports)) {
    const vps: ViewportSpec[] = obj.viewports
      .filter(
        (vp): vp is Record<string, unknown> =>
          typeof vp === "object" &&
          vp !== null &&
          !Array.isArray(vp) &&
          typeof (vp as Record<string, unknown>).label === "string" &&
          typeof (vp as Record<string, unknown>).width === "number" &&
          typeof (vp as Record<string, unknown>).height === "number" &&
          (vp as Record<string, unknown>).width > 0 &&
          (vp as Record<string, unknown>).width <= 3840 &&
          (vp as Record<string, unknown>).height > 0 &&
          (vp as Record<string, unknown>).height <= 2160,
      )
      .slice(0, MAX_VIEWPORTS)
      .map((vp) => ({
        label: String(vp.label),
        width: Math.floor(Number(vp.width)),
        height: Math.floor(Number(vp.height)),
      }));

    if (vps.length > 0) config.viewports = vps;
  }

  // --- shell.allow ---
  if (typeof obj.shell === "object" && obj.shell !== null && !Array.isArray(obj.shell)) {
    const s = obj.shell as Record<string, unknown>;
    if (Array.isArray(s.allow)) {
      const allowed = s.allow
        .filter(
          (cmd): cmd is string =>
            typeof cmd === "string" &&
            cmd.trim().length > 0 &&
            !SHELL_METACHARACTERS.test(cmd),
        )
        .slice(0, MAX_SHELL_ALLOW)
        .map((cmd) => cmd.trim());

      if (allowed.length > 0) config.shell = { allow: allowed };
    }
  }

  return config;
}
