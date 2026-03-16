/**
 * Parser and validator for `.vigil.yml` per-repo configuration files.
 *
 * Design principles:
 *  - Lenient: malformed YAML or unknown fields never throw — fall back to defaults
 *  - Secure: shell allow-prefixes are validated against the metacharacter blocklist
 *  - Bounded: all array/value inputs are clamped to prevent abuse
 *  - Transparent: all rejected values are collected in `warnings` for user feedback
 *
 * Usage:
 *   const { config, warnings } = parseVigilConfig(yamlString);
 *   const { config } = parseVigilConfig(undefined);  // returns { config: {}, warnings: [] }
 */

import { parse as parseYaml } from "yaml";
import type { CategoryLabel, LLMProvider, ViewportSpec, VigilConfig } from "@vigil/core/types";
import { SHELL_METACHARACTERS } from "@vigil/executors";

/** Valid category labels (must stay in sync with CategoryLabel type) */
const VALID_CATEGORIES = new Set<string>([
  "build", "api", "ui-flow", "visual", "metadata", "manual", "vague",
]);

/** Maximum values to prevent abuse */
const MAX_TIMEOUT_SHELL_S = 3600;   // 1 hour
const MAX_TIMEOUT_API_S = 300;      // 5 minutes
const MAX_TIMEOUT_BROWSER_S = 600;  // 10 minutes
const MAX_VIEWPORTS = 10;
const MAX_SHELL_ALLOW = 20;
const MAX_NOTIFICATION_URLS = 5;
const VALID_NOTIFICATION_ON = new Set(["failure", "always"]);
const VALID_LLM_PROVIDERS = new Set<string>(["openai", "groq", "ollama"]);

/**
 * Convert a raw numeric value to a bounded positive integer.
 * Returns undefined if the value is not a number, not finite, floors to 0,
 * or falls outside [1, max]. Prevents 0.4 → floor(0.4) = 0 silent failures.
 */
function toBoundedInt(value: unknown, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const n = Math.floor(value);
  return n >= 1 && n <= max ? n : undefined;
}

/** Result of parsing a .vigil.yml file. */
export interface VigilConfigResult {
  /** The validated configuration — only fields that were present and valid. */
  config: VigilConfig;
  /**
   * Human-readable warnings for each field that was rejected or clamped.
   * Empty when the config is fully valid (or absent).
   */
  warnings: string[];
}

/**
 * Parse and validate a `.vigil.yml` YAML string.
 *
 * Returns a `VigilConfigResult` with:
 * - `config`: fields that were present and valid (invalid/out-of-range fields omitted)
 * - `warnings`: one message per rejected value, suitable for display in a PR comment
 */
export function parseVigilConfig(yamlStr: string | undefined): VigilConfigResult {
  if (!yamlStr?.trim()) return { config: {}, warnings: [] };

  let raw: unknown;
  try {
    raw = parseYaml(yamlStr);
  } catch {
    return { config: {}, warnings: ["`.vigil.yml` has invalid YAML syntax — using defaults"] };
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { config: {}, warnings: ["`.vigil.yml` root must be a YAML mapping — using defaults"] };
  }

  const obj = raw as Record<string, unknown>;
  const warnings: string[] = [];

  // Reject unsupported versions
  if (obj.version !== undefined && obj.version !== 1) {
    return {
      config: {},
      warnings: [`\`.vigil.yml\` version ${String(obj.version)} is not supported (only version 1) — using defaults`],
    };
  }

  const config: VigilConfig = {};

  // --- timeouts ---
  if (typeof obj.timeouts === "object" && obj.timeouts !== null && !Array.isArray(obj.timeouts)) {
    const t = obj.timeouts as Record<string, unknown>;
    const timeouts: VigilConfig["timeouts"] = {};

    if (t.shell !== undefined) {
      const shell = toBoundedInt(t.shell, MAX_TIMEOUT_SHELL_S);
      if (shell !== undefined) {
        timeouts.shell = shell;
      } else {
        warnings.push(`\`timeouts.shell\`: ${JSON.stringify(t.shell)} is invalid (must be 1–${MAX_TIMEOUT_SHELL_S}s) — using default`);
      }
    }

    if (t.api !== undefined) {
      const api = toBoundedInt(t.api, MAX_TIMEOUT_API_S);
      if (api !== undefined) {
        timeouts.api = api;
      } else {
        warnings.push(`\`timeouts.api\`: ${JSON.stringify(t.api)} is invalid (must be 1–${MAX_TIMEOUT_API_S}s) — using default`);
      }
    }

    if (t.browser !== undefined) {
      const browser = toBoundedInt(t.browser, MAX_TIMEOUT_BROWSER_S);
      if (browser !== undefined) {
        timeouts.browser = browser;
      } else {
        warnings.push(`\`timeouts.browser\`: ${JSON.stringify(t.browser)} is invalid (must be 1–${MAX_TIMEOUT_BROWSER_S}s) — using default`);
      }
    }

    if (Object.keys(timeouts).length > 0) config.timeouts = timeouts;
  }

  // --- skip ---
  if (typeof obj.skip === "object" && obj.skip !== null && !Array.isArray(obj.skip)) {
    const s = obj.skip as Record<string, unknown>;
    if (Array.isArray(s.categories)) {
      const validCats: CategoryLabel[] = [];
      for (const c of s.categories) {
        if (typeof c === "string" && VALID_CATEGORIES.has(c)) {
          validCats.push(c as CategoryLabel);
        } else {
          warnings.push(`\`skip.categories\`: ${JSON.stringify(c)} is not a recognized category — ignored`);
        }
      }
      if (validCats.length > 0) config.skip = { categories: validCats };
    }
  }

  // --- viewports ---
  if (Array.isArray(obj.viewports)) {
    const vps: ViewportSpec[] = [];
    for (let i = 0; i < obj.viewports.length; i++) {
      const vp = obj.viewports[i];
      if (typeof vp !== "object" || vp === null || Array.isArray(vp)) {
        warnings.push(`\`viewports[${i}]\`: must be an object — ignored`);
        continue;
      }
      const v = vp as Record<string, unknown>;
      const label = v.label;
      const width = v.width;
      const height = v.height;

      if (typeof label !== "string" || label.trim().length === 0) {
        warnings.push(`\`viewports[${i}]\`: label must be a non-empty string — ignored`);
        continue;
      }
      const w = toBoundedInt(width, 3840);
      if (w === undefined) {
        warnings.push(`\`viewports[${i}]\` (${label}): width ${JSON.stringify(width)} is invalid (must be 1–3840) — ignored`);
        continue;
      }
      const h = toBoundedInt(height, 2160);
      if (h === undefined) {
        warnings.push(`\`viewports[${i}]\` (${label}): height ${JSON.stringify(height)} is invalid (must be 1–2160) — ignored`);
        continue;
      }

      if (vps.length >= MAX_VIEWPORTS) {
        warnings.push(`\`viewports\`: limited to ${MAX_VIEWPORTS} entries — remaining entries ignored`);
        break;
      }
      vps.push({ label: label.trim(), width: w, height: h });
    }
    if (vps.length > 0) config.viewports = vps;
  }

  // --- shell.allow ---
  if (typeof obj.shell === "object" && obj.shell !== null && !Array.isArray(obj.shell)) {
    const s = obj.shell as Record<string, unknown>;
    if (Array.isArray(s.allow)) {
      const allowed: string[] = [];
      for (let i = 0; i < s.allow.length; i++) {
        const cmd = s.allow[i];
        if (typeof cmd !== "string" || cmd.trim().length === 0) {
          warnings.push(`\`shell.allow[${i}]\`: must be a non-empty string — ignored`);
          continue;
        }
        if (SHELL_METACHARACTERS.test(cmd)) {
          warnings.push(`\`shell.allow[${i}]\`: \`${cmd}\` contains shell metacharacters — rejected for security`);
          continue;
        }
        if (allowed.length >= MAX_SHELL_ALLOW) {
          warnings.push(`\`shell.allow\`: limited to ${MAX_SHELL_ALLOW} entries — remaining entries ignored`);
          break;
        }
        allowed.push(cmd.trim());
      }
      if (allowed.length > 0) {
        config.shell = { ...config.shell, allow: allowed };
      }
    }

    if (typeof s.image === "string" && s.image.trim().length > 0) {
      const image = s.image.trim();
      // Same validation as sandbox.ts VALID_IMAGE_NAME
      if (/^(?!-)[\w./-]+(:\w[\w.-]*)?(@sha256:[0-9a-f]{64})?$/.test(image)) {
        config.shell = { ...config.shell, image };
      } else {
        warnings.push(`\`shell.image\`: \`${image}\` is not a valid Docker image name — using default`);
      }
    }
  }

  // --- llm ---
  if (typeof obj.llm === "object" && obj.llm !== null && !Array.isArray(obj.llm)) {
    const l = obj.llm as Record<string, unknown>;
    const llm: NonNullable<VigilConfig["llm"]> = {};

    if (l.provider !== undefined) {
      if (typeof l.provider === "string" && VALID_LLM_PROVIDERS.has(l.provider)) {
        llm.provider = l.provider as LLMProvider;
      } else {
        warnings.push(`\`llm.provider\`: ${JSON.stringify(l.provider)} is invalid (must be "openai", "groq", or "ollama") — ignored`);
      }
    }

    if (l.model !== undefined) {
      if (typeof l.model === "string" && l.model.trim().length > 0) {
        llm.model = l.model.trim();
      } else {
        warnings.push(`\`llm.model\`: must be a non-empty string — ignored`);
      }
    }

    if (l.api_key !== undefined) {
      if (typeof l.api_key === "string" && l.api_key.trim().length > 0) {
        llm.apiKey = l.api_key.trim();
      } else {
        warnings.push(`\`llm.api_key\`: must be a non-empty string — ignored`);
      }
    }

    if (Object.keys(llm).length > 0) config.llm = llm;
  }

  // --- notifications ---
  if (typeof obj.notifications === "object" && obj.notifications !== null && !Array.isArray(obj.notifications)) {
    const n = obj.notifications as Record<string, unknown>;
    const notifications: NonNullable<VigilConfig["notifications"]> = {};

    if (n.on !== undefined) {
      if (typeof n.on === "string" && VALID_NOTIFICATION_ON.has(n.on)) {
        notifications.on = n.on as "failure" | "always";
      } else {
        warnings.push(`\`notifications.on\`: ${JSON.stringify(n.on)} is invalid (must be "failure" or "always") — using default "failure"`);
      }
    }

    if (Array.isArray(n.urls)) {
      const validUrls: string[] = [];
      for (let i = 0; i < n.urls.length; i++) {
        const url = n.urls[i];
        if (typeof url !== "string" || url.trim().length === 0) {
          warnings.push(`\`notifications.urls[${i}]\`: must be a non-empty string — ignored`);
          continue;
        }
        const trimmed = url.trim();
        let parsed: URL;
        try {
          parsed = new URL(trimmed);
        } catch {
          warnings.push(`\`notifications.urls[${i}]\`: must be a valid URL — ignored`);
          continue;
        }
        if (parsed.protocol !== "https:") {
          warnings.push(`\`notifications.urls[${i}]\`: must use https:// — ignored`);
          continue;
        }
        if (validUrls.length >= MAX_NOTIFICATION_URLS) {
          warnings.push(`\`notifications.urls\`: limited to ${MAX_NOTIFICATION_URLS} entries — remaining entries ignored`);
          break;
        }
        validUrls.push(trimmed);
      }
      if (validUrls.length > 0) notifications.urls = validUrls;
    }

    if (Object.keys(notifications).length > 0) config.notifications = notifications;
  }

  return { config, warnings };
}
