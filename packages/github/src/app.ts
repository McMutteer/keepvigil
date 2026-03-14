import type { Probot } from "probot";
import { handlePullRequest } from "./webhooks/pull-request.js";
import { handleIssueComment } from "./webhooks/issue-comment.js";
import {
  handleInstallationCreated,
  handleInstallationDeleted,
} from "./webhooks/installation.js";

/**
 * Probot application function — registers all webhook event listeners.
 * This is the core of the GitHub App.
 */
export function vigilApp(app: Probot): void {
  app.on(
    ["pull_request.opened", "pull_request.synchronize", "pull_request.edited"],
    handlePullRequest,
  );

  app.on("issue_comment.created", handleIssueComment);

  app.on("installation.created", handleInstallationCreated);
  app.on("installation.deleted", handleInstallationDeleted);

  app.log.info("Vigil GitHub App loaded");
}
