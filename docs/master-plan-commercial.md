# Vigil — Commercial Experience (Ready for Fresh Agent)

## Context

Vigil v3 is feature-complete and deployed. Landing page live at keepvigil.dev (13 sections, 18 doc pages, legal pages, SEO). Billing infrastructure built (Stripe tenant registered, subscriptions table, feature gating, rate limiting, checkout endpoint, PR upsell). What's missing: user-facing commercial pages and billing UX before going public.

**This plan is designed for a fresh agent with no conversation context.** Read these docs first:
- `CLAUDE.md` — project identity, conventions, workflow
- `docs/go-to-market.md` — business model, unit economics, pricing rationale
- `docs/master-plan-gtm.md` — GTM section tracker (S1-S6 complete, S7+ pending)
- `.claude/plans/design-system-vigil.md` — design tokens, colors, typography
- `.claude/plans/design-landing-vigil.md` — landing section specs (pattern reference)

## What Already Exists

### Landing (packages/landing — Next.js 15, static export, Tailwind v4)
- Home page: 13 sections (Hero, Stats, Problem, HowItWorks, Signals, Evidence, TestPlans, Config, Security, Pricing, FAQ, CTA, Footer)
- Docs: 18 pages at /docs/* with sidebar navigation
- Legal: /privacy, /terms, /about
- SEO: robots.txt, sitemap.xml, JSON-LD
- Design system: dark mode only, bg-deep #080d1a, accent #e8a820, Geist fonts
- **Static export** (`output: "export"` in next.config.ts) — no API routes, no SSR, served by nginx

### Backend (packages/github — Node.js, Probot, BullMQ)
- HTTP routes: /health, /metrics, /api/github/webhooks, /api/stripe/webhooks, /api/checkout
- Checkout: GET /api/checkout?plan=pro&installation_id=X&account=Y → Stripe Checkout redirect
- Subscription service: checkPlan(), isPro(), upsertSubscription()
- Feature gating: Pro signals (Diff, Gap, Contract) gated behind subscription check
- Rate limiting: in-memory per-installation (free 10/hr, pro 50/hr, team 200/hr)
- Stripe webhook handler: handles checkout.session.completed, subscription.updated/deleted, invoice.payment_failed

### Stripe Gateway (external service on miia-03)
- Vigil tenant registered (slug: "vigil")
- Products: Pro (prod_UAKp8hl7xmIW4z, $19/mo), Team (prod_UAKuMAyJp6YF8k, $49/mo)
- API key: in .env on server (STRIPE_GATEWAY_API_KEY)
- Skill docs: `~/.claude/skills/stripe-gateway/SKILL.md`

## Sections to Implement

### S1: Dedicated /pricing page
**Create:** `packages/landing/src/app/pricing/page.tsx`

Full-page pricing with:
- 3 plan cards (Free/Pro/Team) — reuse PricingCard component pattern from `components/sections/pricing.tsx`
- Monthly/Annual toggle (Pro: $19/mo or $190/yr — save $38. Team: $49/mo or $490/yr — save $98)
- Feature comparison table below cards:

| Feature | Free | Pro | Team |
|---------|------|-----|------|
| CI Bridge | ✅ | ✅ | ✅ |
| Credential Scan | ✅ | ✅ | ✅ |
| Test Execution | ✅ | ✅ | ✅ |
| Coverage Mapper | ✅ | ✅ | ✅ |
| Assertion Verifier | ✅ | ✅ | ✅ |
| Plan Augmentor | ✅ | ✅ | ✅ |
| Diff vs Claims | ❌ | ✅ | ✅ |
| Gap Analysis | ❌ | ✅ | ✅ |
| Contract Checker | ❌ | ✅ | ✅ |
| BYOLLM | ❌ | ✅ | ✅ |
| Webhook notifications | ❌ | ✅ | ✅ |
| Custom scoring rules | ❌ | ❌ | ✅ |
| SSO / SAML | ❌ | ❌ | ✅ |
| Org-wide config | ❌ | ❌ | ✅ |
| PRs per hour | 10 | 50 | 200 |
| PRs per day | 50 | 500 | 2000 |

- Pricing FAQ (6-8 questions about billing, cancellation, BYOLLM costs)
- CTA: Free → github.com/apps/keepvigil, Pro → /api/checkout?plan=pro, Team → /api/checkout?plan=team
- Metadata: title "Pricing | Vigil", description about plans

**Note:** Annual pricing requires creating annual Stripe prices via the Gateway:
```
POST /prices → { product: "prod_UAKp8hl7xmIW4z", unitAmount: 19000, currency: "usd", recurring: { interval: "year" } }
POST /prices → { product: "prod_UAKuMAyJp6YF8k", unitAmount: 49000, currency: "usd", recurring: { interval: "year" } }
```
Save the annual price IDs as env vars: `STRIPE_PRO_ANNUAL_PRICE_ID`, `STRIPE_TEAM_ANNUAL_PRICE_ID`

### S2: Success page (/checkout/success)
**Create:** `packages/landing/src/app/checkout/success/page.tsx`

Post-payment confirmation:
- Headline: "Welcome to Vigil Pro!" (or Team)
- What unlocked: Diff Analysis, Gap Analysis, Contract Checker, BYOLLM, Webhooks
- Next steps: 1) Configure .vigil.yml with your LLM key 2) Push a PR 3) See the full confidence score
- Links: /docs/byollm, /docs/getting-started, /docs/configuration
- "Manage your subscription →" link to /api/billing-portal (query param needed — see S3)
- Dark mode, same design system as rest of landing

### S3: Billing portal endpoint
**Modify:** `packages/github/src/server.ts`

Add route:
```
GET /api/billing-portal?customer_id=cus_xxx
  → POST to Stripe Gateway: /billing-portal/sessions
    { customerId: "cus_xxx", returnUrl: "https://keepvigil.dev" }
  → Redirect (303) to Stripe hosted billing portal URL
```

Stripe Billing Portal gives users: view invoices, update card, cancel, change plan. Zero custom UI needed.

### S4: Account info endpoint
**Modify:** `packages/github/src/server.ts`

Add route:
```
GET /api/account?installation_id=123
  → Query subscriptions table
  → Return JSON: { plan, status, currentPeriodEnd, accountLogin, stripeCustomerId }
```

No auth for v1 — installation_id is public (visible in GitHub App settings). Add auth later if needed.

### S5: Update checkout success URL
**Modify:** `packages/github/src/services/checkout.ts`

Change success URL from:
```
successUrl: "https://keepvigil.dev/docs/getting-started?checkout=success"
```
To:
```
successUrl: "https://keepvigil.dev/checkout/success"
```

### S6: Billing docs page
**Create:** `packages/landing/src/app/docs/billing/page.tsx`

Add to docs-nav.ts and create page covering:
- Plan overview (Free/Pro/Team)
- How to upgrade (from PR comment upsell or /pricing page)
- How to manage subscription (Stripe billing portal)
- How to cancel
- FAQ: what happens when I cancel? (signals revert to Free tier at end of period)
- FAQ: how does BYOLLM billing work? (you pay your LLM provider directly, not Vigil)

### S7: LICENSE file
**Create:** `/LICENSE`

MIT license, year 2026, copyright "Vigil Contributors"

### S8: Sitemap + navbar updates
**Modify:** `packages/landing/public/sitemap.xml` — add /pricing, /checkout/success, /docs/billing
**Modify:** `packages/landing/src/components/navbar.tsx` — add "Pricing" link
**Modify:** `packages/landing/src/components/sections/pricing.tsx` — add `id="pricing"` for anchor links
**Modify:** `packages/landing/src/lib/docs-nav.ts` — add Billing to nav

### S9: DB migration + deploy
- Generate Drizzle migration: `pnpm db:generate` (subscriptions table already in schema.ts but no migration file)
- Deploy backend: `ssh root@161.97.97.243 deploy-keepvigil.sh`
- Deploy landing: rebuild nginx container
- Run migration on server

## Design System Reference (for new pages)

```
Background: bg-deep #080d1a, bg-surface #0f1729, bg-elevated #1a2744
Text: text-primary #e2e8f0, text-secondary #94a3b8, text-muted #64748b
Accent: accent #e8a820, accent-hover #f0b429
Code: code-bg #060a14, code-text #c4cee0
Radius: sm 6px, md 12px, lg 16px
Fonts: Geist Sans (body), Geist Mono (code)
Section padding: py-24 sm:py-32
Container: mx-auto max-w-[1200px] px-6
Narrow: max-w-[720px]
```

Components to reuse:
- `components/scroll-reveal.tsx` — fade-up animation
- `components/docs/code-block.tsx` — code with copy
- `components/docs/callout.tsx` — info/warning boxes
- `components/docs/prev-next.tsx` — doc navigation

## Quality Gates

```bash
pnpm build && pnpm test && pnpm lint && pnpm typecheck
```

## Test Plan Template (use full paths!)

```markdown
### Existence
- [ ] `packages/landing/src/app/pricing/page.tsx` exports default function and metadata
- [ ] `packages/landing/src/app/checkout/success/page.tsx` exports default function

### Logic
- [ ] `packages/landing/src/app/pricing/page.tsx` Pro CTA uses `/api/checkout?plan=pro` href
- [ ] `packages/github/src/server.ts` billing-portal route calls Stripe Gateway and redirects 303

### Contracts
- [ ] `packages/landing/src/app/pricing/page.tsx` plan values match VALID_PLANS in `packages/github/src/services/checkout.ts`

### Edge Cases
- [ ] `packages/github/src/server.ts` billing-portal returns 400 when customer_id missing
```
