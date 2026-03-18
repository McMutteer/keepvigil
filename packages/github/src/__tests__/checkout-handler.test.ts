import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleCheckout } from "../services/checkout.js";
import type { AppConfig } from "../config.js";

// Mock @vigil/core
vi.mock("@vigil/core", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    githubAppId: "123",
    githubPrivateKey: "key",
    githubWebhookSecret: "secret",
    groqApiKey: "",
    groqModel: "",
    stripeGatewayUrl: "https://gateway.example.com",
    stripeGatewayApiKey: "sk_test_123",
    stripeForwardingSecret: "",
    stripeProPriceId: "price_pro_123",
    stripeTeamPriceId: "price_team_456",
    port: 3200,
    nodeEnv: "test",
    ...overrides,
  } as AppConfig;
}

function makeReq(url: string, host = "keepvigil.dev"): IncomingMessage {
  return {
    url,
    headers: { host },
  } as unknown as IncomingMessage;
}

function makeRes(): ServerResponse & {
  _status: number;
  _headers: Record<string, string>;
  _body: string;
} {
  const res = {
    _status: 0,
    _headers: {} as Record<string, string>,
    _body: "",
    writeHead(status: number, headers?: Record<string, string>) {
      res._status = status;
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleCheckout — checkout handler", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("fetch should not be called"),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Valid plans create checkout sessions
  // -------------------------------------------------------------------------

  it("creates checkout session for 'pro' plan and redirects 303", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { url: "https://checkout.stripe.com/pro_sess" } }),
        { status: 200 },
      ),
    );

    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=42&account=McMutteer"),
      res,
      makeConfig(),
    );

    expect(res._status).toBe(303);
    expect(res._headers.Location).toBe("https://checkout.stripe.com/pro_sess");

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.lineItems[0].price).toBe("price_pro_123");
    expect(body.metadata.plan).toBe("pro");
  });

  it("creates checkout session for 'team' plan and redirects 303", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { url: "https://checkout.stripe.com/team_sess" } }),
        { status: 200 },
      ),
    );

    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=team&installation_id=7&account=org-test"),
      res,
      makeConfig(),
    );

    expect(res._status).toBe(303);
    expect(res._headers.Location).toBe("https://checkout.stripe.com/team_sess");

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.lineItems[0].price).toBe("price_team_456");
    expect(body.metadata.plan).toBe("team");
  });

  // -------------------------------------------------------------------------
  // Invalid plan rejected
  // -------------------------------------------------------------------------

  it("rejects invalid plan with 400", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=enterprise&installation_id=1&account=foo"),
      res,
      makeConfig(),
    );

    expect(res._status).toBe(400);
    expect(JSON.parse(res._body).error).toContain("Invalid plan");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects empty plan with 400", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?installation_id=1&account=foo"),
      res,
      makeConfig(),
    );

    expect(res._status).toBe(400);
    expect(JSON.parse(res._body).error).toContain("Invalid plan");
  });

  // -------------------------------------------------------------------------
  // Missing installation_id / account rejected
  // -------------------------------------------------------------------------

  it("rejects missing installation_id with 400", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&account=foo"),
      res,
      makeConfig(),
    );

    expect(res._status).toBe(400);
    expect(JSON.parse(res._body).error).toContain("Missing required fields");
  });

  it("rejects missing account with 400", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1"),
      res,
      makeConfig(),
    );

    expect(res._status).toBe(400);
    expect(JSON.parse(res._body).error).toContain("Missing required fields");
  });

  it("rejects when both installation_id and account are missing", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro"),
      res,
      makeConfig(),
    );

    expect(res._status).toBe(400);
    expect(JSON.parse(res._body).error).toContain("Missing required fields");
  });

  // -------------------------------------------------------------------------
  // Timeout handling (AbortController)
  // -------------------------------------------------------------------------

  it("returns 500 when fetch is aborted (timeout)", async () => {
    fetchSpy.mockRejectedValue(
      new DOMException("The operation was aborted", "AbortError"),
    );

    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=foo"),
      res,
      makeConfig(),
    );

    expect(res._status).toBe(500);
    expect(JSON.parse(res._body).error).toBe("Internal error");
  });

  it("passes an AbortSignal to fetch", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { url: "https://stripe.com/x" } }),
        { status: 200 },
      ),
    );

    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=user"),
      makeRes(),
      makeConfig(),
    );

    const options = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  // -------------------------------------------------------------------------
  // Gateway not configured returns 503
  // -------------------------------------------------------------------------

  it("returns 503 when stripeGatewayUrl is empty", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=foo"),
      res,
      makeConfig({ stripeGatewayUrl: "" }),
    );

    expect(res._status).toBe(503);
    expect(JSON.parse(res._body).error).toContain("Billing not configured");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 503 when stripeGatewayApiKey is empty", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=foo"),
      res,
      makeConfig({ stripeGatewayApiKey: "" }),
    );

    expect(res._status).toBe(503);
    expect(JSON.parse(res._body).error).toContain("Billing not configured");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Gateway error returns 502
  // -------------------------------------------------------------------------

  it("returns 502 when gateway responds with 500", async () => {
    fetchSpy.mockResolvedValue(
      new Response("Internal Server Error", { status: 500 }),
    );

    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=foo"),
      res,
      makeConfig(),
    );

    expect(res._status).toBe(502);
    expect(JSON.parse(res._body).error).toContain("Billing service unavailable");
  });

  it("returns 502 when gateway responds with 503", async () => {
    fetchSpy.mockResolvedValue(
      new Response("Service Unavailable", { status: 503 }),
    );

    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=foo"),
      res,
      makeConfig(),
    );

    expect(res._status).toBe(502);
    expect(JSON.parse(res._body).error).toContain("Billing service unavailable");
  });

  // -------------------------------------------------------------------------
  // Success returns 303 redirect
  // -------------------------------------------------------------------------

  it("returns 303 with Location header pointing to Stripe checkout URL", async () => {
    const stripeUrl = "https://checkout.stripe.com/c/pay_session_abc123";
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { url: stripeUrl } }),
        { status: 200 },
      ),
    );

    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=100&account=testorg"),
      res,
      makeConfig(),
    );

    expect(res._status).toBe(303);
    expect(res._headers.Location).toBe(stripeUrl);
    // Body should be empty on redirect
    expect(res._body).toBe("");
  });

  it("returns 500 when gateway returns success:true but missing URL", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }),
    );

    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=foo"),
      res,
      makeConfig(),
    );

    expect(res._status).toBe(500);
    expect(JSON.parse(res._body).error).toContain("Failed to create checkout session");
  });
});
