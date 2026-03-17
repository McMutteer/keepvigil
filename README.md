<p align="center">
  <img src=".claude/identity/icon.svg" width="64" alt="Vigil">
</p>

<h1 align="center">Vigil</h1>

<p align="center"><strong>Confidence scores for AI-generated PRs.</strong></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License"></a>
  <a href="https://github.com/McMutteer/keepvigil/actions"><img src="https://github.com/McMutteer/keepvigil/actions/workflows/ci.yml/badge.svg" alt="Build"></a>
  <a href="https://keepvigil.dev"><img src="https://img.shields.io/badge/website-keepvigil.dev-e8a820" alt="Website"></a>
</p>

---

## The Problem

AI agents (Claude Code, Cursor, Copilot) generate PRs with beautiful test plans that nobody verifies. Developers merge on blind trust. As agent usage grows, the gap between "what was promised" and "what was verified" widens.

No tool exists that answers: **"Can I safely merge this AI-generated PR?"**

Vigil does. It gives every pull request a **confidence score from 0 to 100** based on 9 independent signals — so you can merge with confidence, not with guilt.

---

## How It Works

1. **Install** — Add Vigil from the [GitHub Marketplace](https://github.com/marketplace/keepvigil) or self-host
2. **Push a PR** — Include a test plan section with checkboxes in the PR description
3. **Get a Score** — Vigil runs 9 signals, posts a confidence score and recommendation as a PR comment

```text
┌──────────────────────────────────────────┐
│   Vigil Confidence Score: 95/100         │
│                                          │
│   ✅ CI checks passed (3/3)        w25   │
│   ✅ No credentials in diff        w20   │
│   ✅ Test execution: 12/12 passed  w15   │
│   ✅ Plan augmentor: 5/5 verified  w15   │
│   ✅ Contracts compatible          w10   │
│   ✅ Coverage: 100% of files       w5    │
│   ✅ Diff matches claims           w5    │
│   ✅ No gaps detected              w5    │
│   ✅ Assertions verified (7 files) —     │
│                                          │
│   Recommendation: Safe to merge          │
└──────────────────────────────────────────┘
```

---

## Signals

Vigil evaluates every PR across 9 signals. Each contributes to a weighted score.

| Signal | Weight | Tier | Description |
|--------|--------|------|-------------|
| CI Bridge | 25 | Free | Maps test plan items to GitHub Actions results |
| Credential Scan | 20 | Free | Detects hardcoded secrets, API keys, and passwords in the diff |
| Test Execution | 15 | Free | Runs test plan items in Docker sandbox, browser, or assertion mode |
| Plan Augmentor | 15 | Free | Auto-generates and verifies items the test plan missed |
| Contract Checker | 10 | Pro | Verifies API/frontend type contracts match across files |
| Coverage Mapper | 5 | Free | Checks changed files have test files or test plan references |
| Diff vs Claims | 5 | Pro | LLM compares actual changes vs test plan promises |
| Gap Analysis | 5 | Pro | LLM identifies untested code changes |
| Assertion Verifier | — | Free | Reads source files and verifies claims via LLM (shares executor weight) |

### Score & Recommendation

| Score | Recommendation | Check Run |
|-------|---------------|-----------|
| 80–100 | Safe to merge | Success |
| 50–79 | Review needed | Neutral |
| 0–49 | Caution | Failure |

Any deterministic signal failure (CI, credentials, execution) caps the score at 70 — one hard failure means it's never "safe to merge."

---

## Quick Start

### GitHub Marketplace (hosted)

Install from the [GitHub Marketplace](https://github.com/marketplace/keepvigil), select your repos, and you're done. Free tier runs 6 signals with zero configuration.

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

Per-repo configuration via `.vigil.yml` in the repository root:

```yaml
version: 1

# Timeouts (seconds)
timeouts:
  shell: 300
  api: 30
  browser: 60

# Skip specific test categories
skip:
  categories:
    - visual
    - metadata

# Shell executor
shell:
  image: "nikolaik/python-nodejs:python3.12-nodejs22"
  allow:
    - "npm run build"
    - "pytest"

# Webhook notifications
notifications:
  on: failure    # failure | always
  urls:
    - https://hooks.slack.com/services/T.../B.../xxx

# LLM for Pro signals (BYOLLM)
llm:
  provider: groq
  model: llama-3.3-70b-versatile
  api_key: gsk_xxx
```

---

## BYOLLM (Bring Your Own LLM)

Pro-tier signals use LLM analysis. Configure your own provider in `.vigil.yml`:

```yaml
llm:
  provider: groq          # openai | groq | ollama
  model: llama-3.3-70b-versatile
  api_key: gsk_your_key_here
```

Supported providers: **OpenAI**, **Groq**, **Ollama** (local). Without `llm:` config, Vigil runs Free tier signals only — still valuable, zero LLM cost.

---

## Documentation

Full documentation is available at **[keepvigil.dev](https://keepvigil.dev)**.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 + TypeScript 5.8 |
| GitHub Integration | Probot 14 + Octokit |
| LLM | BYOLLM (OpenAI, Groq, Ollama) — configurable per repo |
| Browser Automation | Playwright |
| Task Queue | BullMQ + Redis 7 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Build | tsup (ESM) + pnpm workspaces |
| Containerization | Docker + Docker Compose |

---

## Development

This is a pnpm monorepo with four packages:

```text
packages/
  core/         — types, parser, classifier, score engine, credential scanner, coverage mapper, smart reader
  github/       — Probot app, webhooks, pipeline, signals, reporter
  executors/    — shell, API, browser, and assertion test execution
  landing/      — Next.js 15 landing page (keepvigil.dev)
```

836+ tests across 30+ files. v3 is feature-complete.

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
# Fill in GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GROQ_API_KEY, etc.
docker compose up
```

---

## License

[MIT](LICENSE)
