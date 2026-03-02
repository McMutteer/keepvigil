/**
 * HTTP client for the API test executor.
 *
 * Wraps `globalThis.fetch` with:
 *  - Timeout via AbortController
 *  - Automatic JSON response parsing (with fallback to raw text)
 *  - Base URL validation to prevent SSRF to arbitrary hosts
 *
 * Security:
 *  - `baseUrl` must be http:// or https:// — no file://, no protocol-relative
 *  - `baseUrl` must not contain path traversal sequences
 *  - The resulting URL is always `baseUrl + spec.path` — the LLM never controls the host
 */

import type { HttpRequestSpec } from "@vigil/core/types";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface HttpResponse {
  status: number;
  /** Parsed JSON body, or raw text if not JSON, or null if body is empty */
  body: unknown;
  durationMs: number;
}

/**
 * Validate that the base URL is a safe HTTP/HTTPS origin.
 * Throws for non-HTTP protocols, path traversal, or empty input.
 */
export function validateBaseUrl(baseUrl: string): void {
  if (!baseUrl) {
    throw new Error("baseUrl is required");
  }
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    throw new Error(`baseUrl must use http:// or https://, got: "${baseUrl}"`);
  }
  if (baseUrl.includes("..")) {
    throw new Error(`baseUrl contains path traversal: "${baseUrl}"`);
  }
}

/**
 * Execute a single HTTP request against `baseUrl + spec.path`.
 *
 * Returns the response status, parsed body, and elapsed time regardless of
 * whether the status matches the expected value — assertion is the caller's job.
 */
export async function makeRequest(
  spec: HttpRequestSpec,
  baseUrl: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<HttpResponse> {
  validateBaseUrl(baseUrl);

  const url = baseUrl.replace(/\/$/, "") + spec.path;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const startMs = Date.now();
  try {
    const init: RequestInit = {
      method: spec.method,
      headers: {
        "Content-Type": "application/json",
        ...spec.headers,
      },
      signal: controller.signal,
    };

    if (spec.body !== undefined && spec.method !== "GET" && spec.method !== "HEAD") {
      init.body = JSON.stringify(spec.body);
    }

    const response = await fetch(url, init);
    const durationMs = Date.now() - startMs;

    // Try to parse as JSON; fall back to raw text
    let body: unknown = null;
    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();
    if (text) {
      if (contentType.includes("application/json")) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      } else {
        body = text;
      }
    }

    return { status: response.status, body, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startMs;
    if (err instanceof Error && err.name === "AbortError") {
      throw Object.assign(new Error(`Request timed out after ${timeoutMs}ms: ${url}`), {
        timedOut: true,
        durationMs,
      });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
