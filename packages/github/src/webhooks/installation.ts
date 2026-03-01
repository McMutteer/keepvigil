import type { Context } from "probot";
import { eq } from "drizzle-orm";
import type { Database } from "@vigil/core/db";
import { schema } from "@vigil/core/db";

type InstallationCreatedContext = Context<"installation.created">;
type InstallationDeletedContext = Context<"installation.deleted">;

let db: Database | null = null;

/** Set the database instance for installation handlers */
export function setDatabase(database: Database): void {
  db = database;
}

/** Handle new GitHub App installations — upsert into the installations table */
export async function handleInstallationCreated(context: InstallationCreatedContext): Promise<void> {
  if (!db) {
    throw new Error("Database not initialized — cannot store installation");
  }

  const { installation } = context.payload;
  const account = installation.account;

  // account can be null in some edge cases
  if (!account) {
    context.log.warn("Installation event without account — skipping");
    return;
  }

  await db
    .insert(schema.installations)
    .values({
      githubInstallationId: String(installation.id),
      accountLogin: account.login,
      accountType: account.type?.toLowerCase() ?? "user",
      active: true,
    })
    .onConflictDoUpdate({
      target: schema.installations.githubInstallationId,
      set: {
        accountLogin: account.login,
        accountType: account.type?.toLowerCase() ?? "user",
        active: true,
        updatedAt: new Date(),
      },
    });

  context.log.info(
    { installationId: installation.id, account: account.login },
    "Installation stored",
  );
}

/** Handle GitHub App uninstallations — mark as inactive in DB */
export async function handleInstallationDeleted(context: InstallationDeletedContext): Promise<void> {
  if (!db) {
    throw new Error("Database not initialized — cannot update installation");
  }

  const { installation } = context.payload;

  await db
    .update(schema.installations)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(schema.installations.githubInstallationId, String(installation.id)));

  context.log.info(
    { installationId: installation.id },
    "Installation marked inactive",
  );
}
