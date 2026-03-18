# Vigil

## Project Identity

**Name:** Vigil
**Tagline:** "Verifies that your PR does what it says it does."
**Domain:** keepvigil.dev
**Repo:** McMutteer/keepvigil

### Who We Are
We are the silent verifier. When a developer opens a PR — any PR — we read the title and description, verify every claim against the actual diff, and surface changes the author didn't mention. We close the loop between "what a PR says" and "what the code does." We don't brag, we don't interrupt, we don't ask permission. We verify, we report, we disappear.

### Who We Serve
Any developer who opens pull requests. AI agents, teammates, yourself — it doesn't matter who wrote the code. If the PR says "adds auth middleware," we check. If it doesn't mention a new Redis dependency, we flag it. Zero config, zero friction. Install and forget.

### How We Feel
Silent. Reliable. Nocturnal. Precise. Trustworthy.

### What We Are Not
We are not a code reviewer (that's CodeRabbit). We are not CI (that's GitHub Actions). We are not a coverage tool (that's Codecov). We verify that what your PR claims matches what the code actually does. No one else does this.

## Architecture

- **Dual-mode pipeline:** `v1+v2` (PR has test plan) runs all 10 signals. `v2-only` (no test plan) runs 6 signals.
- **Three verification layers:** Claims Verification (free), Undocumented Changes (free), Impact Analysis (pro)
- **10 signals:** claims-verifier, undocumented-changes, ci-bridge, credential-scan, executor, plan-augmentor, contract-checker, diff-analyzer, coverage-mapper, gap-analyzer
- **Score:** 0-100 weighted average, failure cap at 70 for deterministic failures

## Visual Identity

Sigil complete. Brand guide: `.claude/identity/brand.md`

**Primary:** #0f1729 (Midnight Navy) | **Accent:** #e8a820 (Vigil Amber) | **Light:** #e2e8f0

Logo files: `.claude/identity/` (source of truth)

## Development Workflow

**MANDATORY: Use `/protocol` before starting ANY implementation work.**

1. `git checkout main && git pull origin main`
2. `git checkout -b feat/short-description`
3. Code with incremental commits: `feat(scope): description`
4. Quality gates: `pnpm build && pnpm test && pnpm lint && pnpm typecheck`
5. `git push -u origin feat/short-description`
6. `gh pr create` with standard format
7. Wait for CodeRabbit review, address feedback
8. Agents ARE authorized to merge PRs to main in this repo

**Branch naming:** `feat/short-description`
**Commit style:** Conventional Commits — `feat(parser): extract checkbox items from markdown`
**Language:** Conversations in Spanish, code/commits/PRs in English

## Toolbox

Skills repo: `McMutteer/claude-skills` (synced to `~/.claude/skills/`)

Key skills: `/protocol`, `/infisical`, `/master-plan`, `/dokploy`, `/stripe-gateway`, `/bitacora`

To discover all available skills: `ls ~/.claude/skills/`
