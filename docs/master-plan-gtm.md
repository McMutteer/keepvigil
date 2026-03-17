# Vigil — Master Plan: Go-to-Market Execution

## Context

Vigil v3 is feature-complete (8 signals, 818 tests, deployed, landing live). What's missing is the revenue infrastructure to go public. This plan breaks the work into autonomous sections that different agents can execute independently. Each section has clear inputs, outputs, dependencies, and verification.

**Reference docs:**
- `docs/go-to-market.md` — business model, unit economics, launch sequence
- `docs/ROADMAP.md` — technical backlog
- `CLAUDE.md` — project conventions
- `/stripe-gateway` skill — Stripe proxy API documentation

---

## Section Tracker

| # | Section | Status | Depends on | Agent |
|---|---------|--------|------------|-------|
| S1 | Stripe Tenant Registration | Pending | — | Any |
| S2 | Subscriptions Schema + Service | Pending | S1 | Billing |
| S3 | Feature Gating | Pending | S2 | Billing |
| S4 | Rate Limiting | Pending | — | Any |
| S5 | Pricing Page → Stripe Checkout | Pending | S1, S2 | Landing |
| S6 | PR Comment Upsell | Pending | S3 | Billing |
| S7 | LICENSE + Repo Public | Pending | S1-S6 | Human |
| S8 | GitHub Marketplace Listing | Pending | S7 | Any + Human |
| S9 | i18n (EN/ES) | Pending | S5 | Landing |
| S10 | Announce | Pending | S8 | Human |

---

## Section 1: Stripe Tenant Registration

**Goal:** Register Vigil as a tenant in the Stripe Gateway.

**What to do:**
1. Get the admin API key from Infisical (`stripe-gateway` project, `ADMIN_API_KEY`)
2. Register Vigil as tenant via admin API:
   ```
   POST http://stripe-gateway:3000/admin/tenants
   {
     name: "Vigil",
     slug: "vigil",
     stripeSecretKey: "sk_live_...",  ← Create a new Stripe account for Vigil or use existing
     callbackUrl: "http://keepvigil-vigil-1:3200/api/stripe/webhooks",
     rateLimitPerMinute: 200
   }
   ```
3. Save the returned `apiKey` (sgw_...) and `forwardingSecret` in Infisical (`vigil` project)
4. Create Stripe products and prices:
   ```
   POST /products → { name: "Vigil Pro", metadata: { plan: "pro" } }
   POST /prices → { product: "prod_xxx", unitAmount: 1900, currency: "usd", recurring: { interval: "month" } }
   POST /products → { name: "Vigil Team", metadata: { plan: "team" } }
   POST /prices → { product: "prod_xxx", unitAmount: 4900, currency: "usd", recurring: { interval: "month" } }
   ```
5. Save product/price IDs in Infisical or as env vars

**Output:** `STRIPE_GATEWAY_URL`, `STRIPE_GATEWAY_API_KEY`, `VIGIL_PRO_PRICE_ID`, `VIGIL_TEAM_PRICE_ID` stored in Infisical

**Verification:** `curl -H "x-api-key: sgw_..." http://stripe-gateway:3000/health` returns 200

---

## Section 2: Subscriptions Schema + Service

**Goal:** Store subscription state in Vigil's database and provide a service to query it.

**Files to create/modify:**
- `packages/core/src/db/schema.ts` — add `subscriptions` table
- `drizzle/0002_subscriptions.sql` — migration
- `packages/github/src/services/subscription.ts` — NEW: subscription service
- `packages/github/src/config.ts` — add `STRIPE_GATEWAY_URL`, `STRIPE_GATEWAY_API_KEY` env vars
- `.env.example` — add Stripe env vars

**Schema:**
```typescript
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  installationId: integer("installation_id").notNull().unique(),
  accountLogin: varchar("account_login", { length: 255 }).notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  plan: varchar("plan", { length: 50 }).notNull().default("free"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Subscription service:**
```typescript
// packages/github/src/services/subscription.ts
export async function checkProSubscription(installationId: number): Promise<boolean>
export async function getSubscription(installationId: number): Promise<Subscription | null>
export async function createOrUpdateSubscription(data: SubscriptionData): Promise<void>
```

- `checkProSubscription` queries DB, caches in Redis for 5 min (avoid DB hit on every PR)
- Cache key: `sub:${installationId}` → `"free"` | `"pro"` | `"team"`

**Stripe webhook handler:**
```typescript
// packages/github/src/webhooks/stripe.ts — NEW
// Register route: POST /api/stripe/webhooks
// Verify HMAC signature using forwardingSecret
// Handle events:
//   checkout.session.completed → create/update subscription to "pro"
//   customer.subscription.deleted → update subscription to "free"
//   customer.subscription.updated → update plan/status/period_end
//   invoice.payment_failed → update status to "past_due"
```

**Verification:**
```bash
pnpm build && pnpm test && pnpm typecheck
# Run migration on server
# Query: SELECT * FROM subscriptions WHERE installation_id = 123
```

---

## Section 3: Feature Gating

**Goal:** Pro signals only run for paying users.

**Files to modify:**
- `packages/github/src/services/pipeline.ts` — line 248: replace disabled gating with `checkProSubscription()`

**What to gate (Pro only):**
- Diff Analyzer (line 252)
- Gap Analyzer (line 257)
- Contract Checker (line 223)

**What stays Free:**
- CI Bridge, Credential Scan, Coverage Mapper, Test Execution, Assertion Verifier, Plan Augmentor

**LLM key handling:**
- Free tier: Plan Augmentor + Assertion Verifier use platform Groq key (`GROQ_API_KEY`)
- Pro tier: all signals use user's BYOLLM key from `.vigil.yml`, fallback to platform key

**Comment UX when Free:**
- Gated signals show `🔒 Pro` badge in the signal table (already implemented in comment-builder)
- Add line: "Unlock Diff Analysis, Gap Analysis, and Contract Checking → keepvigil.dev/pricing"

**Verification:**
1. Install Vigil on a test repo WITHOUT subscription → only Free signals run
2. Add subscription record → Pro signals activate on next PR
3. Delete subscription → Pro signals gated again

---

## Section 4: Rate Limiting

**Goal:** Prevent abuse on Free tier.

**Files to create/modify:**
- `packages/github/src/services/rate-limiter.ts` — NEW
- `packages/github/src/services/pipeline.ts` — check rate limit before processing

**Limits:**

| Tier | PRs/hour | PRs/day |
|------|----------|---------|
| Free | 10 | 50 |
| Pro | 50 | 500 |
| Team | 200 | 2000 |

**Implementation:** Redis sliding window:
```typescript
export async function checkRateLimit(installationId: number, plan: string): Promise<{ allowed: boolean; retryAfter?: number }>
```
- Keys: `rate:${installationId}:hour`, `rate:${installationId}:day`
- TTL: 3600s (hour), 86400s (day)
- When limit hit: skip analysis, post PR comment "Rate limit reached"

**Verification:** Send 11 PRs from a Free installation → 11th should be rate-limited

---

## Section 5: Pricing Page → Stripe Checkout

**Goal:** Pro CTA on landing creates a Stripe Checkout session.

**Files to create/modify:**
- `packages/landing/src/app/api/checkout/route.ts` — NEW: API route (if using Next.js API routes)
- OR: direct link to Stripe Checkout via Stripe Gateway
- `packages/landing/src/components/sections/pricing.tsx` — update Pro CTA href

**Flow:**
```
User clicks "Start Pro Trial" on pricing card
  → POST to Stripe Gateway: /checkout/sessions
    { priceId: VIGIL_PRO_PRICE_ID, successUrl, cancelUrl, metadata: { installationId } }
  → Redirect to Stripe Checkout page
    → User pays
      → Stripe webhook → Gateway → Vigil /api/stripe/webhooks
        → Create subscription record
          → Pro signals unlock
```

**Note:** Since landing is static export (`output: "export"`), API routes won't work directly. Options:
1. Create checkout session from the backend (Vigil server at :3200) via a new route
2. OR: use a simple redirect URL that the backend handles: `keepvigil.dev/api/checkout?plan=pro`
   - Traefik already routes `/api/*` to backend
   - Backend creates Stripe Checkout session and redirects

**Recommended:** Option 2 — add `/api/checkout` route to the Vigil backend, not the landing.

**Verification:** Click "Start Pro Trial" → redirected to Stripe Checkout → complete payment → subscription active

---

## Section 6: PR Comment Upsell

**Goal:** Free tier users see a tasteful upsell in the PR comment.

**Files to modify:**
- `packages/github/src/services/comment-builder.ts` — add upsell block when Free tier

**Content (only when user is Free and Pro signals were skipped):**
```markdown
---
💡 **Unlock the full confidence score** — Diff Analysis, Gap Analysis, and Contract Checking detect issues your test plan missed. [Upgrade to Pro →](https://keepvigil.dev/pricing)
```

**Rules:**
- Only show when at least one signal was gated (skipped due to Free tier)
- Don't show on retries
- Don't show if user has `.vigil.yml` with `llm:` section (they intend to be Pro)
- Maximum once per PR (use the comment idempotency marker)

**Verification:** Open PR on Free tier repo → upsell appears. Upgrade to Pro → upsell disappears.

---

## Section 7: LICENSE + Repo Public

**Goal:** Formalize MIT license and make repo public.

**Human action required.**

**Steps:**
1. Add `LICENSE` file to repo root (MIT, copyright 2026 Vigil)
2. GitHub Settings → Change visibility to Public
3. Verify: all secrets are in Infisical/env vars, nothing hardcoded in code

**Pre-check before going public:**
- [ ] `grep -r "sk_live\|sk_test\|gsk_\|ghp_\|gho_" packages/` → no results
- [ ] `.env` is in `.gitignore`
- [ ] `GROQ_API_KEY` is NOT in any committed file
- [ ] GitHub App private key is NOT in any committed file

---

## Section 8: GitHub Marketplace Listing

**Goal:** Publish Vigil on the GitHub Marketplace.

**Steps:**
1. Go to `https://github.com/settings/apps/keepvigil` → Marketplace listing
2. Fill in:
   - **Category:** Code review
   - **Description:** (from go-to-market.md Marketplace section)
   - **Pricing plans:** Free ($0) + Pro ($19/month) via Marketplace billing OR external billing
   - **Screenshots:** 4 images (PR comment, check run, .vigil.yml, before/after)
   - **Support URL:** `https://keepvigil.dev/docs/getting-started`
3. Submit for review (GitHub reviews Marketplace listings)

**Screenshots needed (generate from real PRs):**
1. PR comment showing 95/100 score with signal table (keepvigil PR #47)
2. GitHub Check Run with "Safe to merge" conclusion
3. `.vigil.yml` configuration example
4. Before/after test plan comparison (from landing page)

**Note:** GitHub Marketplace has its own billing system. Decision: use Marketplace billing (simpler) OR external Stripe billing (more control). Recommend: start with Marketplace billing for simplicity, migrate to Stripe later if needed.

---

## Section 9: i18n (EN/ES)

**Goal:** Landing page in English and Spanish, detected from browser.

**Depends on:** S5 (pricing finalized)

**Approach:**
- Client-side detection via `navigator.language`
- Translation dictionaries per language (EN default, ES)
- React Context providing translated strings
- Static export compatible (no middleware)

**Scope:** Landing page sections only. Docs stay in English.

---

## Section 10: Announce

**Goal:** Get the word out.

**Human action required.**

**Channels:**
- Twitter/X: thread showing the 95/100 score, before/after comparison
- Reddit: r/programming, r/devtools, r/github
- Hacker News: "Show HN: Vigil — Confidence scores for AI-generated PRs"
- Dev.to: article about the problem (merging AI PRs without verifying)

**Timing:** After Marketplace listing is approved and live.

---

## Execution Order

```
Parallelizable:
├── S1 (Stripe Registration) ──→ S2 (Schema + Service) ──→ S3 (Gating) ──→ S6 (Upsell)
├── S4 (Rate Limiting) — independent                       ↓
└── S5 (Pricing → Checkout) — needs S1 + S2               S7 (Public) ──→ S8 (Marketplace) ──→ S10 (Announce)
                                                            ↓
                                                           S9 (i18n) — after S5
```

**Critical path:** S1 → S2 → S3 → S7 → S8

---

## Quality Gates (every section)

```bash
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

## Key Files Reference

| Purpose | Path |
|---------|------|
| Pipeline (feature gating) | `packages/github/src/services/pipeline.ts:248` |
| DB schema | `packages/core/src/db/schema.ts` |
| Comment builder | `packages/github/src/services/comment-builder.ts` |
| Config/env vars | `packages/github/src/config.ts` |
| Queue/Redis | `packages/core/src/queue.ts` |
| Landing pricing | `packages/landing/src/components/sections/pricing.tsx` |
| Stripe Gateway skill | `~/.claude/skills/stripe-gateway/SKILL.md` |
| Go-to-market doc | `docs/go-to-market.md` |
| Roadmap | `docs/ROADMAP.md` |
