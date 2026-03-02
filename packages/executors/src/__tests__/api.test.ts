import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ClassifiedItem, TestPlanItem, TestPlanHints, ApiExecutionContext } from "@vigil/core/types";

// ---------------------------------------------------------------------------
// Mock @anthropic-ai/sdk BEFORE any imports that use it.
// Class-based mock is hoisted by JS — no vi.hoisted() needed here.
// ---------------------------------------------------------------------------

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

// Mock globalThis.fetch before importing modules that use it.
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { generateApiSpec } from "../api-spec-generator.js";
import { makeRequest, validateBaseUrl } from "../http-client.js";
import { executeApiItem } from "../api.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHints(overrides: Partial<TestPlanHints> = {}): TestPlanHints {
  return { isManual: false, codeBlocks: [], urls: [], ...overrides };
}

function makeItem(text: string, id = "tp-0"): TestPlanItem {
  return {
    id,
    text,
    checked: false,
    raw: `- [ ] ${text}`,
    indent: 0,
    hints: makeHints(),
  };
}

function makeClassified(text: string, id = "tp-0"): ClassifiedItem {
  return {
    item: makeItem(text, id),
    confidence: "HIGH",
    executorType: "api",
    category: "api",
    reasoning: "Test helper",
  };
}

const baseContext: ApiExecutionContext = {
  baseUrl: "https://pr-42.example.dev",
  timeoutMs: 5_000,
  anthropicApiKey: "test-key",
};

/** Build the Anthropic-shaped text response the mock will return. */
function mockLlmResponse(specs: unknown[]): void {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: "text", text: JSON.stringify(specs) }],
  });
}

/** Build a fetch Response-like mock. */
function mockFetchResponse(status: number, body: unknown, contentType = "application/json"): void {
  mockFetch.mockResolvedValueOnce({
    status,
    headers: { get: (h: string) => (h === "content-type" ? contentType : null) },
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  });
}

// ---------------------------------------------------------------------------
// generateApiSpec — LLM response parsing
// ---------------------------------------------------------------------------

describe("generateApiSpec", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a simple GET spec from LLM response", async () => {
    mockLlmResponse([{ method: "GET", path: "/health", expectedStatus: 200 }]);
    const specs = await generateApiSpec("GET /health returns 200", "key");
    expect(specs).toHaveLength(1);
    expect(specs[0]).toMatchObject({ method: "GET", path: "/health", expectedStatus: 200 });
  });

  it("parses a POST spec with body", async () => {
    mockLlmResponse([
      {
        method: "POST",
        path: "/api/users",
        body: { name: "Alice", email: "alice@example.com" },
        expectedStatus: 201,
      },
    ]);
    const specs = await generateApiSpec("POST /api/users with valid data returns 201", "key");
    expect(specs[0].method).toBe("POST");
    expect(specs[0].path).toBe("/api/users");
    expect(specs[0].expectedStatus).toBe(201);
    expect(specs[0].body).toMatchObject({ name: "Alice" });
  });

  it("returns empty array when LLM returns []", async () => {
    mockLlmResponse([]);
    const specs = await generateApiSpec("Verify that users can log in manually", "key");
    expect(specs).toHaveLength(0);
  });

  it("throws when LLM returns invalid JSON", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "not json at all" }],
    });
    await expect(generateApiSpec("anything", "key")).rejects.toThrow("invalid JSON");
  });

  it("throws when LLM returns non-array JSON", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"method":"GET"}' }],
    });
    await expect(generateApiSpec("anything", "key")).rejects.toThrow("not an array");
  });

  it("throws when path is a full URL (security: SSRF prevention)", async () => {
    mockLlmResponse([{ method: "GET", path: "https://evil.com/steal", expectedStatus: 200 }]);
    await expect(generateApiSpec("anything", "key")).rejects.toThrow("full URL in path");
  });

  it("throws when LLM returns an invalid HTTP method", async () => {
    mockLlmResponse([{ method: "OPTIONS", path: "/api/users", expectedStatus: 200 }]);
    await expect(generateApiSpec("anything", "key")).rejects.toThrow(/method invalid/);
  });

  it("throws when LLM returns a dangerous method (CONNECT)", async () => {
    mockLlmResponse([{ method: "CONNECT", path: "/api/users", expectedStatus: 200 }]);
    await expect(generateApiSpec("anything", "key")).rejects.toThrow(/method invalid/);
  });

  it("throws when path has path traversal", async () => {
    mockLlmResponse([{ method: "GET", path: "/../etc/passwd", expectedStatus: 200 }]);
    await expect(generateApiSpec("anything", "key")).rejects.toThrow("traversal");
  });

  it("throws when path does not start with /", async () => {
    mockLlmResponse([{ method: "GET", path: "api/users", expectedStatus: 200 }]);
    await expect(generateApiSpec("anything", "key")).rejects.toThrow("non-relative");
  });

  it("parses expectedBodyContains when present", async () => {
    mockLlmResponse([
      {
        method: "GET",
        path: "/api/status",
        expectedStatus: 200,
        expectedBodyContains: { status: "ok" },
      },
    ]);
    const specs = await generateApiSpec("GET /api/status should return {status: ok}", "key");
    expect(specs[0].expectedBodyContains).toEqual({ status: "ok" });
  });

  it("throws when LLM returns no text content block", async () => {
    mockCreate.mockResolvedValueOnce({ content: [] });
    await expect(generateApiSpec("anything", "key")).rejects.toThrow("no text content");
  });
});

// ---------------------------------------------------------------------------
// validateBaseUrl — pure security check
// ---------------------------------------------------------------------------

describe("validateBaseUrl", () => {
  it("accepts http:// URLs", () => {
    expect(() => validateBaseUrl("http://localhost:3000")).not.toThrow();
  });

  it("accepts https:// URLs", () => {
    expect(() => validateBaseUrl("https://pr-42.preview.dev")).not.toThrow();
  });

  it("rejects empty string", () => {
    expect(() => validateBaseUrl("")).toThrow("required");
  });

  it("rejects file:// protocol", () => {
    expect(() => validateBaseUrl("file:///etc/passwd")).toThrow("http://");
  });

  it("rejects path traversal", () => {
    expect(() => validateBaseUrl("https://api.dev/../secret")).toThrow("traversal");
  });
});

// ---------------------------------------------------------------------------
// makeRequest — HTTP client
// ---------------------------------------------------------------------------

describe("makeRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("makes a GET request and returns status + body", async () => {
    mockFetchResponse(200, { status: "ok" });
    const result = await makeRequest(
      { method: "GET", path: "/health", expectedStatus: 200 },
      "https://api.example.dev",
      5_000,
    );
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ status: "ok" });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("combines baseUrl and path correctly", async () => {
    mockFetchResponse(200, {});
    await makeRequest(
      { method: "GET", path: "/api/users", expectedStatus: 200 },
      "https://api.example.dev",
      5_000,
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.dev/api/users",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("strips trailing slash from baseUrl before appending path", async () => {
    mockFetchResponse(200, {});
    await makeRequest(
      { method: "GET", path: "/users", expectedStatus: 200 },
      "https://api.example.dev/",
      5_000,
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.dev/users",
      expect.any(Object),
    );
  });

  it("sends request body for POST", async () => {
    mockFetchResponse(201, { id: 1 });
    await makeRequest(
      { method: "POST", path: "/users", body: { name: "Alice" }, expectedStatus: 201 },
      "https://api.example.dev",
      5_000,
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ name: "Alice" }) }),
    );
  });

  it("does NOT send body for GET requests", async () => {
    mockFetchResponse(200, {});
    await makeRequest(
      { method: "GET", path: "/users", body: { ignored: true }, expectedStatus: 200 },
      "https://api.example.dev",
      5_000,
    );
    const call = mockFetch.mock.calls[0][1] as RequestInit;
    expect(call.body).toBeUndefined();
  });

  it("returns raw text when response is not JSON", async () => {
    mockFetchResponse(200, "plain text response", "text/plain");
    const result = await makeRequest(
      { method: "GET", path: "/", expectedStatus: 200 },
      "https://api.example.dev",
      5_000,
    );
    expect(result.body).toBe("plain text response");
  });

  it("throws on invalid baseUrl", async () => {
    await expect(
      makeRequest({ method: "GET", path: "/", expectedStatus: 200 }, "ftp://bad.url", 5_000),
    ).rejects.toThrow("http://");
  });

  it("throws with timedOut flag when AbortController fires", async () => {
    mockFetch.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => {
          (init.signal as AbortSignal).addEventListener("abort", () => {
            const err = new DOMException("aborted", "AbortError");
            reject(err);
          });
        }),
    );
    await expect(
      makeRequest({ method: "GET", path: "/slow", expectedStatus: 200 }, "https://api.dev", 1),
    ).rejects.toThrow("timed out");
  });
});

// ---------------------------------------------------------------------------
// executeApiItem — full executor
// ---------------------------------------------------------------------------

describe("executeApiItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns passed: true when request matches expected status", async () => {
    mockLlmResponse([{ method: "GET", path: "/health", expectedStatus: 200 }]);
    mockFetchResponse(200, { status: "ok" });

    const item = makeClassified("GET /health returns 200");
    const result = await executeApiItem(item, baseContext);

    expect(result.passed).toBe(true);
    expect(result.itemId).toBe("tp-0");
    const requests = (result.evidence as { requests: unknown[] }).requests;
    expect(requests).toHaveLength(1);
  });

  it("returns passed: false when status does not match", async () => {
    mockLlmResponse([{ method: "GET", path: "/api/data", expectedStatus: 200 }]);
    mockFetchResponse(500, { error: "Internal Server Error" });

    const item = makeClassified("GET /api/data returns 200");
    const result = await executeApiItem(item, baseContext);

    expect(result.passed).toBe(false);
    const req = (result.evidence as { requests: Array<{ failReason: string }> }).requests[0];
    expect(req.failReason).toContain("Expected status 200, got 500");
  });

  it("returns passed: false with error when LLM call fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("LLM API error"));

    const item = makeClassified("Some test");
    const result = await executeApiItem(item, baseContext);

    expect(result.passed).toBe(false);
    expect((result.evidence as { error: string }).error).toContain("LLM API error");
  });

  it("returns passed: false with error when LLM returns no specs", async () => {
    mockLlmResponse([]);
    const item = makeClassified("Verify by hand that it looks good");
    const result = await executeApiItem(item, baseContext);

    expect(result.passed).toBe(false);
    expect((result.evidence as { error: string }).error).toContain("No API request specs");
  });

  it("stops on first failing request in a multi-spec item", async () => {
    mockLlmResponse([
      { method: "GET", path: "/a", expectedStatus: 200 },
      { method: "GET", path: "/b", expectedStatus: 200 },
    ]);
    // First request fails
    mockFetchResponse(500, {});

    const item = makeClassified("GET /a and GET /b both return 200");
    const result = await executeApiItem(item, baseContext);

    expect(result.passed).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1); // second request was not made
  });

  it("passes when all requests in a multi-spec item succeed", async () => {
    mockLlmResponse([
      { method: "GET", path: "/a", expectedStatus: 200 },
      { method: "POST", path: "/b", body: { x: 1 }, expectedStatus: 201 },
    ]);
    mockFetchResponse(200, { ok: true });
    mockFetchResponse(201, { id: 42 });

    const item = makeClassified("GET /a returns 200, POST /b returns 201");
    const result = await executeApiItem(item, baseContext);

    expect(result.passed).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("fails when expectedBodyContains mismatch", async () => {
    mockLlmResponse([
      {
        method: "GET",
        path: "/status",
        expectedStatus: 200,
        expectedBodyContains: { status: "ok" },
      },
    ]);
    mockFetchResponse(200, { status: "error" });

    const item = makeClassified("GET /status returns 200 with status=ok");
    const result = await executeApiItem(item, baseContext);

    expect(result.passed).toBe(false);
    const req = (result.evidence as { requests: Array<{ failReason: string }> }).requests[0];
    expect(req.failReason).toContain("status");
  });

  it("itemId matches item.item.id", async () => {
    mockLlmResponse([{ method: "GET", path: "/health", expectedStatus: 200 }]);
    mockFetchResponse(200, {});

    const item = makeClassified("GET /health", "tp-99");
    const result = await executeApiItem(item, baseContext);

    expect(result.itemId).toBe("tp-99");
  });

  it("duration is a non-negative number", async () => {
    mockLlmResponse([{ method: "GET", path: "/health", expectedStatus: 200 }]);
    mockFetchResponse(200, {});

    const item = makeClassified("GET /health returns 200");
    const result = await executeApiItem(item, baseContext);

    expect(typeof result.duration).toBe("number");
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it("captures request failure in evidence when fetch throws", async () => {
    mockLlmResponse([{ method: "GET", path: "/broken", expectedStatus: 200 }]);
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

    const item = makeClassified("GET /broken returns 200");
    const result = await executeApiItem(item, baseContext);

    expect(result.passed).toBe(false);
    const req = (result.evidence as { requests: Array<{ failReason: string }> }).requests[0];
    expect(req.failReason).toContain("Connection refused");
  });
});
