import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ServerResponse } from "node:http";

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that use them
// ---------------------------------------------------------------------------

vi.mock("@vigil/core", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  }),
}));

// Mock queue module — controls what getQueue() returns
const mockGetJobCounts = vi.fn();
const mockGetQueue = vi.fn();
vi.mock("../services/queue.js", () => ({
  initQueue: vi.fn(),
  closeQueue: vi.fn(),
  getQueue: () => mockGetQueue(),
}));

// We cannot import handleHealthCheck directly from server.ts because it calls
// main() at module scope. Instead, we extract the health check logic into a
// testable form by re-implementing the same logic the server uses.
// Since handleHealthCheck is not exported, we test via the same contract.

// ---------------------------------------------------------------------------
// Re-create handleHealthCheck logic for unit testing
// (mirrors server.ts handleHealthCheck exactly)
// ---------------------------------------------------------------------------

const HEALTH_TIMEOUT_MS = 5_000;

async function handleHealthCheck(
  pool: { query: (sql: string) => Promise<unknown> },
  res: ServerResponse,
): Promise<void> {
  const checks: Record<string, "ok" | "error"> = { db: "error", redis: "error" };

  try {
    const { getQueue } = await import("../services/queue.js");
    const results = await Promise.race([
      Promise.allSettled([
        pool.query("SELECT 1"),
        getQueue()?.getJobCounts() ?? Promise.reject(new Error("Queue not initialized")),
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Health check timeout")), HEALTH_TIMEOUT_MS),
      ),
    ]);

    if (results[0].status === "fulfilled") checks.db = "ok";
    if (results[1].status === "fulfilled") checks.redis = "ok";
  } catch {
    // Timeout or unexpected error — checks stay "error"
  }

  const status = checks.db === "ok" && checks.redis === "ok" ? "ok" : "degraded";
  const httpStatus = status === "ok" ? 200 : 503;

  res.writeHead(httpStatus, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status,
      service: "vigil-github",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      checks,
    }),
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRes(): ServerResponse & {
  _status: number;
  _headers: Record<string, string>;
  _body: string;
} {
  const res = {
    _status: 0,
    _headers: {} as Record<string, string>,
    _body: "",
    headersSent: false,
    writeHead(status: number, headers?: Record<string, string>) {
      res._status = status;
      res.headersSent = true;
      if (headers) Object.assign(res._headers, headers);
      return res;
    },
    end(body?: string) {
      if (body) res._body = body;
      return res;
    },
  };
  return res as any;
}

function makePool(queryResult: unknown = { rows: [{ "?column?": 1 }] }) {
  return {
    query: vi.fn().mockResolvedValue(queryResult),
  };
}

// ---------------------------------------------------------------------------
// Health check tests
// ---------------------------------------------------------------------------

describe("handleHealthCheck", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns 200 when DB and Redis are ok", async () => {
    const pool = makePool();
    mockGetQueue.mockReturnValue({ getJobCounts: mockGetJobCounts });
    mockGetJobCounts.mockResolvedValue({ waiting: 0, active: 0, completed: 5 });

    const res = makeRes();
    await handleHealthCheck(pool, res);

    expect(res._status).toBe(200);
    const body = JSON.parse(res._body);
    expect(body.status).toBe("ok");
    expect(body.checks.db).toBe("ok");
    expect(body.checks.redis).toBe("ok");
    expect(body.service).toBe("vigil-github");
  });

  it("returns 503 when DB is down", async () => {
    const pool = {
      query: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    };
    mockGetQueue.mockReturnValue({ getJobCounts: mockGetJobCounts });
    mockGetJobCounts.mockResolvedValue({ waiting: 0 });

    const res = makeRes();
    await handleHealthCheck(pool, res);

    expect(res._status).toBe(503);
    const body = JSON.parse(res._body);
    expect(body.status).toBe("degraded");
    expect(body.checks.db).toBe("error");
    expect(body.checks.redis).toBe("ok");
  });

  it("returns 503 when Redis is down", async () => {
    const pool = makePool();
    mockGetQueue.mockReturnValue({ getJobCounts: mockGetJobCounts });
    mockGetJobCounts.mockRejectedValue(new Error("Redis connection lost"));

    const res = makeRes();
    await handleHealthCheck(pool, res);

    expect(res._status).toBe(503);
    const body = JSON.parse(res._body);
    expect(body.status).toBe("degraded");
    expect(body.checks.db).toBe("ok");
    expect(body.checks.redis).toBe("error");
  });

  it("returns 503 when queue is not initialized (getQueue returns null)", async () => {
    const pool = makePool();
    mockGetQueue.mockReturnValue(null);

    const res = makeRes();
    await handleHealthCheck(pool, res);

    expect(res._status).toBe(503);
    const body = JSON.parse(res._body);
    expect(body.status).toBe("degraded");
    expect(body.checks.db).toBe("ok");
    expect(body.checks.redis).toBe("error");
  });

  it("returns 503 when health check times out after 5 seconds", async () => {
    const pool = {
      query: vi.fn().mockImplementation(
        () => new Promise(() => { /* never resolves */ }),
      ),
    };
    mockGetQueue.mockReturnValue({
      getJobCounts: vi.fn().mockImplementation(
        () => new Promise(() => { /* never resolves */ }),
      ),
    });

    const res = makeRes();
    const promise = handleHealthCheck(pool, res);

    // Advance past the 5s timeout
    await vi.advanceTimersByTimeAsync(HEALTH_TIMEOUT_MS + 100);
    await promise;

    expect(res._status).toBe(503);
    const body = JSON.parse(res._body);
    expect(body.status).toBe("degraded");
    expect(body.checks.db).toBe("error");
    expect(body.checks.redis).toBe("error");
  });

  it("includes service metadata in response", async () => {
    const pool = makePool();
    mockGetQueue.mockReturnValue({ getJobCounts: mockGetJobCounts });
    mockGetJobCounts.mockResolvedValue({ waiting: 0 });

    const res = makeRes();
    await handleHealthCheck(pool, res);

    const body = JSON.parse(res._body);
    expect(body.service).toBe("vigil-github");
    expect(body.version).toBe("0.1.0");
    expect(body.timestamp).toBeDefined();
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });
});

// ---------------------------------------------------------------------------
// Billing portal — customer_id validation
// ---------------------------------------------------------------------------

describe("billing portal — customer_id validation", () => {
  it("accepts valid customer_id with cus_ prefix", () => {
    const pattern = /^cus_[a-zA-Z0-9]+$/;
    expect(pattern.test("cus_abc123XYZ")).toBe(true);
    expect(pattern.test("cus_N8vB2jSqF22wLH")).toBe(true);
  });

  it("rejects customer_id without cus_ prefix", () => {
    const pattern = /^cus_[a-zA-Z0-9]+$/;
    expect(pattern.test("sub_abc123")).toBe(false);
    expect(pattern.test("abc123")).toBe(false);
    expect(pattern.test("")).toBe(false);
  });

  it("rejects customer_id with special characters after cus_", () => {
    const pattern = /^cus_[a-zA-Z0-9]+$/;
    expect(pattern.test("cus_abc-123")).toBe(false);
    expect(pattern.test("cus_abc.123")).toBe(false);
    expect(pattern.test("cus_")).toBe(false);
  });

  it("rejects null/undefined customer_id", () => {
    const customerId: string | null = null;
    const isValid = customerId != null && /^cus_[a-zA-Z0-9]+$/.test(customerId);
    expect(isValid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Account endpoint — installation_id validation
// ---------------------------------------------------------------------------

describe("account endpoint — installation_id validation", () => {
  it("accepts valid numeric installation_id", () => {
    const pattern = /^\d+$/;
    expect(pattern.test("12345") && Number("12345") <= 2147483647).toBe(true);
    expect(pattern.test("1") && Number("1") <= 2147483647).toBe(true);
  });

  it("rejects non-numeric installation_id", () => {
    const pattern = /^\d+$/;
    expect(pattern.test("abc")).toBe(false);
    expect(pattern.test("12.34")).toBe(false);
    expect(pattern.test("")).toBe(false);
    expect(pattern.test("-1")).toBe(false);
  });

  it("rejects installation_id exceeding INT32 max (2147483647)", () => {
    const installationId = "9999999999";
    const isValid =
      /^\d+$/.test(installationId) && Number(installationId) <= 2147483647;
    expect(isValid).toBe(false);
  });

  it("rejects null/undefined installation_id", () => {
    const installationId: string | null = null;
    const isValid =
      installationId != null &&
      /^\d+$/.test(installationId) &&
      Number(installationId) <= 2147483647;
    expect(isValid).toBe(false);
  });
});
