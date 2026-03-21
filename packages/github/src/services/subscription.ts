import { eq } from "drizzle-orm";
import type { Database } from "@vigil/core/db";
import { schema } from "@vigil/core/db";
import { createLogger } from "@vigil/core";

const log = createLogger("subscription");

export type Plan = "free" | "pro" | "team";

const VALID_PLANS = new Set<string>(["free", "pro", "team"]);

function toPlan(value: string | null | undefined): Plan {
  if (value && VALID_PLANS.has(value)) return value as Plan;
  return "free";
}

export async function checkPlan(db: Database, installationId: string): Promise<Plan> {
  const sub = await db.select().from(schema.subscriptions)
    .where(eq(schema.subscriptions.installationId, installationId))
    .limit(1);

  if (sub.length === 0 || sub[0].status !== "active") return "free";
  return toPlan(sub[0].plan);
}

export function isPro(plan: Plan): boolean {
  return plan === "pro" || plan === "team";
}

export async function upsertSubscription(
  db: Database,
  data: {
    installationId: string;
    accountLogin: string;
    stripeCustomerId: string;
    stripeSubscriptionId?: string | null;
    plan: Plan;
    seats?: number;
    status: string;
    currentPeriodEnd?: Date | null;
  },
): Promise<void> {
  const seats = data.seats ?? 1;

  await db.insert(schema.subscriptions).values({
    installationId: data.installationId,
    accountLogin: data.accountLogin,
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId ?? null,
    plan: data.plan,
    seats,
    status: data.status,
    currentPeriodEnd: data.currentPeriodEnd ?? null,
  }).onConflictDoUpdate({
    target: schema.subscriptions.installationId,
    set: {
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId ?? null,
      plan: data.plan,
      seats,
      status: data.status,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
      updatedAt: new Date(),
    },
  });

  log.info({ installationId: data.installationId, plan: data.plan, seats, status: data.status }, "Subscription upserted");
}
