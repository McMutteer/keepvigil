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

/** Loopback/link-local hosts to block SSRF */
const BLOCKED_HOSTS = [
  "localhost",
  "localhost.",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
];

/** RFC1918 + link-local IPv4 */
const PRIVATE_IPV4_PATTERN =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})$/;

/** IPv6 private (fc00::/7) and link-local (fe80::/10) */
const PRIVATE_IPV6_PATTERN = /^(\[?)(fc|fd|fe[89ab])/i;

/**
 * Validate that the base URL is a safe HTTP/HTTPS origin.
 * Throws for non-HTTP protocols, path traversal, SSRF targets, or empty input.
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

  const url = new URL(baseUrl);
  if (url.username || url.password) {
    throw new Error("baseUrl must not contain credentials");
  }
  if (BLOCKED_HOSTS.includes(url.hostname)) {
    throw new Error(`baseUrl must not target localhost: "${url.hostname}"`);
  }
  if (PRIVATE_IPV4_PATTERN.test(url.hostname)) {
    throw new Error(`baseUrl must not target private IP ranges: "${url.hostname}"`);
  }
  if (PRIVATE_IPV6_PATTERN.test(url.hostname)) {
    throw new Error(`baseUrl must not target private IP ranges: "${url.hostname}"`);
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

    // Parse response body based on content type
    let body: unknown = null;
    const contentType = response.headers.get("content-type") ?? "";
    const contentLength = response.headers.get("content-length");

    // Skip reading binary responses to avoid corruption
    const isBinary = /^(image|audio|video|application\/octet-stream|application\/pdf|application\/zip)/i.test(contentType);
    if (isBinary) {
      body = `<binary content, ${contentLength ?? "unknown"} bytes>`;
    } else {
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
