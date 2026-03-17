# Vigil

**Confidence scores for AI-generated PRs.**

Vigil is a GitHub App that gives every pull request a **confidence score** — a number from 0-100 that tells you how safe it is to merge. Built for developers who use AI coding agents daily and want to merge with confidence, not with guilt.

```text
┌─────────────────────────────────────┐
│   Vigil Confidence Score: 82/100    │
│                                     │
│   ✅ CI checks passed (3/3)         │
│   ✅ No credentials in diff         │
│   ✅ Test execution: 4/5 passed     │
│   ⚠️  Test coverage: 60% of files   │
│   🔒 Diff analysis (Pro)            │
│   🔒 Gap analysis (Pro)             │
│                                     │
│   Recommendation: Safe to merge     │
└─────────────────────────────────────┘
```

---

## The problem

AI agents (Claude Code, Cursor, Copilot) generate PRs with beautiful test plans that nobody verifies. Developers merge on blind trust. As agent usage grows, the gap between "what was promised" and "what was verified" widens.

No tool exists that answers: **"Can I safely merge this AI-generated PR?"**

---

## How it works

1. A PR is opened with a test plan section in the description
2. Vigil collects **multiple signals** about the PR — not just running tests
3. Each signal contributes to a weighted **confidence score (0-100)**
4. The score, recommendation, and detailed breakdown appear as a GitHub Check Run and PR comment

### Signals

| Signal | LLM? | Free | Description |
|--------|------|------|-------------|
| CI Bridge | No | ✅ | Maps test plan items to GitHub Actions results |
| Credential Scan | No | ✅ | Scans diff for hardcoded secrets, API keys, passwords |
| Coverage Mapper | No | ✅ | Checks if changed files have corresponding test files |
| Test Execution | No | ✅ | Runs shell, API, and browser tests from the test plan |
| Diff vs Claims | Yes | Pro | LLM compares what changed vs what the test plan promises |
| Gap Analysis | Yes | Pro | LLM identifies untested areas in the code changes |

### Score & Recommendation

| Score | Recommendation | Check Run |
|-------|---------------|-----------|
| 80-100 | Safe to merge ✅ | Success |
| 50-79 | Review needed ⚠️ | Neutral |
| 0-49 | Caution 🔴 | Failure |

Any signal failure (e.g., credentials detected) caps the score at 70 — one problem means it's never "safe to merge."

---

## BYOLLM (Bring Your Own LLM)

Pro-tier signals use your own LLM API key. Configure in `.vigil.yml`:

```yaml
version: 1
llm:
  provider: groq          # openai | groq | ollama
  model: llama-3.3-70b-versatile
  api_key: gsk_your_key_here
```

Without `llm:` config, Vigil runs Free tier signals only — still valuable, zero LLM cost.

---

## Configuration

Per-repo configuration via `.vigil.yml`:

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

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 + TypeScript 5.8 |
| GitHub Integration | Probot 14 + Octokit |
| LLM | BYOLLM (OpenAI, Groq, Ollama) — configurable per repo |
| Browser Automation | Playwright |
| Task Queue | BullMQ + Redis 7 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Containerization | Docker + Docker Compose |

---

## Project status

Vigil v2 (confidence score) is **feature-complete**. 740 tests across 26 files.

| v2 Section | Status |
|------------|--------|
| Score Engine | ✅ |
| BYOLLM Client | ✅ |
| Credential Scanner | ✅ |
| CI Bridge | ✅ |
| Coverage Mapper | ✅ |
| Diff Analyzer (LLM) | ✅ |
| Gap Analyzer (LLM) | ✅ |
| Executor Adapter | ✅ |
| Pipeline v2 Integration | ✅ |
| Free/Pro Tier Gating | ✅ |

---

## Development

This is a pnpm monorepo with three packages:

```text
packages/
  core/       — types, parser, classifier, score engine, credential scanner, coverage mapper
  github/     — Probot app, webhooks, pipeline, signals, reporter
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
# fill in GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GROQ_API_KEY, etc.

docker compose up
```

---

## License

MIT
