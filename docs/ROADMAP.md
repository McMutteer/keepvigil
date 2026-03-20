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

### Signal Quality — Dogfooding Fixes (PR #88)
Found by running Vigil on its own dashboard PRs (#81-#87). All fixed and verified:
- [x] Template literal confusion in diffs — `escapeCodeFence()` replaces `escapeBackticks()`, only escaping triple-backtick sequences
- [x] Credential scan in test files — test files get `warn` status, generic fixture values skipped, test-only findings score 70
- [x] Coverage mapper path matching — walk up parent directories to find `__tests__/` at package level
- [x] Coverage mapper config noise — added `*.config.*`, `nginx.conf`, `entrypoint.sh` to non-source exclusions

### Phase 5 — v1 Deprecation (PR #91)
- [x] Removed `packages/executors` (shell, browser, API executors + Chromium/Playwright)
- [x] Removed BYOLLM — all PRs use platform LLM (Groq)
- [x] Removed parser + classifier from `packages/core`
- [x] Simplified pipeline to v2-only (6 signals: claims-verifier, undocumented-changes, credential-scan, coverage-mapper, contract-checker, diff-analyzer)
- [x] Docker image ~500MB lighter (no Chromium)

### Auto-approve (PR #92)
- [x] `.vigil.yml` `auto_approve.threshold` (80-100) — submits approving GitHub review when score exceeds threshold
- [x] Pro/Team only gating
- [x] Config parser validates threshold range

### i18n EN/ES (PR #93)
- [x] Landing page fully translated (31 pages, 62 HTML outputs)
- [x] `[locale]` dynamic segment with `generateStaticParams`
- [x] Translation dictionaries (`en.ts`, `es.ts`)
- [x] Language switcher in navbar (EN | ES)

### Signal Quality Round 2 (PRs #94, #96, #98)
- [x] `coverage.exclude` in `.vigil.yml` — repos exclude paths from coverage analysis
- [x] Inline comment deduplication across re-reviews
- [x] LLM retry with exponential backoff (429/502/503)
- [x] Claims verifier threshold raised from 50% to 80%, penalties increased
- [x] Failure cap only for credential-scan (not coverage-mapper)
- [x] Undocumented changes: concrete ignore patterns + examples in prompt
- [x] Contract checker: broader file patterns (GraphQL, tRPC, ORM)
- [x] Credential scanner: skip .env.example files, apply generic test value check to all patterns

### AI-First Messaging Rewrite (PR #95)
- [x] Hero: "Merge with confidence" + AI-assisted development badge
- [x] Signals: 3 layers → 2 (Trust Verification + Deep Analysis)
- [x] 8 deprecated doc pages → redirect stubs
- [x] 10 doc pages rewritten for v2-only
- [x] FAQ + pricing + about updated

### OpenAI GPT-5.4 Nano (PR #99)
- [x] Primary: OpenAI GPT-5.4 nano with reasoning effort
- [x] Fallback: Groq gpt-oss-120b (automatic on failure)
- [x] `createLLMClientWithFallback()` for provider resilience
- [x] Reasoning effort by tier: configurable per subscription level

---

## Next Up

### Per-Seat Pricing Pivot
- [ ] Per-seat rate limiter (key by developer, not installation)
- [ ] Stripe per-seat checkout (quantity-based pricing)
- [ ] Landing + docs update for per-seat pricing ($12/dev Pro, $24/dev Team)

### Announce (blocked: waiting for Marketplace approval)
- [ ] Twitter/X thread — show real siegekit PR #24 as demo
- [ ] Reddit post — r/programming, r/devtools
- [ ] Hacker News — "Show HN: Vigil — The verification layer for AI-generated PRs"

---

## Future

### Platform
- [ ] Dashboard i18n (currently English only)
- [ ] Team features (shared dashboard, SSO, custom scoring rules)
- [ ] GitLab / Bitbucket support (evaluate demand)

### Infrastructure
- [ ] Landing Dockerfile SHA pin (matches main Dockerfile)
- [ ] Redis maxmemory-policy: `allkeys-lru` instead of `noeviction`
- [ ] CSP header in nginx

---

## Notes

- **Real-world testing:** siegekit PRs #8-#14 (v1), #24 (v2 first production test)
- **Best score:** 100/100 on keepvigil PR #96
- **Dogfooding:** Vigil reviews its own PRs — tracked in project memory
- **775 tests** across 39 files (core + github packages)
- **LLM:** GPT-5.4 nano (primary) + Groq gpt-oss-120b (fallback)
- Marketplace review pending — GitHub will notify via email
- v1 modules removed: parser, classifier, executors, Chromium, BYOLLM
<!-- token test -->
