# Vigil — Go-to-Market Plan

> Strategic document for launching Vigil as a public product. Any agent working on commercialization should read this first.

## Current State (2026-03-17)

### What's Done
- **Product:** v3 complete — 8 signals, confidence score 0-100, 818 tests, deployed and running
- **Landing page:** Live at `keepvigil.dev` — 13 sections, dark mode, sales-focused
- **Documentation:** 18 pages at `/docs/*` — getting started, signals, config, security, etc.
- **Legal pages:** Privacy policy, Terms of service, About
- **SEO:** robots.txt, sitemap.xml, JSON-LD structured data
- **Visual identity:** Logo (The Sentinel), favicon, brand guide
- **GitHub App:** Registered, webhook working, logo uploaded
- **Infrastructure:** Dokploy on Contabo (EU), PostgreSQL, Redis, Docker

### What's NOT Done
- Stripe billing (no revenue)
- Feature gating (Pro signals run free for everyone)
- Rate limiting (no protection against abuse)
- Marketplace listing (not public)
- Repo is private

---

## Business Model

### How Vigil Makes Money

Vigil is **open-source SaaS**. The code is MIT-licensed. Revenue comes from the **hosted service**, not the code.

```
Hosted (SaaS) ← This is the business
├── Free:  $0/forever — 6 signals, unlimited PRs, unlimited repos
├── Pro:  $19/month — all 8 signals, BYOLLM, webhooks, priority support
└── Team: $49/month — dashboard, custom rules, SSO, org-wide config

Self-hosted ← This is the community
└── Clone repo, create own GitHub App, run own server — free forever (MIT)
```

### Why Self-Hosting Doesn't Kill the Business

Self-hosting Vigil requires:
1. Create your own GitHub App (configure permissions, webhooks, keys)
2. Run a server with Docker, PostgreSQL, Redis
3. Provide your own LLM API key (Groq/OpenAI/Ollama)
4. Handle uptime, security, updates

**95% of developers will pay $19/month to avoid this.** Same model as GitGuardian, Codecov, Sentry — all open source, all profitable with hosted tiers.

### Unit Economics

| Metric | Value |
|--------|-------|
| Server cost | ~$15/month (Contabo VPS, 6 CPU, 12GB) |
| LLM cost per PR (platform) | ~$0.01 (Groq, platform key for Free tier) |
| LLM cost per PR (Pro) | $0 (user's own key — BYOLLM) |
| Capacity per server | ~200 active users |
| Break-even | ~1 Pro user ($19 > $15 server) |
| 100 Pro users | $1,900/month revenue on $15/month infra |
| Margin | ~99% for Pro (BYOLLM = zero variable cost) |

### BYOLLM: The Key Insight

Pro users bring their own LLM API key. This means:
- **Zero variable cost** for Vigil — the user pays Groq/OpenAI directly
- **User controls data flow** — their code goes to their LLM provider
- **User controls cost** — they choose cheap fast models or expensive smart ones
- **Near-100% margin** on Pro subscriptions

---

## Revenue Infrastructure (For Billing Agent)

### What Needs to Be Built

#### 1. Stripe Integration

**Use the existing `/stripe-gateway` skill** — Vigil already has access to a multi-tenant Stripe proxy deployed on the same server.

**Flow:**
```
User installs GitHub App → sees Free tier working
  → clicks "Upgrade to Pro" on keepvigil.dev/pricing or in PR comment
    → Stripe Checkout session (hosted by Stripe, not us)
      → Webhook confirms payment
        → Store subscription in Vigil DB (installationId → plan)
          → Feature gating unlocks Pro signals
```

**Database schema needed:**
```sql
-- New table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  installation_id INTEGER NOT NULL UNIQUE,  -- GitHub App installation
  github_account_login TEXT NOT NULL,        -- org or user name
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',         -- 'free' | 'pro' | 'team'
  status TEXT NOT NULL DEFAULT 'active',     -- 'active' | 'canceled' | 'past_due'
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key decisions:**
- Billing is per **GitHub installation** (org or user), not per repo
- One subscription covers all repos in that installation
- Free tier works without any subscription record (default)
- Pro unlocks when `subscription.plan === 'pro'` and `status === 'active'`

#### 2. Feature Gating (Activate)

Currently in `packages/github/src/services/pipeline.ts`, Pro gating is **disabled for testing**:
```typescript
// TODO: Enable when billing is ready
const isPro = true; // Should check subscription
```

When billing is ready, change to:
```typescript
const isPro = await checkSubscription(context.installationId);
```

**What Pro unlocks:**
- Diff vs Claims signal (LLM)
- Gap Analysis signal (LLM)
- Contract Checker signal (LLM)
- Webhook notifications
- Priority queue (Pro jobs ahead of Free)

**What stays Free:**
- CI Bridge
- Credential Scan
- Test Execution (shell, API, browser, assertion)
- Coverage Mapper
- Plan Augmentor (generates items but uses platform LLM, not user's)

#### 3. Rate Limiting

**Per-installation limits:**

| Tier | PRs per hour | PRs per day |
|------|-------------|-------------|
| Free | 10 | 50 |
| Pro | 50 | 500 |
| Team | 200 | 2000 |

**Implementation:** Use Redis (already running) with sliding window counters:
```
rate:installation:{installationId}:hour → count
rate:installation:{installationId}:day → count
```

When limit hit → skip analysis, post PR comment: "Rate limit reached. Upgrade to Pro for higher limits."

#### 4. Billing Portal

**Minimal — use Stripe's hosted pages:**
- Checkout: `stripe.checkout.sessions.create()` → redirect to Stripe
- Manage subscription: `stripe.billingPortal.sessions.create()` → redirect to Stripe
- No custom dashboard needed for v1

**Where to link:**
- Landing page pricing cards → Stripe Checkout
- PR comment (when Pro signals are gated) → "Unlock with Pro →" link
- `/docs/byollm` → "Requires Pro subscription"

---

## Launch Sequence

### Phase 1: Revenue Infrastructure (BEFORE going public)

| Step | What | Who | Depends on |
|------|------|-----|------------|
| 1.1 | Stripe integration via `/stripe-gateway` | Billing agent | — |
| 1.2 | Subscriptions table + Drizzle schema | Billing agent | — |
| 1.3 | Feature gating activation | Billing agent | 1.1, 1.2 |
| 1.4 | Rate limiting (Redis) | Billing agent | — |
| 1.5 | Pricing page links → Stripe Checkout | Billing agent | 1.1 |
| 1.6 | PR comment "Upgrade to Pro" link | Billing agent | 1.1, 1.3 |
| 1.7 | Test full flow: install → Free → upgrade → Pro signals activate | Billing agent | All above |

### Phase 2: Public Launch

| Step | What | Who | Depends on |
|------|------|-----|------------|
| 2.1 | Add LICENSE file (MIT) to repo root | Any agent | — |
| 2.2 | Make repo public | Human (Sotero) | Phase 1 complete |
| 2.3 | GitHub Marketplace listing | Any agent + Human approval | 2.2 |
| 2.4 | Update landing hero CTA → Marketplace link | Any agent | 2.3 |
| 2.5 | Announce (Twitter, Reddit r/programming, HN) | Human | 2.3 |

### Phase 3: Growth

| Step | What | Priority |
|------|------|----------|
| 3.1 | Onboarding email sequence (after install) | High |
| 3.2 | Usage dashboard for Pro/Team users | Medium |
| 3.3 | Internationalization (EN/ES) | Medium |
| 3.4 | GitLab / Bitbucket support | Low (evaluate demand) |
| 3.5 | Team features (shared dashboard, SSO) | Low (when Team tier has users) |
| 3.6 | Auto-merge support (score > threshold → auto-approve) | Low |

---

## GitHub Marketplace Listing

### Requirements (from GitHub docs)
- [x] Repo must have a README
- [ ] Repo must be public
- [x] GitHub App must have a homepage URL
- [x] GitHub App must have a webhook URL
- [ ] GitHub App must have a pricing plan (free + paid via Marketplace)
- [x] GitHub App must have a logo
- [ ] Listing must include: description, screenshots, support URL

### Listing Content (draft)

**Name:** Vigil
**Tagline:** Confidence scores for AI-generated PRs
**Category:** Code review

**Description:**
> Vigil gives every pull request a confidence score from 0 to 100. It collects 8 independent signals — CI results, credential scans, test execution, file assertion verification, coverage mapping, diff analysis, gap detection, and contract checking — and combines them into a single number that tells you how safe it is to merge.
>
> Built for developers who use AI coding agents (Claude Code, Cursor, Copilot) and want to merge with evidence, not blind trust. Zero configuration required.

**Screenshots needed:**
1. PR comment showing 95/100 score with signal table
2. Check run with "Safe to merge" conclusion
3. `.vigil.yml` configuration example
4. Before/after test plan comparison

---

## Key Files Reference (for any agent)

| File | Purpose |
|------|---------|
| `docs/go-to-market.md` | This document — strategic plan |
| `docs/ROADMAP.md` | Technical roadmap (features, bugs, improvements) |
| `docs/vision-v2-confidence-score.md` | Product vision, positioning, pricing rationale |
| `docs/first-95-score-showcase.md` | Real PR #47 evaluation data for marketing |
| `docs/writing-test-plans.md` | Test plan quality guide (user-facing) |
| `CLAUDE.md` | Project instructions, conventions, workflow |
| `packages/github/src/services/pipeline.ts` | Where feature gating lives (line ~80, `isPro` flag) |
| `packages/github/src/config.ts` | Environment variables and defaults |
| `docker-compose.yml` | Production deployment config |
| `.claude/plans/design-landing-vigil.md` | Landing page design specs |
| `.claude/identity/brand.md` | Visual identity guide |

---

## What NOT to Change Without Discussion

- **Signal weights** — calibrated through real-world testing (siegekit + keepvigil PRs)
- **Score thresholds** — 80/50 boundaries tested and documented
- **BYOLLM architecture** — zero variable cost is the business moat
- **Landing page tone** — silent, nocturnal, precise (not generic SaaS)
- **Dark mode only** — brand decision, not a bug
