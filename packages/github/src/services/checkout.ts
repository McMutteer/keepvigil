import type { IncomingMessage, ServerResponse } from "node:http";
import { createLogger } from "@vigil/core";
import type { AppConfig } from "../config.js";

const log = createLogger("checkout");

export async function handleCheckout(req: IncomingMessage, res: ServerResponse, config: AppConfig): Promise<void> {
  if (!config.stripeGatewayUrl || !config.stripeGatewayApiKey) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Billing not configured" }));
    return;
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const plan = url.searchParams.get("plan") || "pro";
  const installationId = url.searchParams.get("installation_id") || "";
  const accountLogin = url.searchParams.get("account") || "";

  const priceId = plan === "team" ? config.stripeTeamPriceId : config.stripeProPriceId;
  if (!priceId) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid plan" }));
    return;
  }

  try {
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
        metadata: {
          installationId,
          accountLogin,
          plan,
        },
      }),
    });

    const result = await response.json() as { success: boolean; data?: { url: string } };
    if (!result.success || !result.data?.url) {
      log.error({ result }, "Failed to create checkout session");
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to create checkout session" }));
      return;
    }

    // Redirect to Stripe Checkout
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
