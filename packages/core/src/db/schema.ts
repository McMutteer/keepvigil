import { pgTable, uuid, varchar, timestamp, text, boolean } from "drizzle-orm/pg-core";

/** Tracks GitHub App installations */
export const installations = pgTable("installations", {
  id: uuid("id").primaryKey().defaultRandom(),
  githubInstallationId: varchar("github_installation_id", { length: 255 }).notNull().unique(),
  accountLogin: varchar("account_login", { length: 255 }).notNull(),
  accountType: varchar("account_type", { length: 50 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Simple health check log for migration testing */
export const healthChecks = pgTable("health_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  service: varchar("service", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  message: text("message"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});
