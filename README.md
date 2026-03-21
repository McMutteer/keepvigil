<p align="center">
  <img src=".claude/identity/icon.svg" width="64" alt="Vigil">
</p>

<h1 align="center">Vigil</h1>

<p align="center"><strong>Verifies that your PR does what it says it does.</strong></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/McMutteer/keepvigil/actions"><img src="https://github.com/McMutteer/keepvigil/actions/workflows/ci.yml/badge.svg" alt="Build"></a>
  <a href="https://keepvigil.dev"><img src="https://img.shields.io/badge/website-keepvigil.dev-e8a820" alt="Website"></a>
</p>

---

## The Problem

Your PR says "adds auth middleware." Did it? Your PR says "no breaking changes." Are there any? The gap between what a PR claims and what the code actually does grows with every merge — especially when AI agents write the code.

Vigil closes that gap. It reads your PR description, verifies every claim against the actual diff, and surfaces changes you didn't mention — so reviewers know exactly what's real.

---

## How It Works

1. **Install** — Add Vigil from the [GitHub Marketplace](https://github.com/marketplace/keepvigil) or self-host
2. **Open a PR** — Any PR. No test plan needed. No configuration.
3. **Get Verified** — Vigil checks claims, surfaces undocumented changes, and analyzes impact

```text
┌──────────────────────────────────────────────────────┐
│   Vigil — PR Verification: 82/100                    │
│                                                      │
│   Claims                                             │
│   ✅ "Add rate limiting to API endpoints"            │
│      — confirmed, rate-limiter.ts created            │
│   ✅ "Add tests for rate limiter"                    │
│      — confirmed, 12 tests in rate-limiter.test.ts   │
│   ⚠️ "No breaking changes"                           │
│      — GET /api/users adds rateLimit field            │
│                                                      │
│   Undocumented Changes                               │
│   ⚠️ New dependency: ioredis (not mentioned)          │
│   ⚠️ Environment variable: REDIS_URL (not documented) │
│                                                      │
│   Impact                                             │
│   ✅ Credentials scan clean                          │
│   ⚠️ Coverage gap: src/middleware/auth.ts             │
│   ✅ No breaking API changes                         │
│                                                      │
│   Score: 82/100 — Review recommended                 │
└──────────────────────────────────────────────────────┘
```

---

## Verification Signals

8 signals feed into a weighted confidence score:

| Signal | Weight | Tier | Description |
|--------|--------|------|-------------|
| Claims Verifier | 30 | Free | Verifies PR title/body claims against the diff |
| Undocumented Changes | 25 | Free | Detects significant changes not mentioned in the PR |
| Credential Scan | 20 | Free | Detects secrets, API keys, and passwords in the diff |
| Coverage Mapper | 10 | Free | Checks if changed files have corresponding tests |
| Contract Checker | 10 | Pro | Verifies API and type contracts across files |
| Diff Analyzer | 5 | Pro | LLM-powered diff quality and pattern analysis |
| Risk Score | 0 | Free | Informational risk assessment (file count, sensitive areas) |
| Description Generator | 0 | Free | Suggests a description when the PR body is empty |

**Read-only analysis** — Vigil never executes code, never modifies your repo, and never accesses production systems.

---

## Quick Start

### GitHub Marketplace (hosted)

Install from the [GitHub Marketplace](https://github.com/marketplace/keepvigil), select your repos, and you're done. Free tier includes all 8 signals — unlimited repos.

### Self-host

```bash
git clone https://github.com/McMutteer/keepvigil.git
cd keepvigil
cp .env.example .env
# Fill in GITHUB_APP_ID, GITHUB_PRIVATE_KEY, WEBHOOK_SECRET, DATABASE_URL, REDIS_URL
docker compose up
```

---

## Configuration

Vigil works zero-config. Optionally customize via `.vigil.yml` in the repository root:

```yaml
notifications:
  on: failure
  urls:
    - https://hooks.slack.com/services/T.../B.../xxx

autoApprove:
  threshold: 90

coverage:
  exclude:
    - packages/landing/
```

---

## Documentation

Full docs at **[keepvigil.dev/docs](https://keepvigil.dev/docs/getting-started)**.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 + TypeScript 5.8 |
| GitHub Integration | Probot 14 + Octokit |
| LLM | OpenAI GPT-5.4-mini (primary) + Groq (fallback) |
| Task Queue | BullMQ + Redis 7 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Build | tsup (ESM) + pnpm workspaces |
| Containerization | Docker + Docker Compose |

---

## Development

pnpm monorepo with five packages:

```text
packages/
  core/         — types, score engine, credential scanner, coverage mapper, LLM client
  github/       — Probot app, webhooks, pipeline, signals, reporter
  landing/      — Next.js 15 landing page (keepvigil.dev)
  dashboard/    — React SPA for users (/dashboard)
  admin/        — React SPA for operations (/admin)
```

844 tests across 42 files.

```bash
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

---

## License

[MIT](LICENSE)
