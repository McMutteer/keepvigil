# Showcase PRs — Vigil's Best Catches

> Analysis of 146 PRs across 8 repos. These are the moments where Vigil proved its value — catching real bugs, false claims, undocumented changes, and security issues that a human reviewer would likely miss.

---

## Tier 1 — "The PR Lied" (False Claims Caught)

### admin-miia PR #2 — Planning Doc Passed Off as Implementation
**Score: 60/100 | Claims: 0/8 verified**

The PR title said "feat: metrics & costs module with infrastructure management" and the description listed 8 features: Pulse dashboard, Businesses table, MongoDB integration, Firebase Hosting, cost tracking, deploy automation, infrastructure management, and metrics visualization.

**What Vigil found:** The diff contained only a planning document and a lockfile. Zero implementation code.

Vigil systematically dismantled every claim:
- "Add a Pulse dashboard at /metrics" → *"No dashboard/page code or API route for /metrics is present in the diff"*
- "Add a Businesses table" → *"The diff does not contain any businesses table page, route, or sorting logic"*
- "Integrate MongoDB" → *"The lockfile adds the mongodb package, but no code is added to connect to MongoDB"*

**Why it matters:** This is the purest example of Vigil's core value. A developer (or AI agent) wrote a detailed description of what they *planned* to build, then committed only the planning doc. Without Vigil, a reviewer scanning the description would assume the code was there.

**Use for:** Blog post "When PRs Lie", landing page hero example, Twitter thread opener.

---

### faro PR #10 — Deployment Config with Two False Claims
**Score: 70/100 | Claims: 2 failed | Risk: HIGH (credentials)**

The PR claimed to add health checks for all services and a backup script using `mc mirror`.

**What Vigil found:**
1. *"The app service has NO healthcheck — only db and minio do"* → The PR said "all services" but missed the most important one
2. *"Backup script actually uses `tar` instead of `mc mirror`"* → AND caught a volume name mismatch (`faro-minio-data` vs `miniodata`)
3. Flagged HIGH risk for credential patterns in docker-compose.prod.yml

**Why it matters:** Two concrete false claims in a deployment PR — the kind of PR where mistakes go directly to production. The volume name mismatch alone could cause data loss.

**Use for:** "Vigil catches what CI can't" comparison, deployment safety angle.

---

### keepvigil PR #91 — v1 Deprecation with Phantom Claims
**Score: 82/100 | Claims: 3 unverified**

Massive PR removing the entire v1 system. The description claimed to remove BYOLLM support, simplify the pipeline, and update vigil-config.ts.

**What Vigil found:** None of those three changes appeared in the diff. The PR removed Chromium, Playwright, and executors (verified) but the other claims were aspirational — the author described what they *intended* but didn't actually do in this PR.

Also caught undocumented removal of `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` environment variables, and the silent addition of `diff-position-mapper.ts` to the build.

**Why it matters:** Even experienced developers overstate what a PR does. When you're removing 67 files, it's easy to claim you also cleaned up the config — and not notice that you didn't.

**Use for:** "AI agents write ambitious descriptions" angle, dogfooding credibility.

---

## Tier 2 — "What the PR Didn't Tell You" (Undocumented Changes)

### keepvigil PR #101 — 5 Hidden Changes in Rate Limiting PR
**Score: 95/100 | Claims: 8/8 verified | Undocumented: 5**

Perfect claims verification — all 8 claims checked out. But Vigil also found 5 things the author didn't mention:

1. Token usage logging added via `createLogger` and `log.info` calls
2. `prAuthorId` field added to the job interface
3. Rate limit check now passes `prAuthorId` when present, falling back to `prAuthor`
4. **`checkRateLimit` signature changed** — accepts an optional `prAuthor` argument (API-breaking)
5. `RateConfig` interface introduced with `perDay: null` for unlimited daily limits

**Why it matters:** An API-breaking signature change buried in a rate-limiting PR. The PR description focused on the user-facing rate limits but didn't mention the internal API change. A downstream consumer calling `checkRateLimit` would break.

**Use for:** "5 things this PR forgot to mention" blog format, the undocumented-changes signal showcase.

---

### keepvigil PR #92 — Auto-Approve with Fire-and-Forget Pattern
**Score: 93/100 | Undocumented: 3**

Vigil verified all claims about auto-approve configuration. But found three undocumented behaviors:

1. `maybeAutoApprove` is called with `void` (fire-and-forget, not awaited) — means auto-approve failures are silently swallowed
2. Decimal thresholds are silently floored with `Math.floor` instead of being rejected — `threshold: 89.9` becomes `89`
3. The auto-approve review body includes detailed signal pass/fail status (not mentioned in the PR)

**Why it matters:** The fire-and-forget pattern means if auto-approve fails (e.g., GitHub API rate limit), the failure is invisible. A reviewer reading the PR description would never know about this architectural decision.

**Use for:** "Subtle behavior changes" angle, pattern detection showcase.

---

### keepvigil PR #120 — Security Hardening with Breaking Dashboard Change
**Score: 82/100 | Risk: HIGH | Undocumented: 1 breaking change**

8/8 claims verified on a 24-file security hardening PR. But Vigil caught one critical undocumented change:

> *"Dashboard execution-detail endpoint now requires an `installation_id` query parameter and returns 400 without it"*

**Why it matters:** This is a breaking API change hidden in a security PR. The dashboard frontend needed to be updated to include this parameter, but the PR description didn't mention it. Without Vigil, the dashboard would have broken after deploy.

**Use for:** "Breaking changes hiding in security PRs" angle, cross-boundary detection.

---

## Tier 3 — "Real Bugs Found" (Code Defects)

### keepvigil PR #77 — Template Literal Bug Found in Diff
**Score: 70/100 | Bug: Real code defect**

Vigil analyzed the diff and found an actual bug:

> *"Comment body string uses single quotes with template placeholders (e.g., `'${icon} **${signal.name}:** ${detail.message}'`) which will not interpolate, resulting in literal placeholder text in posted comments"*

The code used single quotes `'...'` instead of backticks `` `...` `` for template literals. This would have posted literal `${icon}` text in GitHub comments instead of the actual emoji.

**Why it matters:** This is not a "missing test" or "undocumented change" — it's a genuine code defect that Vigil found by reading the diff. CI wouldn't catch it (code compiles fine). CodeRabbit might or might not catch it. Vigil caught it because it verified the claim "post inline comments with signal details" against what the code actually does.

**Use for:** "Vigil found a bug" — the strongest possible marketing claim. Blog post lead, landing page evidence.

---

### faro PR #6 — Auth Bypass in Stripe Integration
**Score: 92/100 | Security finding: auth bypass**

8/8 claims verified for a Stripe webhook integration. But the undocumented changes section revealed a security issue:

> *"The cron endpoint only enforces the bearer-token check when CRON_SECRET is set; if the env var is missing, the route is publicly callable"*

Also caught a hard-coded Stripe API version and a hidden dependency on a specific Firestore category name.

**Why it matters:** This is a real security vulnerability — if someone deploys without setting `CRON_SECRET`, the cron endpoint is wide open. Vigil flagged it as undocumented, which is exactly what it is — the PR description said "add Stripe module with sync and webhooks" but didn't mention that the cron security depends on an env var.

**Use for:** Security angle, "Vigil catches what code review misses", auth bypass is a compelling story.

---

### siegekit PR #5 — Docker Worker Running as Root
**Score: 70/100 | Security finding**

In a deployment PR, Vigil flagged:

> *"packages/worker/Dockerfile removed non-root user setup, causing the worker to run as root"*

**Why it matters:** Running containers as root is a well-known security anti-pattern. The PR removed the non-root user setup (likely by accident during a refactor) and no one would have noticed.

**Use for:** Container security angle, DevSecOps positioning.

---

## Tier 4 — "Perfect Verification" (Vigil at Its Best)

### keepvigil PR #106 — Per-Seat Checkout (6/6 Claims, 95/100)
The PR implemented Stripe per-seat billing. Vigil verified every claim down to specific implementation details:
- Confirmed `seats` column added with `default(1)`
- Confirmed `Math.max(1, Math.min(100, ...))` clamping
- Confirmed Stripe `quantity` field in `lineItems` payload
- Confirmed webhook metadata extraction for seats

**Why it matters:** Billing code is high-stakes. Vigil verified that the checkout flow, database schema, and Stripe integration all matched what the PR claimed. This is the "sleep better at night" angle.

---

### whatsmiia PR #51 — Cross-Language Verification (Go, 98/100)
Vigil verified 5/5 claims on a Go codebase (not TypeScript). Claims included LID-to-phone resolution, interface changes, webhook payload modifications, and fallback behavior. Risk assessment correctly flagged auth-related file changes.

**Why it matters:** Vigil works across languages. This proves it's not just a TypeScript tool.

---

### keepvigil PR #121 — Test PR (8/8 Claims, 100/100)
Perfect verification of a test improvement PR. Vigil verified every claim including exact counts: "Replace 4 flaky `setTimeout(10)` waits with `vi.waitFor()`" — confirmed exactly 4 replacements. Verified Docker image SHA pinning. Verified `pnpm audit` CI step.

**Why it matters:** Shows Vigil's precision — it doesn't just check if something changed, it verifies specific quantities and implementations.

---

## Tier 5 — "Failure Modes" (Honest About Limitations)

### siegekit PR #3 — The Groq 403 Incident
All 9 LLM-dependent assertions failed with: `403 The model 'llama-3.3-70b-versatile' is blocked at the organization level.`

**Why it matters:** Shows what happens when the LLM provider goes down. Vigil's fallback and resilience story. Good for a "how we handle failures" section in docs.

---

### stripe-gateway PRs #28-29 — Lockfile-Only Diffs
Score 68/100. Claims verifier correctly identified that the diff only showed lockfile changes while the PR description promised full feature implementations. Vigil said: *"the diff only adds firebase-admin to package-lock and does not show any source changes implementing billing credit processing."*

**Why it matters:** Shows Vigil detecting when GitHub's diff API returns truncated/incomplete data. Fixed in PR #129 with truncated-diff detection.

---

### keepvigil PR #108 — The "Too Literal" Catch
Vigil marked a claim as failed: "Add a compact section at the top of **every** Vigil comment" — because the section was only added to `buildScoreCommentBody`, not all comment paths. Technically correct (there's also a v1 path), but in practice the v1 path is deprecated.

**Why it matters:** Interesting edge case for the claims verifier. Shows Vigil's thoroughness but also the "too literal" issue we addressed in PR #128. Good for a "how we improve" narrative.

---

## Marketing Content Map

| Content Piece | Best PRs to Feature | Angle |
|--------------|---------------------|-------|
| **Landing page hero** | admin-miia #2, keepvigil #77 | "The PR said X. The code did Y." |
| **Blog: "When PRs Lie"** | admin-miia #2, faro #10, keepvigil #91 | False claims caught |
| **Blog: "5 Things This PR Forgot"** | keepvigil #101, #92, #120 | Undocumented changes |
| **Blog: "Vigil Found a Bug"** | keepvigil #77, faro #6, siegekit #5 | Real defects/vulnerabilities |
| **Twitter thread** | keepvigil #77 (bug), faro #6 (auth bypass), admin-miia #2 (lies) | One WOW per tweet |
| **Comparison with CodeRabbit** | keepvigil #101, #120 | "CodeRabbit reviews quality. Vigil verifies truthfulness." |
| **Security angle** | faro #6, siegekit #5, keepvigil #120 | Auth bypass, root containers, breaking API changes |
| **AI agents angle** | admin-miia #2, keepvigil #91 | "AI agents write ambitious descriptions" |
| **Dogfooding blog** | keepvigil #77, #101, #108 | "We use Vigil on Vigil" |
| **Cross-language** | whatsmiia #51 | Go support proof |
| **Billing safety** | keepvigil #106 | "Sleep better with verified checkout code" |
| **Demo PR (PROD-004)** | Create new one based on faro #10 patterns | Intentional issues for showcase |

---

## Raw Numbers (for social proof)

- **146 PRs analyzed** across 8 repositories
- **Score range:** 54–100
- **False claims caught:** 15+ across all repos
- **Undocumented changes surfaced:** 50+ findings
- **Real bugs found:** 3 (template literal, auth bypass, root container)
- **Breaking API changes caught:** 2 (dashboard param, rate limiter signature)
- **Security issues flagged:** 4 (credentials in config, auth bypass, root container, env-dependent auth)
- **Languages verified:** TypeScript, Go
- **Average analysis time:** < 60 seconds per PR
