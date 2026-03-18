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

### v4 — PR Verification (PRs #62-#74)
**The v2 pivot.** Vigil now verifies ANY PR — no test plan required.
- Claims Verification signal — extracts claims from PR title/body, verifies against diff
- Undocumented Change Detection signal — surfaces changes not mentioned in the PR
- Dual-mode pipeline (v1+v2 with test plan, v2-only without)
- 10-signal architecture with rebalanced weights
- v2-specific onboarding tips for repos without test plans
- Full landing page rewrite (hero, signals→layers, evidence, pricing, about)
- All 24 docs pages updated for v2 messaging
- Production polish (claim truncation, coverage mapper weight, signal names)
- 1321 tests across 49 files

---

## Next Up

### Phase 2 — Inline Review Comments
- [ ] Enhance `SignalDetail` with optional `file` and `line` fields
- [ ] Build diff-position mapper (`{file, line}` → GitHub review comment position)
- [ ] Update signal producers to include file/line where available
- [ ] Post inline review comments via `octokit.rest.pulls.createReview()`
- [ ] Pro gating: inline comments are a Pro feature

### Phase 3 — Conversational
- [ ] Parse `@vigil` commands in issue comments (explain, ignore, recheck, verify)
- [ ] Memory per repo — DB table for ignore patterns, custom rules
- [ ] `@vigil ignore [finding]` suppresses findings for a repo
- [ ] `@vigil recheck` re-runs verification on current PR head

### Announce (blocked: waiting for Marketplace approval)
- [ ] Twitter/X thread — show real siegekit PR #24 as demo
- [ ] Reddit post — r/programming, r/devtools
- [ ] Hacker News — "Show HN: Vigil — Verifies that your PR does what it says it does"

---

## Future

- [ ] Usage dashboard for Pro/Team users (Phase 4)
- [ ] Team features (shared dashboard, SSO, custom scoring rules)
- [ ] Auto-approve support (score > threshold → auto-approve PR)
- [ ] GitLab / Bitbucket support (evaluate demand)
- [ ] i18n EN/ES (nice-to-have)

---

## Notes

- **Real-world testing:** siegekit PRs #8-#14 (v1), #24 (v2 first production test)
- **Best score:** 95/100 on keepvigil PR #47
- v1-v3 complete, v4 (PR verification) complete, GTM infrastructure complete
- Marketplace review pending — GitHub will notify via email
