import type { Context } from "probot";
import { createPendingCheckRun } from "../services/check-run.js";
import { enqueueVerification } from "../services/queue.js";
import { parseVigilConfig } from "../services/vigil-config.js";
import { createLLMClient, createLogger } from "@vigil/core";
import type { Database } from "@vigil/core/db";
import { addIgnoreRule } from "../services/repo-memory.js";

const log = createLogger("issue-comment");

let commentDb: Database | null = null;

/** Set the database instance for repo memory operations */
export function setCommentDb(database: Database): void {
  commentDb = database;
}

type IssueCommentContext = Context<"issue_comment.created">;

/** Vigil command prefixes — supports both /vigil and @vigil */
const COMMAND_PATTERN = /^(?:\/vigil|@vigil)\s+(\w+)(?:\s+(.*))?$/;

/** Trusted roles that can invoke Vigil commands */
const TRUSTED_ROLES = ["OWNER", "MEMBER", "COLLABORATOR"];

/** Default platform model — same as pipeline */
const PLATFORM_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

/**
 * Handle issue_comment.created events.
 *
 * Supported commands:
 *   /vigil retry [tp-1 tp-3]  — re-run verification (all items or specific ones)
 *   @vigil recheck             — alias for retry (re-run all)
 *   @vigil explain <finding>   — explain a specific finding in detail
 *   @vigil ignore <finding>    — suppress this finding for this repo (future)
 *   @vigil verify <claim>      — manually verify a specific claim against the diff
 *
 * Trust model: only OWNER, MEMBER, and COLLABORATOR can invoke commands.
 */
export async function handleIssueComment(context: IssueCommentContext): Promise<void> {
  const { comment, issue, repository, installation, sender } = context.payload;

  // Only act on PR comments
  if (!issue.pull_request) return;

  const body = comment.body.trim();
  const match = COMMAND_PATTERN.exec(body);
  if (!match) return;

  const command = match[1].toLowerCase();
  const args = match[2]?.trim() ?? "";

  if (!installation) {
    log.warn("Received comment event without installation — skipping");
    return;
  }

  // Trust gate
  const authorAssociation = comment.author_association as string;
  if (!TRUSTED_ROLES.includes(authorAssociation)) {
    log.info(
      { pr: issue.number, user: sender.login, association: authorAssociation, command },
      "Command from untrusted author — ignoring",
    );
    return;
  }

  const owner = repository.owner.login;
  const repo = repository.name;
  const pullNumber = issue.number;

  log.info({ owner, repo, pullNumber, command, args }, "Vigil command received");

  switch (command) {
    case "retry":
    case "recheck":
      await handleRetry(context, owner, repo, pullNumber, args);
      break;
    case "explain":
      await handleExplain(context, owner, repo, pullNumber, args);
      break;
    case "verify":
      await handleVerify(context, owner, repo, pullNumber, args);
      break;
    case "ignore":
      await handleIgnore(context, owner, repo, pullNumber, args);
      break;
    default:
      log.info({ command }, "Unknown Vigil command — ignoring");
  }
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

async function handleRetry(
  context: IssueCommentContext,
  owner: string,
  repo: string,
  pullNumber: number,
  args: string,
): Promise<void> {
  const { installation } = context.payload;

  // Parse optional item IDs
  const parsed = args.length > 0
    ? args.split(/\s+/).filter((s) => /^tp-\d+$/.test(s))
    : [];
  const retryItemIds = parsed.length > 0 ? parsed : undefined;

  try {
    const octokit = context.octokit;
    const { data: pr } = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber });

    const prTitle = pr.title ?? "";
    const prBody = pr.body ?? "";
    const headSha = pr.head.sha;

    // Fetch .vigil.yml
    let vigiConfig = undefined;
    let configWarnings = undefined;
    try {
      const isSameRepoPr = pr.head.repo?.full_name === `${owner}/${repo}`;
      const configRef = isSameRepoPr ? headSha : context.payload.repository.default_branch;
      const response = await octokit.rest.repos.getContent({
        owner, repo, path: ".vigil.yml", ref: configRef,
      });
      const data = response.data;
      if (!Array.isArray(data) && data.type === "file" && "content" in data) {
        const yaml = Buffer.from(data.content, "base64").toString("utf-8");
        const result = parseVigilConfig(yaml);
        vigiConfig = result.config;
        if (result.warnings.length > 0) configWarnings = result.warnings;
      }
    } catch {
      // .vigil.yml not found — use defaults
    }

    const checkRunId = await createPendingCheckRun(octokit, { owner, repo, headSha, pullNumber });

    try {
      const jobId = await enqueueVerification({
        installationId: String(installation!.id),
        owner, repo, pullNumber, headSha, checkRunId,
        prTitle, prBody, vigiConfig, configWarnings, retryItemIds,
      });
      log.info({ owner, repo, pullNumber, jobId, retryItemIds }, "Retry job enqueued");
    } catch (enqueueErr) {
      log.error({ err: enqueueErr, owner, repo, pullNumber }, "Failed to enqueue retry");
      await octokit.rest.checks.update({
        owner, repo, check_run_id: checkRunId,
        status: "completed", conclusion: "failure",
        completed_at: new Date().toISOString(),
        output: { title: "Retry failed", summary: "Vigil could not enqueue the retry job. Please try again." },
      }).catch(() => {});
    }
  } catch (err) {
    log.error({ err, owner, repo, pullNumber }, "Retry setup failed");
  }
}

async function handleExplain(
  context: IssueCommentContext,
  owner: string,
  repo: string,
  pullNumber: number,
  args: string,
): Promise<void> {
  if (!args) {
    await replyToComment(context, owner, repo, pullNumber,
      "Usage: `@vigil explain <finding>` — describe the finding you want explained.");
    return;
  }

  try {
    const octokit = context.octokit;
    const { data: pr } = await octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber });
    const diff = await fetchDiffForComment(octokit, owner, repo, pullNumber);

    const groqKey = process.env.GROQ_API_KEY ?? "";
    if (!groqKey) {
      await replyToComment(context, owner, repo, pullNumber,
        "Vigil cannot explain findings right now — LLM is unavailable.");
      return;
    }

    const llm = createLLMClient({ provider: "groq", model: PLATFORM_MODEL, apiKey: groqKey });
    const response = await llm.chat({
      system: "You are Vigil, a PR verification assistant. The user is asking you to explain a finding from your verification report. Be concise, specific, and helpful. Reference the actual code from the diff when possible. Keep your response under 200 words.",
      user: `PR title: ${pr.title}\nPR body: ${(pr.body ?? "").slice(0, 2000)}\n\nDiff (first 10000 chars):\n${(diff ?? "").slice(0, 10000)}\n\nFinding to explain: ${args}`,
      timeoutMs: 15000,
    });

    await replyToComment(context, owner, repo, pullNumber, response);
  } catch (err) {
    log.error({ err, owner, repo, pullNumber }, "Explain command failed");
    await replyToComment(context, owner, repo, pullNumber,
      "Sorry, I couldn't generate an explanation right now. Please try again.");
  }
}

async function handleVerify(
  context: IssueCommentContext,
  owner: string,
  repo: string,
  pullNumber: number,
  args: string,
): Promise<void> {
  if (!args) {
    await replyToComment(context, owner, repo, pullNumber,
      "Usage: `@vigil verify <claim>` — describe what you want me to check against the diff.");
    return;
  }

  try {
    const octokit = context.octokit;
    const diff = await fetchDiffForComment(octokit, owner, repo, pullNumber);

    const groqKey = process.env.GROQ_API_KEY ?? "";
    if (!groqKey) {
      await replyToComment(context, owner, repo, pullNumber,
        "Vigil cannot verify claims right now — LLM is unavailable.");
      return;
    }

    const llm = createLLMClient({ provider: "groq", model: PLATFORM_MODEL, apiKey: groqKey });
    const response = await llm.chat({
      system: `You are Vigil, a PR verification assistant. The user wants you to verify a specific claim against the PR diff. Check if the claim is supported, contradicted, or unverifiable from the diff. Be specific — cite file names and line changes. Format your response as:

**Verdict:** Verified / Unverified / Contradicted
**Evidence:** (1-3 sentences explaining what you found in the diff)`,
      user: `Claim to verify: "${args}"\n\nDiff (first 15000 chars):\n${(diff ?? "").slice(0, 15000)}`,
      timeoutMs: 15000,
    });

    await replyToComment(context, owner, repo, pullNumber, response);
  } catch (err) {
    log.error({ err, owner, repo, pullNumber }, "Verify command failed");
    await replyToComment(context, owner, repo, pullNumber,
      "Sorry, I couldn't verify that claim right now. Please try again.");
  }
}

async function handleIgnore(
  context: IssueCommentContext,
  owner: string,
  repo: string,
  pullNumber: number,
  args: string,
): Promise<void> {
  if (!args) {
    await replyToComment(context, owner, repo, pullNumber,
      "Usage: `@vigil ignore <finding>` — describe the finding pattern to suppress for this repo.");
    return;
  }

  const pattern = args.slice(0, 200);
  const createdBy = context.payload.sender.login;

  if (commentDb) {
    try {
      await addIgnoreRule(commentDb, owner, repo, pattern, createdBy);
      await replyToComment(context, owner, repo, pullNumber,
        `Got it — I'll suppress findings matching "${pattern}" for **${owner}/${repo}** in future runs.`);
    } catch (err) {
      log.error({ err, owner, repo, pattern }, "Failed to save ignore rule");
      await replyToComment(context, owner, repo, pullNumber,
        `I understood the request, but couldn't save the rule right now. Please try again or use \`.vigil.yml\` to configure skip rules.`);
    }
  } else {
    await replyToComment(context, owner, repo, pullNumber,
      `Noted — I'll remember to ignore "${pattern}" for this repo in future runs.\n\n_Note: Database not available. Use \`.vigil.yml\` to configure skip rules._`);
    log.warn({ owner, repo, pattern }, "Ignore command received but DB not initialized");
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function replyToComment(
  context: IssueCommentContext,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string,
): Promise<void> {
  try {
    await context.octokit.rest.issues.createComment({
      owner, repo, issue_number: pullNumber,
      body: `<!-- vigil-reply -->\n${body}`,
    });
  } catch (err) {
    log.error({ err, owner, repo, pullNumber }, "Failed to post reply comment");
  }
}

async function fetchDiffForComment(
  octokit: IssueCommentContext["octokit"],
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.pulls.get({
      owner, repo, pull_number: pullNumber,
      mediaType: { format: "diff" },
    });
    return typeof data === "string" ? data : String(data);
  } catch {
    return null;
  }
}
