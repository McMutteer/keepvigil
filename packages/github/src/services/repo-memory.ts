/**
 * Repo Memory — loads and applies per-repo rules (ignore patterns, conventions).
 *
 * Rules are stored in the `repo_rules` DB table, created via `@vigil ignore` commands.
 * During pipeline execution, rules filter signal details to suppress known findings.
 */

import { eq, and } from "drizzle-orm";
import type { Database } from "@vigil/core/db";
import { schema } from "@vigil/core/db";
import type { Signal } from "@vigil/core";
import { createLogger } from "@vigil/core";

const log = createLogger("repo-memory");

export interface RepoRule {
  id: string;
  ruleType: string;
  pattern: string;
  createdBy: string;
}

/**
 * Load all rules for a specific repo.
 */
export async function loadRepoRules(db: Database, owner: string, repo: string): Promise<RepoRule[]> {
  try {
    const rows = await db.select().from(schema.repoRules).where(
      and(eq(schema.repoRules.owner, owner), eq(schema.repoRules.repo, repo)),
    );
    return rows.map((r) => ({
      id: r.id,
      ruleType: r.ruleType,
      pattern: r.pattern,
      createdBy: r.createdBy,
    }));
  } catch (err) {
    log.warn({ err, owner, repo }, "Failed to load repo rules — proceeding without memory");
    return [];
  }
}

/**
 * Add a new ignore rule for a repo.
 */
export async function addIgnoreRule(
  db: Database,
  owner: string,
  repo: string,
  pattern: string,
  createdBy: string,
): Promise<void> {
  await db.insert(schema.repoRules).values({
    owner,
    repo,
    ruleType: "ignore",
    pattern,
    createdBy,
  });
  log.info({ owner, repo, pattern, createdBy }, "Ignore rule added");
}

/**
 * Apply ignore rules to signals — suppresses matching findings.
 *
 * A finding matches a rule if the rule pattern is a case-insensitive substring
 * of the finding's label OR message.
 *
 * Matched findings get their status changed to "skip" and message updated.
 * Returns the number of findings suppressed.
 */
export function applyIgnoreRules(signals: Signal[], rules: RepoRule[]): number {
  const ignoreRules = rules.filter((r) => r.ruleType === "ignore");
  if (ignoreRules.length === 0) return 0;

  let suppressed = 0;

  for (const signal of signals) {
    for (const detail of signal.details) {
      // Only suppress warn/fail findings — don't touch pass/skip
      if (detail.status !== "warn" && detail.status !== "fail") continue;

      for (const rule of ignoreRules) {
        const pattern = rule.pattern.toLowerCase();
        const matchesLabel = detail.label.toLowerCase().includes(pattern);
        const matchesMessage = detail.message.toLowerCase().includes(pattern);

        if (matchesLabel || matchesMessage) {
          detail.status = "skip";
          detail.message = `Suppressed by repo rule: "${rule.pattern}" (by ${rule.createdBy})`;
          suppressed++;
          break; // One rule match is enough
        }
      }
    }
  }

  return suppressed;
}
