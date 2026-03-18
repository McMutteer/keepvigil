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

Your PR says "adds auth middleware." Did it? Your PR says "no breaking changes." Are there any? The gap between what a PR claims and what the code actually does grows with every merge.

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

## Three Verification Layers

| Layer | Tier | Description |
|-------|------|-------------|
| **Claims Verification** | Free | Extracts claims from PR title and body, verifies each against the diff |
| **Undocumented Changes** | Free | Surfaces significant changes not mentioned in the PR description |
| **Impact Analysis** | Pro | Breaking changes, coverage gaps, contract violations, credential patterns |

Under the hood, 10 signals feed into a weighted verification score:

| Signal | Weight | Description |
|--------|--------|-------------|
| Claims Verifier | 15 | Verifies PR claims against the diff |
| Undocumented Changes | 10 | Detects unmentioned changes |
| CI Bridge | 20 | Maps test plan items to CI results |
| Credential Scan | 15 | Detects secrets in the diff |
| Test Execution | 10 | Runs test plan items in sandbox |
| Plan Augmentor | 10 | Auto-generates verification items |
| Coverage Mapper | 5 | Checks changed files have tests |
| Contract Checker | 5 | Verifies cross-file type contracts |
| Diff Analyzer | 5 | LLM compares diff vs PR claims |
| Gap Analyzer | 5 | LLM identifies untested changes |

**Dual-mode:** PRs with test plans get all 10 signals. PRs without test plans get the 6 that don't require one — still a full verification.

---

## Quick Start

### GitHub Marketplace (hosted)

Install from the [GitHub Marketplace](https://github.com/marketplace/keepvigil), select your repos, and you're done. Free tier includes Claims Verification, Undocumented Change Detection, credential scanning, and coverage mapping — unlimited PRs, unlimited repos.

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
version: 1

timeouts:
  shell: 300
  api: 30
  browser: 60

skip:
  categories:
    - visual
    - metadata

shell:
  image: "nikolaik/python-nodejs:python3.12-nodejs22"
  allow:
    - "npm run build"
    - "pytest"

notifications:
  on: failure
  urls:
    - https://hooks.slack.com/services/T.../B.../xxx
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
| LLM | Platform Groq (default) + BYOLLM option |
| Browser Automation | Playwright |
| Task Queue | BullMQ + Redis 7 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Build | tsup (ESM) + pnpm workspaces |
| Containerization | Docker + Docker Compose |

---

## Development

pnpm monorepo with four packages:

```text
packages/
  core/         — types, parser, classifier, score engine, credential scanner, coverage mapper
  github/       — Probot app, webhooks, pipeline, signals, reporter
  executors/    — shell, API, browser, and assertion execution
  landing/      — Next.js 15 landing page (keepvigil.dev)
```

1321+ tests across 49 files.

```bash
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

---

## License

[MIT](LICENSE)
