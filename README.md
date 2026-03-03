# Vigil

**Your test plans, actually tested.**

Vigil is a GitHub App that automatically executes the test plans AI coding agents write in pull requests. When Claude Code, Cursor, or GitHub Copilot generates a PR with a test plan checklist, Vigil runs those tests and reports results as GitHub Check Runs — no test files to write, no new platform to learn.

```text
- [ ] npm run build succeeds                  → ✅ Passed (1.2s)
- [ ] POST /api/users returns 201             → ❌ Failed — got 500
- [ ] Login flow works on mobile              → ⚠️ Needs Review
- [ ] Manual: verify with stakeholder         → 🔨 Human
```

---

## The problem

94% of AI-generated PRs include test plan checklists. 70% of those items are never executed.

The AI agent knows exactly what should be tested — it writes it down, checkbox by checkbox. Then nothing happens. Developers merge with unchecked boxes and hope for the best.

Vigil closes that loop.

---

## How it works

1. A PR is opened with a test plan section in the description
2. Vigil parses each checkbox item and classifies it by type and confidence
3. High-confidence items are executed automatically:
   - **Shell:** `npm run build`, `npm test`, custom commands
   - **API:** HTTP requests against your preview deployment, verified against expected status/body
   - **Browser:** Playwright flows generated from natural language descriptions
4. Results appear as GitHub Check Runs before code review starts
5. Evidence (logs, HTTP responses, screenshots) is attached to the PR comment

Items requiring human judgment (manual checks, stakeholder sign-offs) are flagged and skipped — Vigil doesn't pretend to know everything.

---

## Confidence tiers

Vigil classifies each test plan item before deciding how to execute it:

| Tier | Examples | Execution | Failure impact |
|------|----------|-----------|----------------|
| DETERMINISTIC | `npm run build`, `pnpm test` | Shell command | Blocks merge |
| HIGH | `POST /api/users → 201` | API request | Blocks merge |
| MEDIUM | Login flow loads correctly | Browser/Playwright | Non-blocking (needs review) |
| LOW | Responsive on 320px | Browser/visual | Non-blocking |
| SKIP | Manual: ask client for approval | — | Skipped |

Only DETERMINISTIC and HIGH failures block the merge. Everything else is surfaced as evidence for human review.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 + TypeScript 5.8 |
| GitHub Integration | Probot 14 + Octokit |
| NL Interpreter | Claude API (Haiku for classification, Sonnet for spec generation) |
| Browser Automation | Playwright |
| Task Queue | BullMQ + Redis 7 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Containerization | Docker + Docker Compose |

---

## Project status

Vigil is under active development. 8 of 10 implementation sections complete:

| Section | Status |
|---------|--------|
| Project bootstrap | ✅ Complete |
| GitHub App core | ✅ Complete |
| Test plan parser | ✅ Complete |
| Item classifier | ✅ Complete |
| Shell executor | ✅ Complete |
| API test executor | ✅ Complete |
| Browser test executor | ✅ Complete |
| Result reporter | ✅ Complete |
| Orchestrator | 🔄 In progress |
| Deployment | 🔄 In progress |

---

## Development

This is a pnpm monorepo with three packages:

```text
packages/
  core/       — types, parser, classifier, database, queue
  github/     — Probot app, webhooks, Check Run management
  executors/  — shell, API, and browser test execution
```

**Quality gates** (must pass before every PR):

```bash
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

**Run locally:**

```bash
cp .env.example .env
# fill in GITHUB_APP_ID, GITHUB_PRIVATE_KEY, ANTHROPIC_API_KEY, etc.

docker compose up
```

---

## License

MIT
