# Vigil Roadmap

Backlog de mejoras priorizadas. Referencia principal para cualquier sesión de trabajo.

---

## Completado

### v1 — Core (PRs #1-#10)
Project bootstrap, GitHub App, parser, classifier, executors (shell, API, browser), reporter, orchestrator, deployment.

### v2 — Confidence Score (PRs #29-#38)
Score engine, BYOLLM, credential scanner, CI bridge, coverage mapper, diff analyzer, gap analyzer, executor adapter, pipeline integration, free/pro gating.

### v3 — Signal Improvements (PRs #45-#49)
Plan Augmentor, Contract Checker, coverage reform, signal coordination, CLAUDE.md context, onboarding tips, smart file reader.

### Production Hardening (PRs #14-#21)
All P0/P1 bugs fixed, structured logging, metrics, 836+ tests, CI pipeline, graceful degradation, all audit items resolved.

### P2 Features (PRs #22-#25)
`.vigil.yml` config, config UX warnings, `/vigil retry` command, webhook notifications (Slack/Discord).

### Go-to-Market Infrastructure
- [x] Stripe billing integration (tenant, products, checkout, webhooks)
- [x] Subscriptions table + feature gating + rate limiting
- [x] Landing page (13 sections, 20 docs pages, legal, SEO)
- [x] Dedicated /pricing page with comparison table + monthly/annual toggle
- [x] /checkout/success page
- [x] Billing endpoints (/api/billing-portal, /api/account)
- [x] /docs/billing documentation page
- [x] MIT LICENSE
- [x] Repo made public
- [x] GitHub Marketplace listing submitted (pending review)

---

## Next Up

### S10 — Announce (blocked: waiting for Marketplace approval)
- [ ] Twitter/X thread — hook + demo + CTA
- [ ] Reddit post — r/programming, r/devtools, r/github
- [ ] Hacker News — "Show HN: Vigil — Confidence scores for AI-generated PRs"
- [ ] Dev.to article — explain the problem, show real results
- **Timing:** After Marketplace listing is approved and live

### Landing & Documentation Improvements
- [ ] Better hero section — more compelling, show real PR comment
- [ ] Add real testimonials/case studies when available
- [ ] Improve mobile responsiveness
- [ ] Add changelog/releases page
- [ ] Docs: add more signal examples with real PR data

### i18n — Bilingual (EN/ES)
- [ ] Path-based routing (`/en/`, `/es/`)
- [ ] Dictionary system for all UI text
- [ ] Translate all 31 pages
- [ ] Language toggle in navbar
- [ ] SEO: hreflang tags
- **Priority:** Nice-to-have, not blocking launch

### Product Improvements (v3.1)
- [ ] **Augmentor score semantics** — low score means "found issues" (good), not "failed". Consider findings count instead of pass/fail ratio.
- [ ] **Comment narrative** — separate "Your test plan: 17/17 passed" from "Vigil found 4 additional concerns"
- [ ] **Test plan quality signal** — warn if >80% existence checks, suggest logic/contract items
- [ ] **Rate limit handling for Groq** — graceful fallback when API rate limited
- [ ] Integration tests — E2E with real PR (mock GitHub or test repo)

### Future
- [ ] Usage dashboard for Pro/Team users
- [ ] Team features (shared dashboard, SSO, custom scoring rules)
- [ ] Annual Stripe prices (Pro $190/yr, Team $490/yr)
- [ ] GitLab / Bitbucket support (evaluate demand)
- [ ] Auto-merge support (score > threshold → auto-approve)
- [ ] Onboarding email sequence (after install)

---

## Notes

- **Real-world testing:** siegekit PRs #8-#14, keepvigil PRs #45-#53
- **Best score:** 95/100 on keepvigil PR #47
- v1 complete, v2 complete, v3 complete, GTM infrastructure complete
- Marketplace review pending — GitHub will notify via email
