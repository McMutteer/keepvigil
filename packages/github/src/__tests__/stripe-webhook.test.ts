import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import { setStripeWebhookDeps, handleStripeWebhook } from "../webhooks/stripe.js";

// Mock @vigil/core
vi.mock("@vigil/core", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock subscription service
const mockUpsert = vi.fn().mockResolvedValue(undefined);
vi.mock("../services/subscription.js", () => ({
  upsertSubscription: (...args: unknown[]) => mockUpsert(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_SECRET = "whsec_test_secret_key";

function sign(payload: string): string {
  return createHmac("sha256", TEST_SECRET).update(payload).digest("hex");
}

function makeReq(body: string, signature?: string) {
  const chunks = [Buffer.from(body)];
  let consumed = false;
  return {
    headers: {
      "x-forwarding-signature": signature,
      "content-type": "application/json",
    },
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (consumed) return { done: true, value: undefined };
          consumed = true;
          return { done: false, value: chunks[0] };
        },
      };
    },
  } as unknown as import("node:http").IncomingMessage;
}

function makeRes() {
  let status = 0;
  let body = "";
  const headers: Record<string, string> = {};
  return {
    writeHead(code: number, h?: Record<string, string>) {
      status = code;
      if (h) Object.assign(headers, h);
    },
    end(data?: string) {
      if (data) body = data;
    },
    get status() { return status; },
    get body() { return body; },
    get headers() { return headers; },
  } as unknown as import("node:http").ServerResponse & { status: number; body: string; headers: Record<string, string> };
}

const mockDb = {} as unknown as import("@vigil/core/db").Database;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("stripe webhook handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStripeWebhookDeps(mockDb, TEST_SECRET);
  });

  describe("configuration", () => {
    it("returns 500 when deps not configured", async () => {
      setStripeWebhookDeps(null as never, "");
      const res = makeRes();
      await handleStripeWebhook(makeReq("{}", "sig"), res);
      expect(res.status).toBe(500);
      expect(JSON.parse(res.body).error).toContain("not configured");
    });
  });

  describe("signature verification", () => {
    it("rejects missing signature", async () => {
      const res = makeRes();
      await handleStripeWebhook(makeReq("{}", undefined), res);
      expect(res.status).toBe(401);
      expect(JSON.parse(res.body).error).toContain("Invalid signature");
    });

    it("rejects invalid signature", async () => {
      const res = makeRes();
      await handleStripeWebhook(makeReq("{}", "invalid_signature_hex"), res);
      expect(res.status).toBe(401);
    });

    it("rejects signature with wrong secret", async () => {
      const payload = JSON.stringify({ type: "test", data: {} });
      const wrongSig = createHmac("sha256", "wrong_secret").update(payload).digest("hex");
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, wrongSig), res);
      expect(res.status).toBe(401);
    });

    it("accepts valid signature", async () => {
      const payload = JSON.stringify({ type: "unknown.event", data: {} });
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, sign(payload)), res);
      expect(res.status).toBe(200);
    });
  });

  describe("body parsing", () => {
    it("rejects invalid JSON", async () => {
      const body = "not json at all";
      const res = makeRes();
      await handleStripeWebhook(makeReq(body, sign(body)), res);
      expect(res.status).toBe(400);
      expect(JSON.parse(res.body).error).toContain("Invalid JSON");
    });
  });

  describe("checkout.session.completed", () => {
    it("upserts subscription with correct data", async () => {
      const payload = JSON.stringify({
        type: "checkout.session.completed",
        data: {
          customer: "cus_123",
          subscription: "sub_456",
          metadata: {
            installationId: "114114042",
            accountLogin: "McMutteer",
            plan: "pro",
          },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, sign(payload)), res);

      expect(res.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(mockDb, {
        installationId: 114114042,
        accountLogin: "McMutteer",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_456",
        plan: "pro",
        status: "active",
      });
    });

    it("skips when installationId missing in metadata", async () => {
      const payload = JSON.stringify({
        type: "checkout.session.completed",
        data: {
          customer: "cus_123",
          metadata: {},
        },
      });
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, sign(payload)), res);

      expect(res.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("defaults plan to pro when not specified", async () => {
      const payload = JSON.stringify({
        type: "checkout.session.completed",
        data: {
          customer: "cus_123",
          subscription: "sub_456",
          metadata: { installationId: "999" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, sign(payload)), res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        plan: "pro",
        accountLogin: "unknown",
      }));
    });
  });

  describe("customer.subscription.updated", () => {
    it("upserts with status and period end", async () => {
      const periodEnd = Math.floor(Date.now() / 1000) + 86400;
      const payload = JSON.stringify({
        type: "customer.subscription.updated",
        data: {
          id: "sub_789",
          customer: "cus_123",
          status: "active",
          current_period_end: periodEnd,
          metadata: {
            installationId: "114114042",
            accountLogin: "McMutteer",
            plan: "team",
          },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, sign(payload)), res);

      expect(res.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        installationId: 114114042,
        stripeSubscriptionId: "sub_789",
        plan: "team",
        status: "active",
        currentPeriodEnd: new Date(periodEnd * 1000),
      }));
    });

    it("skips when installationId missing", async () => {
      const payload = JSON.stringify({
        type: "customer.subscription.updated",
        data: { id: "sub_789", customer: "cus_123", metadata: {} },
      });
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, sign(payload)), res);
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.deleted", () => {
    it("sets plan to free and status to canceled", async () => {
      const payload = JSON.stringify({
        type: "customer.subscription.deleted",
        data: {
          customer: "cus_123",
          metadata: {
            installationId: "114114042",
            accountLogin: "McMutteer",
          },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, sign(payload)), res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        plan: "free",
        status: "canceled",
        stripeCustomerId: "cus_123",
      }));
    });
  });

  describe("invoice.payment_failed", () => {
    it("sets status to past_due", async () => {
      const payload = JSON.stringify({
        type: "invoice.payment_failed",
        data: {
          customer: "cus_123",
          subscription: "sub_456",
          subscription_details: {
            metadata: {
              installationId: "114114042",
              accountLogin: "McMutteer",
              plan: "pro",
            },
          },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, sign(payload)), res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        status: "past_due",
        stripeSubscriptionId: "sub_456",
      }));
    });

    it("skips when installationId missing in nested metadata", async () => {
      const payload = JSON.stringify({
        type: "invoice.payment_failed",
        data: {
          customer: "cus_123",
          subscription_details: { metadata: {} },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, sign(payload)), res);
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("returns 500 when upsert throws", async () => {
      mockUpsert.mockRejectedValueOnce(new Error("DB connection failed"));
      const payload = JSON.stringify({
        type: "checkout.session.completed",
        data: {
          customer: "cus_123",
          subscription: "sub_456",
          metadata: { installationId: "999" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, sign(payload)), res);

      expect(res.status).toBe(500);
      expect(JSON.parse(res.body).error).toContain("Processing failed");
    });
  });

  describe("unknown events", () => {
    it("returns 200 for unhandled event types", async () => {
      const payload = JSON.stringify({
        type: "customer.created",
        data: { id: "cus_new" },
      });
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, sign(payload)), res);
      expect(res.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });
});
