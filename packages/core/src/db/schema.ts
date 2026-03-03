import { pgTable, uuid, varchar, timestamp, text, boolean, integer, json, index } from "drizzle-orm/pg-core";

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

/** Tracks individual test plan verification pipeline runs */
export const executions = pgTable("executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: text("job_id").notNull(),
  installationId: text("installation_id").notNull(),
  owner: varchar("owner", { length: 255 }).notNull(),
  repo: varchar("repo", { length: 255 }).notNull(),
  pullNumber: integer("pull_number").notNull(),
  headSha: text("head_sha").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  // status: "pending" | "running" | "completed" | "failed"
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  resultsSummary: json("results_summary"),
  // { passed: number, failed: number, skipped: number, needsReview: number, total: number }
  error: text("error"),
}, (table) => [
  index("executions_job_id_idx").on(table.jobId),
  index("executions_owner_repo_pull_idx").on(table.owner, table.repo, table.pullNumber),
]);

/** Simple health check log for migration testing */
export const healthChecks = pgTable("health_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  service: varchar("service", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  message: text("message"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});
