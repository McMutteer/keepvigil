/**
 * Metadata checker — validates OG tags and JSON-LD without a browser.
 *
 * OG meta tags and JSON-LD must be in the initial HTML response (for crawlers),
 * so we can validate them with a simple fetch + regex parse.
 * This is faster and more deterministic than spinning up Playwright.
 */

import type { ClassifiedItem, ExecutionResult, MetadataExecutionContext } from "@vigil/core/types";
import { validateBaseUrl } from "./http-client.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_HTML_LENGTH = 1_048_576; // 1 MB — limit to prevent regex DoS on huge pages

/** Standard OG tags that should be present on well-formed pages */
const EXPECTED_OG_TAGS = ["og:title", "og:description", "og:image", "og:url"];

export interface MetadataResult {
  ogTags: Record<string, string>;
  jsonLd: unknown[];
  missingOgTags: string[];
  jsonLdValid: boolean;
  jsonLdErrors: string[];
  htmlTitle: string | null;
}

/** Extract OG meta tags from raw HTML using regex */
function extractOgTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const pattern = /<meta\s+(?:property|name)=["'](og:[^"']+)["']\s+content=["']([^"']*)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    tags[match[1].toLowerCase()] = match[2];
  }
  // Also handle reversed attribute order: content before property
  const reversedPattern = /<meta\s+content=["']([^"']*)["']\s+(?:property|name)=["'](og:[^"']+)["']/gi;
  while ((match = reversedPattern.exec(html)) !== null) {
    tags[match[2].toLowerCase()] = match[1];
  }
  return tags;
}

/** Extract JSON-LD blocks from raw HTML */
function extractJsonLd(html: string): { parsed: unknown[]; errors: string[] } {
  const parsed: unknown[] = [];
  const errors: string[] = [];
  const pattern = /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([^<]*(?:<(?!\/script>)[^<]*)*)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    try {
      parsed.push(JSON.parse(match[1].trim()));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Invalid JSON-LD: ${msg}`);
    }
  }
  return { parsed, errors };
}

/** Extract <title> content from raw HTML */
function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return match ? match[1].trim() : null;
}

/**
 * Fetch a page and extract metadata (OG tags, JSON-LD, HTML title).
 * Never throws — returns structured results with any errors captured.
 */
export async function checkMetadata(
  path: string,
  baseUrl: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<MetadataResult> {
  try {
    validateBaseUrl(baseUrl);
  } catch {
    return {
      ogTags: {},
      jsonLd: [],
      missingOgTags: EXPECTED_OG_TAGS,
      jsonLdValid: false,
      jsonLdErrors: [`Invalid base URL: ${baseUrl}`],
      htmlTitle: null,
    };
  }

  const url = baseUrl.replace(/\/$/, "") + path;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return {
        ogTags: {},
        jsonLd: [],
        missingOgTags: EXPECTED_OG_TAGS,
        jsonLdValid: false,
        jsonLdErrors: [`Fetch failed with status ${response.status}`],
        htmlTitle: null,
      };
    }
    const rawHtml = await response.text();
    const html = rawHtml.length > MAX_HTML_LENGTH ? rawHtml.slice(0, MAX_HTML_LENGTH) : rawHtml;

    const ogTags = extractOgTags(html);
    const missingOgTags = EXPECTED_OG_TAGS.filter((tag) => !ogTags[tag]);
    const { parsed: jsonLd, errors: jsonLdErrors } = extractJsonLd(html);
    const htmlTitle = extractTitle(html);

    return {
      ogTags,
      jsonLd,
      missingOgTags,
      jsonLdValid: jsonLdErrors.length === 0,
      jsonLdErrors,
      htmlTitle,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ogTags: {},
      jsonLd: [],
      missingOgTags: EXPECTED_OG_TAGS,
      jsonLdValid: false,
      jsonLdErrors: [`Fetch failed: ${msg}`],
      htmlTitle: null,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Execute a metadata-category classified item.
 * Wraps checkMetadata into the ExecutionResult shape.
 *
 * Pass criteria: at least og:title is present AND all JSON-LD blocks are valid JSON.
 */
export async function executeMetadataItem(
  item: ClassifiedItem,
  context: MetadataExecutionContext,
): Promise<ExecutionResult> {
  const startMs = Date.now();
  const itemId = item.item.id;

  // Extract a path from the item hints or default to "/"
  let path = "/";
  const hintedUrl = item.item.hints.urls[0];
  if (hintedUrl) {
    try {
      path = new URL(hintedUrl).pathname || "/";
    } catch {
      path = "/";
    }
  }

  const result = await checkMetadata(path, context.baseUrl, context.timeoutMs);

  // Pass if og:title exists and all JSON-LD is valid
  const passed = Boolean(result.ogTags["og:title"]) && result.jsonLdValid;

  return {
    itemId,
    passed,
    duration: Date.now() - startMs,
    evidence: result as unknown as Record<string, unknown>,
  };
}
