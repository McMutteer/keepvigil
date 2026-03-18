import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Database } from "@vigil/core/db";
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

const TEST_SECRET = "whsec_test_secret_key_handler";

function sign(payload: string, secret = TEST_SECRET): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function makeReq(body: string, signature?: string): IncomingMessage {
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
  } as unknown as IncomingMessage;
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
  } as unknown as ServerResponse & { status: number; body: string; headers: Record<string, string> };
}

function signedRequest(event: { type: string; data: Record<string, unknown> }) {
  const payload = JSON.stringify(event);
  return { payload, req: makeReq(payload, sign(payload)) };
}

const mockDb = {} as unknown as Database;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("stripe webhook handler (comprehensive)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStripeWebhookDeps(mockDb, TEST_SECRET);
  });

  // -------------------------------------------------------------------------
  // verifySignature — HMAC-SHA256 validation
  // -------------------------------------------------------------------------
  describe("verifySignature", () => {
    it("accepts a valid HMAC-SHA256 signature", async () => {
      const payload = JSON.stringify({ type: "test.event", data: {} });
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, sign(payload)), res);
      expect(res.status).toBe(200);
    });

    it("rejects when signature header is missing (undefined)", async () => {
      const res = makeRes();
      await handleStripeWebhook(makeReq("{}", undefined), res);
      expect(res.status).toBe(401);
      expect(JSON.parse(res.body).error).toBe("Invalid signature");
    });

    it("rejects when signature header is empty string", async () => {
      const res = makeRes();
      await handleStripeWebhook(makeReq("{}", ""), res);
      expect(res.status).toBe(401);
    });

    it("rejects signature computed with wrong secret", async () => {
      const payload = JSON.stringify({ type: "ping", data: {} });
      const wrongSig = sign(payload, "totally_wrong_secret");
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, wrongSig), res);
      expect(res.status).toBe(401);
    });

    it("rejects signature with length mismatch (shorter)", async () => {
      const res = makeRes();
      await handleStripeWebhook(makeReq("{}", "abcdef"), res);
      expect(res.status).toBe(401);
    });

    it("rejects signature with length mismatch (longer)", async () => {
      const payload = JSON.stringify({ type: "x", data: {} });
      const validSig = sign(payload);
      const longerSig = validSig + "deadbeef";
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, longerSig), res);
      expect(res.status).toBe(401);
    });

    it("rejects when forwardingSecret is cleared (empty string)", async () => {
      setStripeWebhookDeps(mockDb, "");
      const payload = JSON.stringify({ type: "test", data: {} });
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, sign(payload)), res);
      // Empty forwardingSecret means deps not fully configured → 500
      expect(res.status).toBe(500);
    });

    it("is sensitive to payload changes (tampered body)", async () => {
      const original = JSON.stringify({ type: "test", data: { amount: 100 } });
      const tampered = JSON.stringify({ type: "test", data: { amount: 999 } });
      const sigForOriginal = sign(original);
      const res = makeRes();
      await handleStripeWebhook(makeReq(tampered, sigForOriginal), res);
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // Configuration guard
  // -------------------------------------------------------------------------
  describe("configuration guard", () => {
    it("returns 500 when db is null", async () => {
      setStripeWebhookDeps(null as never, TEST_SECRET);
      const res = makeRes();
      await handleStripeWebhook(makeReq("{}"), res);
      expect(res.status).toBe(500);
      expect(JSON.parse(res.body).error).toContain("not configured");
    });

    it("returns 500 when forwardingSecret is falsy", async () => {
      setStripeWebhookDeps(mockDb, "");
      const res = makeRes();
      await handleStripeWebhook(makeReq("{}"), res);
      expect(res.status).toBe(500);
    });

    it("returns JSON content-type on 500", async () => {
      setStripeWebhookDeps(null as never, "");
      const res = makeRes();
      await handleStripeWebhook(makeReq("{}"), res);
      expect(res.headers["Content-Type"]).toBe("application/json");
    });
  });

  // -------------------------------------------------------------------------
  // Body parsing
  // -------------------------------------------------------------------------
  describe("body parsing", () => {
    it("rejects non-JSON body with 400", async () => {
      const body = "this is not JSON";
      const res = makeRes();
      await handleStripeWebhook(makeReq(body, sign(body)), res);
      expect(res.status).toBe(400);
      expect(JSON.parse(res.body).error).toBe("Invalid JSON");
    });

    it("rejects truncated JSON with 400", async () => {
      const body = '{"type": "test"';
      const res = makeRes();
      await handleStripeWebhook(makeReq(body, sign(body)), res);
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // checkout.session.completed
  // -------------------------------------------------------------------------
  describe("checkout.session.completed", () => {
    it("upserts subscription with all metadata fields", async () => {
      const { req } = signedRequest({
        type: "checkout.session.completed",
        data: {
          customer: "cus_ABC",
          subscription: "sub_XYZ",
          metadata: {
            installationId: "42",
            accountLogin: "TestOrg",
            plan: "team",
          },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledOnce();
      expect(mockUpsert).toHaveBeenCalledWith(mockDb, {
        installationId: "42",
        accountLogin: "TestOrg",
        stripeCustomerId: "cus_ABC",
        stripeSubscriptionId: "sub_XYZ",
        plan: "team",
        status: "active",
      });
    });

    it("always sets status to 'active' regardless of any other data", async () => {
      const { req } = signedRequest({
        type: "checkout.session.completed",
        data: {
          customer: "cus_1",
          subscription: "sub_1",
          status: "incomplete",
          metadata: { installationId: "1", plan: "pro" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        status: "active",
      }));
    });

    it("defaults plan to 'pro' when metadata.plan is absent", async () => {
      const { req } = signedRequest({
        type: "checkout.session.completed",
        data: {
          customer: "cus_1",
          subscription: "sub_1",
          metadata: { installationId: "10" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        plan: "pro",
      }));
    });

    it("defaults accountLogin to 'unknown' when missing", async () => {
      const { req } = signedRequest({
        type: "checkout.session.completed",
        data: {
          customer: "cus_1",
          subscription: "sub_1",
          metadata: { installationId: "10" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        accountLogin: "unknown",
      }));
    });

    it("skips upsert when installationId is missing from metadata", async () => {
      const { req } = signedRequest({
        type: "checkout.session.completed",
        data: {
          customer: "cus_1",
          subscription: "sub_1",
          metadata: { accountLogin: "Foo" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("skips upsert when metadata object is undefined", async () => {
      const { req } = signedRequest({
        type: "checkout.session.completed",
        data: {
          customer: "cus_1",
          subscription: "sub_1",
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("skips upsert when metadata is empty object", async () => {
      const { req } = signedRequest({
        type: "checkout.session.completed",
        data: {
          customer: "cus_1",
          metadata: {},
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("passes installationId as string", async () => {
      const { req } = signedRequest({
        type: "checkout.session.completed",
        data: {
          customer: "cus_1",
          subscription: "sub_1",
          metadata: { installationId: "114114042" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        installationId: "114114042",
      }));
    });
  });

  // -------------------------------------------------------------------------
  // customer.subscription.updated
  // -------------------------------------------------------------------------
  describe("customer.subscription.updated", () => {
    it("upserts with status, plan, and currentPeriodEnd", async () => {
      const periodEnd = 1700000000;
      const { req } = signedRequest({
        type: "customer.subscription.updated",
        data: {
          id: "sub_updated",
          customer: "cus_U",
          status: "active",
          current_period_end: periodEnd,
          metadata: {
            installationId: "55",
            accountLogin: "OrgName",
            plan: "team",
          },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(mockDb, {
        installationId: "55",
        accountLogin: "OrgName",
        stripeCustomerId: "cus_U",
        stripeSubscriptionId: "sub_updated",
        plan: "team",
        status: "active",
        currentPeriodEnd: new Date(periodEnd * 1000),
      });
    });

    it("handles trialing status", async () => {
      const { req } = signedRequest({
        type: "customer.subscription.updated",
        data: {
          id: "sub_trial",
          customer: "cus_T",
          status: "trialing",
          metadata: { installationId: "77", plan: "pro" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        status: "trialing",
      }));
    });

    it("omits currentPeriodEnd when not present in data", async () => {
      const { req } = signedRequest({
        type: "customer.subscription.updated",
        data: {
          id: "sub_no_period",
          customer: "cus_NP",
          status: "active",
          metadata: { installationId: "88" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        currentPeriodEnd: undefined,
      }));
    });

    it("skips upsert when installationId is missing", async () => {
      const { req } = signedRequest({
        type: "customer.subscription.updated",
        data: {
          id: "sub_no_inst",
          customer: "cus_NI",
          status: "active",
          metadata: {},
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("skips upsert when metadata is undefined", async () => {
      const { req } = signedRequest({
        type: "customer.subscription.updated",
        data: {
          id: "sub_no_meta",
          customer: "cus_NM",
          status: "active",
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("defaults plan to 'pro' when not in metadata", async () => {
      const { req } = signedRequest({
        type: "customer.subscription.updated",
        data: {
          id: "sub_default",
          customer: "cus_D",
          status: "active",
          metadata: { installationId: "33" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        plan: "pro",
        accountLogin: "unknown",
      }));
    });

    it("uses sub.id (not sub.subscription) as stripeSubscriptionId", async () => {
      const { req } = signedRequest({
        type: "customer.subscription.updated",
        data: {
          id: "sub_correct_id",
          customer: "cus_C",
          status: "active",
          subscription: "sub_wrong_field",
          metadata: { installationId: "44" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        stripeSubscriptionId: "sub_correct_id",
      }));
    });
  });

  // -------------------------------------------------------------------------
  // customer.subscription.deleted
  // -------------------------------------------------------------------------
  describe("customer.subscription.deleted", () => {
    it("downgrades to free plan with canceled status", async () => {
      const { req } = signedRequest({
        type: "customer.subscription.deleted",
        data: {
          customer: "cus_DEL",
          metadata: {
            installationId: "100",
            accountLogin: "DeletedOrg",
          },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(mockDb, {
        installationId: "100",
        accountLogin: "DeletedOrg",
        stripeCustomerId: "cus_DEL",
        plan: "free",
        status: "canceled",
      });
    });

    it("ignores plan from metadata and always sets free", async () => {
      const { req } = signedRequest({
        type: "customer.subscription.deleted",
        data: {
          customer: "cus_FORCE",
          metadata: {
            installationId: "101",
            plan: "team",
          },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        plan: "free",
        status: "canceled",
      }));
    });

    it("does not include stripeSubscriptionId in upsert", async () => {
      const { req } = signedRequest({
        type: "customer.subscription.deleted",
        data: {
          id: "sub_deleted",
          customer: "cus_X",
          metadata: { installationId: "102" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      const callArgs = mockUpsert.mock.calls[0][1];
      expect(callArgs).not.toHaveProperty("stripeSubscriptionId");
    });

    it("skips upsert when installationId missing", async () => {
      const { req } = signedRequest({
        type: "customer.subscription.deleted",
        data: {
          customer: "cus_SKIP",
          metadata: { accountLogin: "NoInstall" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // invoice.payment_failed
  // -------------------------------------------------------------------------
  describe("invoice.payment_failed", () => {
    it("sets status to past_due with nested subscription_details metadata", async () => {
      const { req } = signedRequest({
        type: "invoice.payment_failed",
        data: {
          customer: "cus_FAIL",
          subscription: "sub_FAIL",
          subscription_details: {
            metadata: {
              installationId: "200",
              accountLogin: "FailOrg",
              plan: "pro",
            },
          },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(200);
      expect(mockUpsert).toHaveBeenCalledWith(mockDb, {
        installationId: "200",
        accountLogin: "FailOrg",
        stripeCustomerId: "cus_FAIL",
        stripeSubscriptionId: "sub_FAIL",
        plan: "pro",
        status: "past_due",
      });
    });

    it("defaults plan to 'pro' when not in nested metadata", async () => {
      const { req } = signedRequest({
        type: "invoice.payment_failed",
        data: {
          customer: "cus_F2",
          subscription: "sub_F2",
          subscription_details: {
            metadata: { installationId: "201" },
          },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        plan: "pro",
        accountLogin: "unknown",
        status: "past_due",
      }));
    });

    it("skips upsert when installationId missing in nested metadata", async () => {
      const { req } = signedRequest({
        type: "invoice.payment_failed",
        data: {
          customer: "cus_F3",
          subscription: "sub_F3",
          subscription_details: {
            metadata: { accountLogin: "NoId" },
          },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("skips upsert when subscription_details is absent", async () => {
      const { req } = signedRequest({
        type: "invoice.payment_failed",
        data: {
          customer: "cus_F4",
          subscription: "sub_F4",
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("skips upsert when subscription_details.metadata is empty", async () => {
      const { req } = signedRequest({
        type: "invoice.payment_failed",
        data: {
          customer: "cus_F5",
          subscription_details: { metadata: {} },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("handles missing subscription field (undefined subId)", async () => {
      const { req } = signedRequest({
        type: "invoice.payment_failed",
        data: {
          customer: "cus_F6",
          subscription_details: {
            metadata: { installationId: "202" },
          },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(mockUpsert).toHaveBeenCalledWith(mockDb, expect.objectContaining({
        stripeSubscriptionId: undefined,
      }));
    });
  });

  // -------------------------------------------------------------------------
  // Unknown / unhandled event types
  // -------------------------------------------------------------------------
  describe("unknown event types", () => {
    it("returns 200 and does not call upsert for unknown events", async () => {
      const { req } = signedRequest({
        type: "customer.created",
        data: { id: "cus_new" },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("handles payment_intent.succeeded without crashing", async () => {
      const { req } = signedRequest({
        type: "payment_intent.succeeded",
        data: { id: "pi_1", amount: 1900 },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(200);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("returns { received: true } in body for unhandled events", async () => {
      const { req } = signedRequest({
        type: "charge.refunded",
        data: {},
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(JSON.parse(res.body)).toEqual({ received: true });
    });
  });

  // -------------------------------------------------------------------------
  // Error handling — upsert failures
  // -------------------------------------------------------------------------
  describe("error handling", () => {
    it("returns 500 when upsertSubscription throws an Error", async () => {
      mockUpsert.mockRejectedValueOnce(new Error("DB connection lost"));
      const { req } = signedRequest({
        type: "checkout.session.completed",
        data: {
          customer: "cus_ERR",
          subscription: "sub_ERR",
          metadata: { installationId: "300" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(500);
      expect(JSON.parse(res.body).error).toBe("Processing failed");
    });

    it("returns 500 when upsertSubscription throws a non-Error", async () => {
      mockUpsert.mockRejectedValueOnce("string error");
      const { req } = signedRequest({
        type: "customer.subscription.updated",
        data: {
          id: "sub_SE",
          customer: "cus_SE",
          status: "active",
          metadata: { installationId: "301" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(500);
      expect(JSON.parse(res.body).error).toBe("Processing failed");
    });

    it("returns 500 with JSON content-type on processing error", async () => {
      mockUpsert.mockRejectedValueOnce(new Error("timeout"));
      const { req } = signedRequest({
        type: "customer.subscription.deleted",
        data: {
          customer: "cus_TO",
          metadata: { installationId: "302" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(500);
      expect(res.headers["Content-Type"]).toBe("application/json");
    });

    it("does not return 200 after a processing error", async () => {
      mockUpsert.mockRejectedValueOnce(new Error("fail"));
      const { req } = signedRequest({
        type: "invoice.payment_failed",
        data: {
          customer: "cus_NR",
          subscription: "sub_NR",
          subscription_details: {
            metadata: { installationId: "303" },
          },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).not.toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // Response format consistency
  // -------------------------------------------------------------------------
  describe("response format", () => {
    it("all success responses include { received: true }", async () => {
      const { req } = signedRequest({
        type: "checkout.session.completed",
        data: {
          customer: "cus_R",
          subscription: "sub_R",
          metadata: { installationId: "400" },
        },
      });
      const res = makeRes();
      await handleStripeWebhook(req, res);

      expect(res.status).toBe(200);
      expect(JSON.parse(res.body)).toEqual({ received: true });
    });

    it("all responses include Content-Type: application/json", async () => {
      // Success case
      const { req: req1 } = signedRequest({ type: "ping", data: {} });
      const res1 = makeRes();
      await handleStripeWebhook(req1, res1);
      expect(res1.headers["Content-Type"]).toBe("application/json");

      // Auth failure case
      const res2 = makeRes();
      await handleStripeWebhook(makeReq("{}", "bad"), res2);
      expect(res2.headers["Content-Type"]).toBe("application/json");
    });
  });

  // -------------------------------------------------------------------------
  // setStripeWebhookDeps state management
  // -------------------------------------------------------------------------
  describe("setStripeWebhookDeps", () => {
    it("can reconfigure deps between calls", async () => {
      const newSecret = "whsec_new_secret";
      setStripeWebhookDeps(mockDb, newSecret);

      const payload = JSON.stringify({ type: "test.reconfigure", data: {} });
      const newSig = createHmac("sha256", newSecret).update(payload).digest("hex");
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, newSig), res);
      expect(res.status).toBe(200);
    });

    it("old secret no longer works after reconfiguration", async () => {
      const newSecret = "whsec_replaced";
      setStripeWebhookDeps(mockDb, newSecret);

      const payload = JSON.stringify({ type: "test.old", data: {} });
      const oldSig = sign(payload); // uses TEST_SECRET
      const res = makeRes();
      await handleStripeWebhook(makeReq(payload, oldSig), res);
      expect(res.status).toBe(401);
    });
  });
});
