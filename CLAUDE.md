# Vigil

## Project Identity

**Name:** Vigil
**Tagline:** "Your test plans, actually tested."
**Domain:** keepvigil.dev
**Repo:** McMutteer/keepvigil

### Who We Are
We are the silent verifier. When an AI agent writes a test plan in a PR — twelve checkboxes, each a promise of quality — we're the one who actually runs them. We close the loop between "what should be tested" and "what gets tested." We don't brag, we don't interrupt, we don't ask permission. We run, we report, we disappear.

### Who We Serve
A developer who uses AI coding agents daily. They generate PRs with beautiful test plans they know they should execute but never do. Not out of laziness — out of friction. They want to merge with confidence, not with guilt. They want those checkboxes to mean something.

### How We Feel
Silent. Reliable. Nocturnal. Precise. Trustworthy.

### What We Are Not
We are not "Playwright with a wrapper." We are not another CI check that nobody reads. We are not a QA platform that requires onboarding, training, or test authoring. We require zero workflow change — the test plan already exists. We just make it real.

## Development Workflow

**MANDATORY: Use `/protocol` before starting ANY implementation work.**

Every master plan section follows this flow:
1. `git checkout main && git pull origin main`
2. `git checkout -b feat/section-N-description`
3. Code with incremental commits: `feat(scope): description`
4. Quality gates: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
5. `git push -u origin feat/section-N-description`
6. `gh pr create` with standard format
7. Wait for CodeRabbit review, address feedback
8. Agents ARE authorized to merge PRs to main in this repo

**Branch naming:** `feat/section-N-short-name` (e.g., `feat/section-2-github-app`)
**Commit style:** Conventional Commits — `feat(parser): extract checkbox items from markdown`
**Language:** Conversations in Spanish, code/commits/PRs in English

## Toolbox

This project has access to a global skills ecosystem. Skills are Claude Code slash commands that provide specialized capabilities.

**Skills repo:** `McMutteer/claude-skills` (synced to `~/.claude/skills/`)

Use `/skill-name` to invoke. Key skills:
- `/protocol` — **INVOKE FIRST** before any implementation task
- `/infisical` — Secrets and environment variable management
- `/master-plan` — Plan large features as autonomous sections
- `/exposition` — Generate a communication skill for this service
- `/dokploy` — Deployment, server management, Docker
- `/stripe-gateway` — Billing and payments integration

To discover all available skills: `ls ~/.claude/skills/`
