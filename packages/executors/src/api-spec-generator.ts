/**
 * API spec generator for the API test executor.
 *
 * Translates a natural-language test plan item into a structured list of
 * `HttpRequestSpec` objects using Claude Haiku. Each spec describes a single
 * HTTP request with its expected response.
 *
 * Security: the generator only produces RELATIVE paths ("/api/users").
 * Full URLs are rejected — the base URL is always provided by the caller via
 * `ApiExecutionContext`, keeping host control out of the LLM's hands.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { HttpRequestSpec } from "@vigil/core/types";

const MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 15_000;

const SYSTEM_PROMPT = `You extract HTTP request specifications from test plan items written in natural language.

Output a JSON array of request specs. Each spec must match this schema exactly:
{
  "method": "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD",
  "path": string,          // RELATIVE path only, e.g. "/api/users". NEVER a full URL.
  "headers": object,       // optional key-value pairs
  "body": any,             // optional request body for POST/PUT/PATCH
  "expectedStatus": number, // HTTP status code that indicates success
  "expectedBodyContains": object // optional: key-value pairs that must appear in response body
}

Rules:
- "path" MUST start with "/" and MUST NOT contain "://" or start with "//"
- "expectedStatus" defaults to 200 if not mentioned
- For POST requests, generate a minimal valid request body based on context
- Return an empty array [] if no HTTP request can be extracted
- Output ONLY valid JSON — no markdown, no explanation

Examples:
- "GET /health returns 200" → [{"method":"GET","path":"/health","expectedStatus":200}]
- "POST /api/users with valid data should return 201" → [{"method":"POST","path":"/api/users","body":{"name":"Test User","email":"test@example.com"},"expectedStatus":201}]
- "Send invalid auth → GET /api/protected returns 401" → [{"method":"GET","path":"/api/protected","expectedStatus":401}]`;

/**
 * Validate that a path extracted by the LLM is safe to use.
 * Rejects full URLs, protocol-relative URLs, and path traversal.
 */
function validatePath(path: string): void {
  if (path.includes("://") || path.startsWith("//")) {
    throw new Error(`LLM returned full URL in path field: "${path}"`);
  }
  if (path.includes("..")) {
    throw new Error(`Path traversal detected in path: "${path}"`);
  }
  if (!path.startsWith("/")) {
    throw new Error(`LLM returned non-relative path: "${path}"`);
  }
}

/**
 * Parse and validate the LLM JSON response into HttpRequestSpec[].
 * Throws if the response is not a valid array of specs.
 */
function parseSpecResponse(raw: string): HttpRequestSpec[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    throw new Error(`LLM returned invalid JSON: ${raw.substring(0, 200)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`LLM response is not an array`);
  }

  return parsed.map((item: unknown, index: number) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`Spec at index ${index} is not an object`);
    }
    const spec = item as Record<string, unknown>;

    if (typeof spec.method !== "string") throw new Error(`Spec[${index}].method missing`);
    if (typeof spec.path !== "string") throw new Error(`Spec[${index}].path missing`);
    if (typeof spec.expectedStatus !== "number") {
      throw new Error(`Spec[${index}].expectedStatus missing or not a number`);
    }

    validatePath(spec.path);

    return {
      method: spec.method as HttpRequestSpec["method"],
      path: spec.path,
      headers: spec.headers as Record<string, string> | undefined,
      body: spec.body,
      expectedStatus: spec.expectedStatus,
      expectedBodyContains: spec.expectedBodyContains as
        | Record<string, unknown>
        | undefined,
    };
  });
}

/**
 * Generate HTTP request specs from a natural-language test plan item.
 *
 * Returns an empty array if the LLM determines no HTTP request can be
 * extracted. Throws on LLM or validation errors.
 */
export async function generateApiSpec(
  itemText: string,
  apiKey: string,
): Promise<HttpRequestSpec[]> {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: itemText }],
    },
    { timeout: TIMEOUT_MS },
  );

  const firstBlock = message.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    throw new Error("LLM returned no text content");
  }

  return parseSpecResponse(firstBlock.text);
}
