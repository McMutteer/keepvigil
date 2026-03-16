/**
 * API test executor — runs `api` classified test plan items.
 *
 * Accepts a `ClassifiedItem` with `executorType: "api"`, uses Claude Haiku
 * to extract HTTP request specs from the natural-language item text, then
 * executes each request against the preview deployment URL.
 *
 * Evidence shape (stored in ExecutionResult.evidence):
 *   {
 *     requests: Array<{
 *       spec:      HttpRequestSpec;  // the generated request spec
 *       status:    number;           // actual HTTP status received
 *       body:      unknown;          // response body (JSON or text, max 1KB)
 *       durationMs: number;
 *       passed:    boolean;
 *       failReason?: string;
 *     }>;
 *   }
 */

import type {
  ApiExecutionContext,
  ClassifiedItem,
  ExecutionResult,
  HttpRequestSpec,
} from "@vigil/core/types";
import { generateApiSpec } from "./api-spec-generator.js";
import { makeRequest } from "./http-client.js";

const MAX_BODY_CHARS = 1024;

/** Truncate response body to avoid oversized evidence payloads. */
function truncateBody(body: unknown): unknown {
  if (typeof body === "string" && body.length > MAX_BODY_CHARS) {
    return body.substring(0, MAX_BODY_CHARS) + "…(truncated)";
  }
  if (typeof body === "object" && body !== null) {
    const json = JSON.stringify(body);
    if (json.length > MAX_BODY_CHARS) {
      return json.substring(0, MAX_BODY_CHARS) + "…(truncated)";
    }
  }
  return body;
}

/**
 * Assert that a response matches the spec's expectations.
 * Returns `null` on success, or a human-readable failure reason.
 */
function assertResponse(
  spec: HttpRequestSpec,
  status: number,
  body: unknown,
): string | null {
  if (status !== spec.expectedStatus) {
    return `Expected status ${spec.expectedStatus}, got ${status}`;
  }

  if (spec.expectedBodyContains) {
    const bodyObj = typeof body === "object" && body !== null ? body : {};
    for (const [key, value] of Object.entries(spec.expectedBodyContains)) {
      if ((bodyObj as Record<string, unknown>)[key] !== value) {
        return `Expected body.${key} to equal ${JSON.stringify(value)}, got ${JSON.stringify((bodyObj as Record<string, unknown>)[key])}`;
      }
    }
  }

  return null;
}

/**
 * Execute a classified API test item.
 *
 * Generates specs via LLM, then executes each request sequentially.
 * Stops on the first failure. Returns detailed evidence for every
 * request attempted.
 */
export async function executeApiItem(
  item: ClassifiedItem,
  context: ApiExecutionContext,
): Promise<ExecutionResult> {
  const itemId = item.item.id;
  const startMs = Date.now();
  const timeoutMs = context.timeoutMs ?? 30_000;

  let specs: HttpRequestSpec[];
  try {
    specs = await generateApiSpec(item.item.text, context.llm);
  } catch (err) {
    return {
      itemId,
      passed: false,
      duration: Date.now() - startMs,
      evidence: {
        requests: [],
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }

  if (specs.length === 0) {
    return {
      itemId,
      passed: false,
      duration: Date.now() - startMs,
      evidence: {
        requests: [],
        error: "No API request specs could be extracted from the test plan item",
      },
    };
  }

  const requestEvidence: Array<{
    spec: HttpRequestSpec;
    status: number;
    body: unknown;
    durationMs: number;
    passed: boolean;
    failReason?: string;
  }> = [];

  for (const spec of specs) {
    let status: number;
    let body: unknown;
    let durationMs: number;

    try {
      const response = await makeRequest(spec, context.baseUrl, timeoutMs);
      status = response.status;
      body = truncateBody(response.body);
      durationMs = response.durationMs;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      requestEvidence.push({
        spec,
        status: -1,
        body: null,
        durationMs: 0,
        passed: false,
        failReason: `Request failed: ${msg}`,
      });
      return {
        itemId,
        passed: false,
        duration: Date.now() - startMs,
        evidence: { requests: requestEvidence },
      };
    }

    const failReason = assertResponse(spec, status, body);
    requestEvidence.push({
      spec,
      status,
      body,
      durationMs,
      passed: failReason === null,
      ...(failReason ? { failReason } : {}),
    });

    if (failReason !== null) {
      return {
        itemId,
        passed: false,
        duration: Date.now() - startMs,
        evidence: { requests: requestEvidence },
      };
    }
  }

  return {
    itemId,
    passed: true,
    duration: Date.now() - startMs,
    evidence: { requests: requestEvidence },
  };
}
