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

describe("handleCheckout", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Config validation
  // -------------------------------------------------------------------------

  it("returns 503 when stripeGatewayUrl is not configured", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=foo"),
      res,
      makeConfig({ stripeGatewayUrl: "" }),
    );
    expect(res._status).toBe(503);
    expect(JSON.parse(res._body).error).toContain("Billing not configured");
  });

  it("returns 503 when stripeGatewayApiKey is not configured", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=foo"),
      res,
      makeConfig({ stripeGatewayApiKey: "" }),
    );
    expect(res._status).toBe(503);
    expect(JSON.parse(res._body).error).toContain("Billing not configured");
  });

  // -------------------------------------------------------------------------
  // Parameter validation
  // -------------------------------------------------------------------------

  it("returns 400 for invalid plan", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=enterprise&installation_id=1&account=foo"),
      res,
      makeConfig(),
    );
    expect(res._status).toBe(400);
    expect(JSON.parse(res._body).error).toContain("Invalid plan");
  });

  it("returns 400 for missing plan", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?installation_id=1&account=foo"),
      res,
      makeConfig(),
    );
    expect(res._status).toBe(400);
    expect(JSON.parse(res._body).error).toContain("Invalid plan");
  });

  it("returns 400 for missing installation_id", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&account=foo"),
      res,
      makeConfig(),
    );
    expect(res._status).toBe(400);
    expect(JSON.parse(res._body).error).toContain("Missing required fields");
  });

  it("returns 400 for missing account", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1"),
      res,
      makeConfig(),
    );
    expect(res._status).toBe(400);
    expect(JSON.parse(res._body).error).toContain("Missing required fields");
  });

  // -------------------------------------------------------------------------
  // Price ID configuration
  // -------------------------------------------------------------------------

  it("returns 500 when pro price is not configured", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=foo"),
      res,
      makeConfig({ stripeProPriceId: "" }),
    );
    expect(res._status).toBe(500);
    expect(JSON.parse(res._body).error).toContain("Price not configured");
  });

  it("returns 500 when team price is not configured", async () => {
    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=team&installation_id=1&account=foo"),
      res,
      makeConfig({ stripeTeamPriceId: "" }),
    );
    expect(res._status).toBe(500);
    expect(JSON.parse(res._body).error).toContain("Price not configured");
  });

  // -------------------------------------------------------------------------
  // Successful checkout — redirects to Stripe
  // -------------------------------------------------------------------------

  it("returns 303 redirect on successful checkout session creation", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { url: "https://checkout.stripe.com/sess_123" } }), { status: 200 }),
    );

    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=42&account=McMutteer"),
      res,
      makeConfig(),
    );

    expect(res._status).toBe(303);
    expect(res._headers.Location).toBe("https://checkout.stripe.com/sess_123");
  });

  it("sends correct payload to stripe gateway", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { url: "https://stripe.com/x" } }), { status: 200 }),
    );

    const config = makeConfig();
    await handleCheckout(
      makeReq("/api/checkout?plan=team&installation_id=99&account=testuser"),
      makeRes(),
      config,
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://gateway.example.com/checkout/sessions");
    expect((options as RequestInit).method).toBe("POST");

    const headers = (options as RequestInit).headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk_test_123");

    const body = JSON.parse((options as RequestInit).body as string);
    expect(body.mode).toBe("subscription");
    expect(body.lineItems[0].price).toBe("price_team_456");
    expect(body.metadata.installationId).toBe("99");
    expect(body.metadata.accountLogin).toBe("testuser");
    expect(body.metadata.plan).toBe("team");
  });

  it("uses pro price ID for pro plan", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { url: "https://stripe.com/x" } }), { status: 200 }),
    );

    const config = makeConfig();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=user"),
      makeRes(),
      config,
    );

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.lineItems[0].price).toBe("price_pro_123");
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  it("returns 502 when gateway returns non-OK status", async () => {
    fetchSpy.mockResolvedValue(new Response("Internal Server Error", { status: 500 }));

    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=foo"),
      res,
      makeConfig(),
    );
    expect(res._status).toBe(502);
    expect(JSON.parse(res._body).error).toContain("Billing service unavailable");
  });

  it("returns 500 when gateway returns success:false", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ success: false }), { status: 200 }),
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

  it("returns 500 when gateway returns success:true but no URL", async () => {
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

  it("returns 500 on network error", async () => {
    fetchSpy.mockRejectedValue(new Error("ECONNREFUSED"));

    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=foo"),
      res,
      makeConfig(),
    );
    expect(res._status).toBe(500);
    expect(JSON.parse(res._body).error).toBe("Internal error");
  });

  it("returns 500 on abort (timeout)", async () => {
    fetchSpy.mockRejectedValue(new DOMException("The operation was aborted", "AbortError"));

    const res = makeRes();
    await handleCheckout(
      makeReq("/api/checkout?plan=pro&installation_id=1&account=foo"),
      res,
      makeConfig(),
    );
    expect(res._status).toBe(500);
    expect(JSON.parse(res._body).error).toBe("Internal error");
  });
});
