# Vigil v2 — Confidence Score for AI-Generated PRs

> Vision document. Consolidation of strategic discussions from 2026-03-15.
> This is the north star for the pivot. Implementation details in the master plan.

## The Problem

AI agents (Claude Code, Cursor, Copilot) generate PRs with beautiful test plans that nobody verifies. Developers merge on blind trust. As agent usage grows, the gap between "what was promised" and "what was verified" widens.

No tool exists that answers: **"Can I safely merge this AI-generated PR?"**

## The Product

Vigil gives every PR a **confidence score** — a number from 0-100 that tells you how safe it is to merge.

The score is built from multiple signals, not just running tests:

| Signal | Needs LLM? | Description |
|--------|-----------|-------------|
| CI Bridge | No | Maps test plan items to GitHub Actions jobs. Did the CI already verify this? |
| Credential Scan | No | Scans diff for hardcoded secrets, API keys, passwords |
| Diff vs Claims | Yes | LLM compares what the PR changed vs what the test plan promises |
| Test Plan Gap Analysis | Yes | What areas of the code changed but aren't covered by the test plan? |
| Coverage Mapper | No | Which changed files have test coverage? Which don't? |
| Shell Executor | No | Runs simple commands in sandbox (existing feature) |
| Browser Verification | No | Screenshots + visual verification via preview URL (existing feature) |

### The Score

```
┌─────────────────────────────────────┐
│   Vigil Confidence Score: 72/100    │
│                                     │
│   ✅ CI checks passed (3/3)         │
│   ✅ No credentials in diff         │
│   ⚠️  Test plan covers 60% of       │
│      changed files                  │
│   ❌ 2 changed files have no        │
│      test coverage                  │
│   ⚠️  No preview URL — visual       │
│      checks skipped                 │
│                                     │
│   Recommendation: Review needed     │
└─────────────────────────────────────┘
```

The developer sees the score and decides. Not pass/fail — informed judgment.

## Positioning

**Before:** "Your test plans, actually tested" (competing with CI)
**After:** "How confident are you in your AI's PRs?" (new market, no competition)

### Target User
Developers and teams that use AI coding agents daily. They generate 5-20 PRs per day via agents. They want to merge with confidence, not with guilt.

### Tagline Candidates
- "Confidence scores for AI-generated PRs"
- "Trust but verify — automated"
- "Know which PRs need your eyes"

## Business Model

### BYOLLM (Bring Your Own LLM)
User provides their own LLM API key (OpenAI, Anthropic, Groq, etc.). Vigil uses it for diff analysis and gap detection. This means:
- Zero variable cost for us (no LLM bills)
- User controls quality vs cost tradeoff
- Margins are near 100%

### Pricing

```
Free:      CI bridge + credential scan (no LLM needed)
           → Immediate value, no config required

Pro $19:   + diff analysis + gap analysis + confidence score (BYOLLM)
           → The full experience

Team $49:  + shared dashboard + Slack/Discord notifications + custom rules
           → For teams managing multiple repos with agents
```

### Why $19
- Impulse buy for a developer — no manager approval needed
- Less than a coffee a day
- Our cost per user is ~$0.10/mo (server amortized)
- 200 Pro users = $3,800/mo revenue on a $15/mo server

## What We Keep from v1

The v1 codebase is NOT thrown away. Most of it carries forward:

| Component | Status | In v2 |
|-----------|--------|-------|
| GitHub App + webhooks | ✅ Keep | Core infrastructure |
| Test plan parser | ✅ Keep | Still parses checkboxes |
| Classifier (rule + LLM) | ✅ Adapt | Feeds into score engine |
| Shell executor | ✅ Keep | One signal among many |
| Browser executor | ✅ Keep | One signal among many |
| Reporter + comment builder | ✅ Adapt | New score-based format |
| Queue + Worker | ✅ Keep | Same async pipeline |
| Config (.vigil.yml) | ✅ Extend | Add LLM key, scoring prefs |
| Webhook notifier | ✅ Keep | Notify on low scores |
| Infrastructure | ✅ Keep | Same server, DB, Redis |

## What We Build New

| Component | Effort | Priority |
|-----------|--------|----------|
| CI Bridge — read GitHub Actions results | 2-3 days | P0 |
| Diff Analyzer — LLM compares diff vs claims | 3-4 days | P0 |
| Score Engine — combine signals into 0-100 | 2-3 days | P0 |
| Credential Scanner — regex patterns in diff | 1 day | P0 |
| Coverage Mapper — changed files vs test files | 2 days | P1 |
| Test Plan Gap Analysis — what's missing | 2-3 days | P1 |
| BYOLLM config — user provides API key | 1 day | P0 |
| New comment format — score-based | 1-2 days | P0 |
| Free tier (no LLM signals) | Already done | P0 |
| Stripe billing | Via stripe-gateway | P1 |
| Landing page update | 2-3 days | P1 |

**Estimated total: ~3 weeks to MVP**

## Infrastructure

Current server handles it. BYOLLM means no inference costs:
- 6 CPU, 12GB RAM VPS ($15/mo)
- PostgreSQL for scores + history
- Redis + BullMQ for job queue
- GitHub API for CI results, deployments, diff

Scales to ~200 users on one server. Beyond that, add workers.

## Competitive Landscape

| Tool | What it does | Vigil's edge |
|------|-------------|--------------|
| GitHub Actions | Runs CI | Vigil reads CI results + adds LLM analysis |
| CodeRabbit | Reviews PR code | Vigil focuses on test plan verification, not code style |
| Copilot PR Review | Suggests changes | Vigil gives a merge confidence score |
| Codecov | Coverage reports | Vigil maps coverage to specific test plan claims |

None of these answer: "should I merge this agent-generated PR?"

## Risks

1. **Score calibration** — if the score says 85 and the PR has a bug, trust is lost. Need extensive testing.
2. **LLM quality variance** — cheap LLMs give bad analysis. User blames Vigil. Mitigate: minimum model recommendations.
3. **GitHub Copilot native** — GitHub could build this natively. Moat: move fast, establish brand, build community.
4. **Market timing** — if agents plateau, the problem shrinks. Bet: agents are only growing.

## Open Questions

- What's the minimum score to auto-approve a merge? Should Vigil support auto-merge?
- How do we handle monorepos? Score per package or per PR?
- Should the score decay over time? (PR open 5 days = lower confidence due to drift)
- Can we use Git blame + historical data to weight signals? (files that break often = higher weight)
