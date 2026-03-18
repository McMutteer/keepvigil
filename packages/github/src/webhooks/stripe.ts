import type { IncomingMessage, ServerResponse } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Database } from "@vigil/core/db";
import { createLogger } from "@vigil/core";
import { upsertSubscription } from "../services/subscription.js";
import type { Plan } from "../services/subscription.js";

const log = createLogger("stripe-webhook");

let db: Database | null = null;
let forwardingSecret: string | null = null;

export function setStripeWebhookDeps(database: Database, secret: string): void {
  db = database;
  forwardingSecret = secret;
}

function verifySignature(payload: string, signature: string): boolean {
  if (!forwardingSecret) return false;
  const expected = createHmac("sha256", forwardingSecret).update(payload).digest("hex");
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function handleStripeWebhook(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!db || !forwardingSecret) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Stripe webhook not configured" }));
    return;
  }

  // Read body
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const rawBody = Buffer.concat(chunks).toString("utf-8");

  // Verify HMAC signature
  const signature = req.headers["x-forwarding-signature"] as string | undefined;
  if (!signature || !verifySignature(rawBody, signature)) {
    log.warn("Invalid or missing webhook signature");
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid signature" }));
    return;
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON" }));
    return;
  }

  log.info({ eventType: event.type }, "Stripe webhook received");

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data as Record<string, unknown>;
        const metadata = session.metadata as Record<string, string> | undefined;
        const installationId = metadata?.installationId || null;
        const accountLogin = metadata?.accountLogin ?? "unknown";
        const plan = (metadata?.plan as Plan) ?? "pro";

        if (!installationId) {
          log.warn({ session }, "checkout.session.completed missing installationId in metadata");
          break;
        }

        await upsertSubscription(db, {
          installationId,
          accountLogin,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          plan,
          status: "active",
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data as Record<string, unknown>;
        const metadata = sub.metadata as Record<string, string> | undefined;
        const installationId = metadata?.installationId || null;

        if (!installationId) break;

        await upsertSubscription(db, {
          installationId,
          accountLogin: metadata?.accountLogin ?? "unknown",
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id as string,
          plan: (metadata?.plan as Plan) ?? "pro",
          status: sub.status as string,
          currentPeriodEnd: sub.current_period_end ? new Date((sub.current_period_end as number) * 1000) : undefined,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data as Record<string, unknown>;
        const metadata = sub.metadata as Record<string, string> | undefined;
        const installationId = metadata?.installationId || null;

        if (!installationId) break;

        await upsertSubscription(db, {
          installationId,
          accountLogin: metadata?.accountLogin ?? "unknown",
          stripeCustomerId: sub.customer as string,
          plan: "free",
          status: "canceled",
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data as Record<string, unknown>;
        const subId = invoice.subscription as string | undefined;
        const metadata = invoice.subscription_details as Record<string, unknown> | undefined;
        const installationMeta = metadata?.metadata as Record<string, string> | undefined;
        const installationId = installationMeta?.installationId || null;

        if (!installationId) break;

        await upsertSubscription(db, {
          installationId,
          accountLogin: installationMeta?.accountLogin ?? "unknown",
          stripeCustomerId: invoice.customer as string,
          stripeSubscriptionId: subId,
          plan: (installationMeta?.plan as Plan) ?? "pro",
          status: "past_due",
        });
        break;
      }

      default:
        log.info({ eventType: event.type }, "Unhandled Stripe event type");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg, eventType: event.type }, "Error processing Stripe webhook");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Processing failed" }));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ received: true }));
}
