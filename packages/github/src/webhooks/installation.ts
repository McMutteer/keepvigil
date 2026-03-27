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

  // Create welcome issue on first installation (fire-and-forget)
  const repos = installation.repositories_added ?? context.payload.repositories ?? [];
  if (repos.length > 0) {
    const firstRepo = repos[0];
    void createWelcomeIssue(context.octokit, account.login, firstRepo.name).catch((err) => {
      context.log.warn({ err, repo: firstRepo.name }, "Failed to create welcome issue — non-fatal");
    });
  }
}

/** Create a welcome issue on the first repo to guide new users. */
async function createWelcomeIssue(
  octokit: InstallationCreatedContext["octokit"],
  owner: string,
  repo: string,
): Promise<void> {
  // Check if we already created a welcome issue (avoid duplicates on reinstall)
  const { data: issues } = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    creator: "keepvigil[bot]",
    state: "all",
    per_page: 5,
  });
  const alreadyWelcomed = issues.some(i => i.title.includes("Welcome to Vigil"));
  if (alreadyWelcomed) return;

  await octokit.rest.issues.create({
    owner,
    repo,
    title: "Welcome to Vigil — here's what to expect",
    body: `## Vigil is installed and ready.

Starting now, every pull request on this repo will get a **verification report** — a confidence score from 0-100 based on 8 independent signals.

### What happens on your next PR

1. **Immediately:** A placeholder comment appears confirming Vigil received the PR
2. **~30 seconds later:** The placeholder updates with the full report:
   - **Claims Verified** — every claim in the PR description checked against the diff
   - **Undocumented Changes** — changes the description didn't mention
   - **Credential Scan** — hardcoded secrets detection
   - **Coverage Mapper** — test file presence for changed files
   - **Contract Checker** — API/consumer contract mismatches
   - **Diff Analyzer** — granular diff vs description gap analysis
   - **Risk Assessment** — risk level based on file patterns
   - **Description Generator** — auto-generates description if missing

### Tips for better scores

- **Be specific** in PR descriptions — Vigil extracts and verifies each claim
- **Mention new dependencies** — otherwise they're flagged as undocumented
- **Use conventional commits** — helps Vigil understand intent

### Configuration (optional)

Add a \`.vigil.yml\` to your repo root to customize:

\`\`\`yaml
auto_approve:
  threshold: 90  # Auto-approve PRs scoring above this (Pro/Team)

coverage:
  exclude:
    - "**/*.css"
    - "docs/**"
\`\`\`

### Resources

- [Documentation](https://keepvigil.dev/docs/getting-started)
- [How scoring works](https://keepvigil.dev/docs/scoring)
- [GitHub](https://github.com/McMutteer/keepvigil)

---

*You can close this issue — it's just a one-time welcome guide. Vigil runs automatically on every PR.*
`,
    labels: ["documentation"],
  });
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
