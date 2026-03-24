# Vigil

## Project Identity

**Name:** Vigil
**Tagline:** "Merge with confidence."
**Sub-tagline:** "The verification layer for AI-assisted development."
**Domain:** keepvigil.dev
**Repo:** McMutteer/keepvigil

### Who We Are
We are the trust layer between AI-generated code and your main branch. When a developer or AI agent opens a PR, we read the title and description, verify every claim against the actual diff, and surface changes the author didn't mention. We close the loop between "what a PR says" and "what the code does."

### Who We Serve
1. **Founders/CTOs using AI coding agents** — can't manually audit every PR from Cursor, Claude Code, or Devin
2. **Tech leads of 5-15 dev teams** — not enough time to review every PR thoroughly
3. **Open source maintainers** — receive PRs from strangers, need to verify claims

### How We Feel
Silent. Reliable. Nocturnal. Precise. Trustworthy.

### What We Are Not
We are not a code reviewer — we complement code review tools. We are not CI. We are not a coverage tool. We verify that what your PR claims matches what the code actually does. CodeRabbit reviews quality; Vigil verifies truthfulness. They're complementary.

### Strategic Direction (March 2026)
Code is becoming commodity (AI agents write it). Trust is becoming scarce. Vigil is the verification layer for the AI coding age. See `memory/strategy_pivot_2026_03.md` for full analysis.

## Architecture

- **v2-only pipeline:** All PRs run the same 6 signals (v1 deprecated in PR #91)
- **Two verification layers:** Trust Verification (free: claims, undocumented, credential, coverage) + Deep Analysis (pro: contract, diff)
- **6 signals:** claims-verifier, undocumented-changes, credential-scan, coverage-mapper, contract-checker, diff-analyzer
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

## Internal Documentation

Comprehensive internal docs live at `.internal-docs/` (gitignored, never published). Read these before starting work:

| File | What's in it |
|------|-------------|
| `README.md` | Project overview, identity, quick start |
| `architecture.md` | Packages, pipeline, DB, LLM, infrastructure |
| `features-implemented.md` | Everything built with PR numbers |
| `pending-work.md` | Prioritized pending tasks with context |
| `bugs-and-improvements.md` | Known bugs, UX issues, signal improvements, backend/infra suggestions |
| `go-to-market.md` | Pricing, gating status, growth platforms, content marketing |
| `deployment.md` | Server details, deploy commands, Docker, troubleshooting |
| `api-reference.md` | All backend endpoints (auth, billing, dashboard, admin) |
| `signals-reference.md` | All 8 signals: purpose, weights, LLM usage, known issues |
| `landing-page.md` | Frontend architecture, components, i18n, design tokens |
| `credentials.md` | Where secrets live (NO actual secrets), external accounts |

## Toolbox

Skills repo: `McMutteer/claude-skills` (synced to `~/.claude/skills/`)

Key skills: `/protocol`, `/infisical`, `/master-plan`, `/dokploy`, `/stripe-gateway`, `/bitacora`

To discover all available skills: `ls ~/.claude/skills/`
