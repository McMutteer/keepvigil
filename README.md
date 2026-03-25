<p align="center">
  <a href="https://keepvigil.dev">
    <img src=".claude/identity/icon-dark-512.png" width="120" alt="Vigil">
  </a>
</p>

<h1 align="center">Vigil</h1>

<p align="center">
  <strong>The verification layer for AI-assisted development.</strong><br>
  <sub>Checks that your PR does what it says it does.</sub>
</p>

<p align="center">
  <a href="https://github.com/marketplace/keepvigil"><img src="https://img.shields.io/badge/GitHub%20Marketplace-Install-2ea44f?logo=github" alt="Install on GitHub"></a>
  <a href="https://keepvigil.dev"><img src="https://img.shields.io/badge/keepvigil.dev-e8a820?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDJMMyA3djEwbDkgNSA5LTVWN2wtOS01eiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=" alt="Website"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/McMutteer/keepvigil/actions"><img src="https://github.com/McMutteer/keepvigil/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <a href="https://keepvigil.dev/en/docs/getting-started">Docs</a> · <a href="https://keepvigil.dev/en/pricing">Pricing</a> · <a href="https://keepvigil.dev/en/blog">Blog</a> · <a href="https://keepvigil.dev/en/about">About</a>
</p>

---

## The Problem

AI agents write code faster than humans can review it. Your PR says *"adds auth middleware"* — did it? It says *"no breaking changes"* — are there any?

**The gap between what a PR claims and what the code actually does grows with every merge.**

Vigil closes that gap. It reads your PR description, verifies every claim against the actual diff, and surfaces changes you didn't mention.

## How It Works

```
Install → Open a PR → Get verified. That's it.
```

Vigil posts a verification comment on every PR:

```
┌─────────────────────────────────────────────────────────┐
│  Vigil Confidence Score: 82/100                         │
│  Recommendation: Review recommended                     │
│                                                         │
│  Claims                                                 │
│  ✅ "Add rate limiting to API endpoints"                │
│     — confirmed: rate-limiter.ts created with 3 limits  │
│  ✅ "Add tests for rate limiter"                        │
│     — confirmed: 12 tests in rate-limiter.test.ts       │
│  ⚠️  "No breaking changes"                              │
│     — GET /api/users response adds rateLimit field      │
│                                                         │
│  Undocumented Changes                                   │
│  ⚠️  New dependency: ioredis (not mentioned in PR)       │
│  ⚠️  New env var: REDIS_URL (not documented)             │
│                                                         │
│  Impact                                                 │
│  ✅ Credentials scan: clean                             │
│  ⚠️  Coverage gap: src/middleware/auth.ts has no tests    │
│  ✅ No breaking API contract changes                    │
│                                                         │
│  Risk: MEDIUM — 7 files, touches API response schema    │
└─────────────────────────────────────────────────────────┘
```

**Read-only.** Vigil never executes code, never modifies your repo, and never accesses production systems.

## Install

### Hosted (recommended)

**[Install from GitHub Marketplace →](https://github.com/marketplace/keepvigil)**

Select your repos and you're done. No configuration needed. Free tier includes all 8 signals, unlimited repos.

### Self-host

```bash
git clone https://github.com/McMutteer/keepvigil.git
cd keepvigil
cp .env.example .env  # Fill in your GitHub App credentials
docker compose up
```

See [self-hosting docs](https://keepvigil.dev/en/docs/configuration) for details.

## 8 Verification Signals

Every PR runs through 8 independent signals that feed a weighted confidence score:

| Signal | What it does | Weight |
|--------|-------------|--------|
| **Claims Verifier** | Verifies each claim in the PR description against the diff | 30 |
| **Undocumented Changes** | Finds significant changes not mentioned in the PR | 25 |
| **Credential Scan** | Detects secrets, API keys, and passwords | 20 |
| **Coverage Mapper** | Checks if changed files have corresponding tests | 10 |
| **Contract Checker** | Verifies API and type contracts across consumers | 10 |
| **Diff Analyzer** | Deep diff quality and gap analysis | 5 |
| **Risk Score** | File count, sensitive areas, complexity assessment | info |
| **Description Generator** | Suggests a description when the PR body is empty | info |

Score: **0-100** weighted average. Critical failures (leaked secrets, false claims) cap the score at 70.

## Who It's For

- **Founders/CTOs using AI coding agents** — can't manually audit every PR from Cursor, Claude Code, or Devin
- **Tech leads of 5-15 dev teams** — not enough time to review every PR thoroughly
- **Open source maintainers** — receive PRs from strangers, need to verify claims

## Pricing

| | Free | Pro | Team |
|--|------|-----|------|
| **Price** | $0 | $12/dev/mo | $24/dev/mo |
| All 8 signals | ✅ | ✅ | ✅ |
| Unlimited repos | ✅ | ✅ | ✅ |
| Inline review comments | | ✅ | ✅ |
| Auto-approve on high scores | | ✅ | ✅ |
| Team dashboard | | | ✅ |
| @vigil commands | | | ✅ |
| Priority support | | | ✅ |

[See full pricing →](https://keepvigil.dev/en/pricing)

## Configuration

Vigil works zero-config. Optionally customize via `.vigil.yml`:

```yaml
autoApprove:
  threshold: 90

coverage:
  exclude:
    - packages/landing/

notifications:
  on: failure
  urls:
    - https://hooks.slack.com/services/...
```

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22, TypeScript 5.8 |
| GitHub | Probot 14, Octokit |
| LLM | OpenAI GPT-5.4-mini + Groq fallback |
| Queue | BullMQ + Redis 7 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Build | tsup (ESM), pnpm workspaces |
| Deploy | Docker Compose |

## Development

```bash
pnpm install
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

865 tests across 43 files. Monorepo with 5 packages:

```
packages/
  core/         — types, scoring, credential scanner, coverage mapper, LLM
  github/       — Probot app, webhooks, pipeline, 8 signals, reporter
  landing/      — Next.js 15 (keepvigil.dev)
  dashboard/    — React 19 SPA (/dashboard)
  admin/        — React 19 SPA (/admin)
```

## Vigil vs. Others

| | Vigil | CodeRabbit | GitHub Actions | Codecov |
|--|-------|-----------|----------------|---------|
| **Verifies PR claims** | ✅ | ❌ | ❌ | ❌ |
| **Surfaces undocumented changes** | ✅ | ❌ | ❌ | ❌ |
| **Code quality review** | ❌ | ✅ | ❌ | ❌ |
| **Runs tests/builds** | ❌ | ❌ | ✅ | ❌ |
| **Coverage metrics** | Basic | ❌ | ❌ | ✅ |
| **Credential scanning** | ✅ | ❌ | ❌ | ❌ |

Vigil complements code review tools — they review quality, we verify truthfulness.

## Documentation

Full docs at **[keepvigil.dev/docs](https://keepvigil.dev/en/docs/getting-started)**.

## License

[MIT](LICENSE)
