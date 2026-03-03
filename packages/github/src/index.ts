/**
 * @vigil/github — GitHub App integration package.
 * Probot webhooks, Check Run management, and queue producers.
 */

export { vigilApp } from "./app.js";
export { loadConfig } from "./config.js";
export type { AppConfig } from "./config.js";
export { hasTestPlan } from "./utils/has-test-plan.js";
export { createPendingCheckRun } from "./services/check-run.js";
export type { CreateCheckRunParams } from "./services/check-run.js";
export { initQueue, enqueueVerification, closeQueue } from "./services/queue.js";
export { reportResults, buildReportItems, computeSummary } from "./services/reporter.js";
export type { ReportContext, ReportItem, ReportSummary, ItemVerdict, CheckConclusion } from "./services/reporter.js";
export { updateCheckRun, determineConclusion } from "./services/check-run-updater.js";
export { buildCommentBody } from "./services/comment-builder.js";
