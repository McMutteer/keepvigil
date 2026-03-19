/**
 * Parser and validator for `.vigil.yml` per-repo configuration files.
 *
 * Design principles:
 *  - Lenient: malformed YAML or unknown fields never throw — fall back to defaults
 *  - Bounded: all array/value inputs are clamped to prevent abuse
 *  - Transparent: all rejected values are collected in `warnings` for user feedback
 */

import { parse as parseYaml } from "yaml";
import type { VigilConfig } from "@vigil/core/types";

const MAX_NOTIFICATION_URLS = 5;
const VALID_NOTIFICATION_ON = new Set(["failure", "always"]);

/** Result of parsing a .vigil.yml file. */
export interface VigilConfigResult {
  config: VigilConfig;
  warnings: string[];
}

/**
 * Parse and validate a `.vigil.yml` YAML string.
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

  if (obj.version !== undefined && obj.version !== 1) {
    return {
      config: {},
      warnings: [`\`.vigil.yml\` version ${String(obj.version)} is not supported (only version 1) — using defaults`],
    };
  }

  const config: VigilConfig = {};

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
