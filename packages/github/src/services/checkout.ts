import type { IncomingMessage, ServerResponse } from "node:http";
import { createLogger } from "@vigil/core";
import type { AppConfig } from "../config.js";

const log = createLogger("checkout");
const VALID_PLANS = new Set(["pro", "team"]);
const GATEWAY_TIMEOUT_MS = 10_000;

export async function handleCheckout(req: IncomingMessage, res: ServerResponse, config: AppConfig): Promise<void> {
  if (!config.stripeGatewayUrl || !config.stripeGatewayApiKey) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Billing not configured" }));
    return;
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const plan = url.searchParams.get("plan") || "";
  const installationId = url.searchParams.get("installation_id") || "";
  const accountLogin = url.searchParams.get("account") || "";

  if (!VALID_PLANS.has(plan)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid plan. Use ?plan=pro or ?plan=team" }));
    return;
  }

  if (!installationId || !accountLogin) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing required fields: installation_id and account" }));
    return;
  }

  const priceId = plan === "team" ? config.stripeTeamPriceId : config.stripeProPriceId;
  if (!priceId) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Price not configured for this plan" }));
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

    const response = await fetch(`${config.stripeGatewayUrl}/checkout/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.stripeGatewayApiKey,
      },
      body: JSON.stringify({
        mode: "subscription",
        lineItems: [{ price: priceId, quantity: 1 }],
        successUrl: "https://keepvigil.dev/docs/getting-started?checkout=success",
        cancelUrl: "https://keepvigil.dev/#pricing",
        metadata: { installationId, accountLogin, plan },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      log.error({ status: response.status }, "Stripe Gateway returned non-OK status");
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Billing service unavailable" }));
      return;
    }

    const result = await response.json() as { success: boolean; data?: { url: string } };
    if (!result.success || !result.data?.url) {
      log.error({ result }, "Failed to create checkout session");
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to create checkout session" }));
      return;
    }

    res.writeHead(303, { Location: result.data.url });
    res.end();
    log.info({ plan, installationId }, "Checkout session created, redirecting to Stripe");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Checkout error");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal error" }));
  }
}
