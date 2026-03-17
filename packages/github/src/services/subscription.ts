import { eq } from "drizzle-orm";
import type { Database } from "@vigil/core/db";
import { schema } from "@vigil/core/db";
import { createLogger } from "@vigil/core";

const log = createLogger("subscription");

export type Plan = "free" | "pro" | "team";

export async function checkPlan(db: Database, installationId: number): Promise<Plan> {
  const sub = await db.select().from(schema.subscriptions)
    .where(eq(schema.subscriptions.installationId, installationId))
    .limit(1);

  const plan: Plan = (sub.length > 0 && sub[0].status === "active")
    ? (sub[0].plan as Plan)
    : "free";

  return plan;
}

export function isPro(plan: Plan): boolean {
  return plan === "pro" || plan === "team";
}

export async function upsertSubscription(
  db: Database,
  data: {
    installationId: number;
    accountLogin: string;
    stripeCustomerId: string;
    stripeSubscriptionId?: string | null;
    plan: Plan;
    status: string;
    currentPeriodEnd?: Date | null;
  },
): Promise<void> {
  await db.insert(schema.subscriptions).values({
    installationId: data.installationId,
    accountLogin: data.accountLogin,
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId ?? null,
    plan: data.plan,
    status: data.status,
    currentPeriodEnd: data.currentPeriodEnd ?? null,
  }).onConflictDoUpdate({
    target: schema.subscriptions.installationId,
    set: {
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId ?? null,
      plan: data.plan,
      status: data.status,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
      updatedAt: new Date(),
    },
  });

  log.info({ installationId: data.installationId, plan: data.plan, status: data.status }, "Subscription upserted");
}
