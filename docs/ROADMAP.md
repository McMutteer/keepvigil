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

### Phase 2 — Inline Review Comments (PRs #76-#77)
- SignalDetail enhanced with optional `file` and `line` fields
- Diff-position mapper (`{file, line}` → GitHub review comment position)
- Inline review comments via GitHub Reviews API (`octokit.rest.pulls.createReview()`)
- Pro gating: inline comments are a Pro-only feature

### Phase 3 — Conversational (PRs #78-#80)
- `@vigil` commands in issue comments (explain, ignore, recheck, verify)
- Repo memory — `repo_rules` DB table for persistent ignore patterns
- `@vigil ignore [finding]` suppresses matching findings for a repo
- `@vigil recheck` re-runs verification on current PR head

### Phase 4 — Dashboard (PRs #81-#87)
- Execution persistence — pipeline writes score, mode, and signal summary to `executions` table
- GitHub OAuth with JWT sessions (`jose`, HS256, 7-day expiry)
- Auth middleware with installation access verification
- Dashboard API — 4 read-only endpoints (executions, stats, repos, detail)
- Vite + React 19 SPA at `/dashboard/` (same design system as landing)
- Nginx deployment integration (dual build, SPA fallback)
- Landing CTA — Dashboard link in navbar + pricing page card
- 1387 tests across 55 files

---

## Next Up

### Deploy Dashboard
- [ ] Run migration `0007_smart_ultimates.sql` on production
- [ ] Enable OAuth in GitHub App settings + add callback URL
- [ ] Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET` on server
- [ ] Deploy via `ssh root@161.97.97.243 deploy-keepvigil.sh`
- [ ] Verify `/dashboard` loads, OAuth flow works end-to-end

### Signal Quality — Dogfooding Fixes
Found by running Vigil on its own dashboard PRs (#81-#87):
- [ ] Template literal confusion in diffs — LLM misreads backticks as single quotes in JSX/TSX (critical, ~10+ false positives per PR)
- [ ] Credential scan in test files — reduce weight for `__tests__/` paths, skip generic values
- [ ] Coverage mapper path matching — handle `__tests__/` directory pattern (not just colocated `.test.ts`)
- [ ] Coverage mapper config noise — exclude non-code files (.conf, .yml, Dockerfile, .md)

### Announce (blocked: waiting for Marketplace approval)
- [ ] Twitter/X thread — show real siegekit PR #24 as demo
- [ ] Reddit post — r/programming, r/devtools
- [ ] Hacker News — "Show HN: Vigil — Verifies that your PR does what it says it does"

---

## Future

### Phase 5 — v1 Deprecation
- [ ] Deprecate BYOLLM (v1-only, platform LLM is fast enough)
- [ ] Deprecate shell executor (security surface, low usage)
- [ ] Simplify pipeline to v2-only

### Platform
- [ ] Auto-approve support (score > threshold → auto-approve PR)
- [ ] Team features (shared dashboard, SSO, custom scoring rules)
- [ ] i18n EN/ES
- [ ] GitLab / Bitbucket support (evaluate demand)

---

## Notes

- **Real-world testing:** siegekit PRs #8-#14 (v1), #24 (v2 first production test)
- **Best score:** 95/100 on keepvigil PR #47
- **Dogfooding:** Vigil reviews its own PRs — bugs found are tracked in "Signal Quality" above
- Marketplace review pending — GitHub will notify via email
