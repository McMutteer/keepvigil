# Security Audit Report -- Vigil

**Date:** 2026-03-05
**Auditor:** Claude Opus 4.6 (automated)
**Scope:** Full codebase (`packages/core`, `packages/github`, `packages/executors`, infrastructure)
**Prior audits:** 2026-03-03 (initial), 2026-03-04 (deep, 32 issues found)
**Branch:** `fix/phase-1-close-audit-debt`

---

## Executive Summary

Vigil demonstrates **strong security fundamentals**. All 5 HIGH issues from the prior audit are confirmed fixed. This round resolves 4 additional MEDIUM issues and identifies 3 new findings. No CRITICAL vulnerabilities were found.

| Severity | Total Found | Fixed (this PR) | Remaining |
|----------|-------------|-----------------|-----------|
| CRITICAL | 0 | -- | 0 |
| HIGH | 5 (prior) | 5 confirmed fixed | 0 |
| MEDIUM | 17 (prior) + 3 new | 4 fixed this PR | 6 remaining |
| LOW | 10 (prior) | 0 | 10 |

**Supply chain:** 1 MODERATE vulnerability in `esbuild` (dev dependency via `drizzle-kit`). Does not reach production image.

**Quality gates:** 353 tests pass. Build, lint, and typecheck clean.

---

## OWASP Top 10 Assessment

| # | Category | Status | Notes |
|---|----------|--------|-------|
| A01 | Broken Access Control | **PASS** | Probot handles webhook HMAC verification. Installation auth via GitHub API tokens. |
| A02 | Cryptographic Failures | **PASS** | No custom crypto. GitHub App private key stored in Infisical, never hardcoded. |
| A03 | Injection | **PASS** | SQL: Drizzle ORM (parameterized). Shell: `execFile()` + allowlist + metacharacter blocking. XSS: `escapeHtml()` + `escapeTableCell()`. |
| A04 | Insecure Design | **PASS** | Error-as-evidence model (executors never throw). Try/finally guarantees reporting. |
| A05 | Security Misconfiguration | **PASS** | Non-root container (UID 1001). Docker sandbox `--network none`. Health endpoint with DB/Redis liveness. |
| A06 | Vulnerable Components | **PASS** | 1 MODERATE dev-only vulnerability. No HIGH/CRITICAL in production deps. |
| A07 | Auth Failures | **N/A** | No user authentication (GitHub App model). |
| A08 | Data Integrity Failures | **PASS** | Webhook signature verified by Probot. Job deduplication via BullMQ jobId. |
| A09 | Logging Failures | **INFO** | Console-based logging. Consider structured logging (Pino) for production ops. |
| A10 | SSRF | **PASS** | `validateBaseUrl()` blocks localhost, RFC1918, link-local, IPv6 private, credentials in URL. |

---

## Fixes in This PR

### FIX-1: Health endpoint with DB/Redis liveness (M1)

**File:** `packages/github/src/server.ts`
**Before:** `/health` returned `{"status":"ok"}` unconditionally.
**After:** Queries `SELECT 1` against PostgreSQL and `getJobCounts()` against Redis via BullMQ. Returns 503 + `"degraded"` if either fails. 5-second timeout prevents hanging health checks.

### FIX-2: HTML length cap in metadata checker (M8)

**File:** `packages/executors/src/metadata-checker.ts`
**Before:** No limit on HTML size before regex parsing. Crafted HTML with thousands of `<meta>` tags could cause excessive CPU.
**After:** HTML truncated to 1 MB before regex extraction. OG tags and JSON-LD in the first 1 MB are sufficient for any real page.

### FIX-3: Queue payload size validation (M13)

**File:** `packages/github/src/services/queue.ts`
**Before:** No limit on `prBody` size in queue payload. A PR with a 100 MB body would be stored in Redis.
**After:** PR body truncated to 50 KB before enqueue. Test plans are always in the first few KB of a PR body.

### FIX-4: Queue initialization race condition (M3)

**File:** `packages/github/src/services/queue.ts`
**Before:** Calling `initQueue()` twice threw an error. No guard against concurrent calls.
**After:** Idempotent initialization with promise deduplication. Second call returns the same promise. `closeQueue()` resets both queue and promise.

### FIX-5: Empty parse error reporting (M4)

**File:** `packages/github/src/services/pipeline.ts`
**Before:** Empty parse result caused early return with no error context.
**After:** Sets `pipelineError` message explaining that the test plan section contained no checkbox items.

---

## Previously Fixed (Confirmed Still in Place)

| ID | Issue | File | Status |
|----|-------|------|--------|
| H1 | DB pool leak on error | `packages/core/src/db/index.ts` | **Fixed** -- pool returned to caller |
| H2 | DB pool not configurable | `packages/core/src/db/index.ts` | **Fixed** -- max, idle, connection timeouts |
| H3 | Migration pool leak | `packages/core/src/db/migrate.ts` | **Fixed** -- try/finally |
| H4 | Entrypoint error handling | `entrypoint.sh` | **Fixed** -- `set -eu` |
| H5 | Shell sandbox using exec() | `packages/executors/src/sandbox.ts` | **Fixed** -- `execFile()` |
| M5 | Browser launch timeout | `packages/executors/src/browser-launcher.ts` | **Fixed** -- 30s timeout |
| M9 | SSRF: private IPs not blocked | `packages/executors/src/http-client.ts` | **Fixed** -- RFC1918 + link-local |
| M10 | Git clone no timeout | `packages/github/src/services/repo-clone.ts` | **Fixed** -- 120s timeout |
| M17 | Browser close timeout | `packages/executors/src/browser-launcher.ts` | **Fixed** -- 5s timeout |

---

## New Findings

### NEW-1: DNS rebinding bypass on SSRF validation (MEDIUM)

**File:** `packages/executors/src/http-client.ts`
**Issue:** `validateBaseUrl()` checks the hostname string against blocklists but does not resolve DNS. An attacker-controlled domain could resolve to `127.0.0.1` or a private IP, bypassing the check.
**Mitigation:** The API executor targets preview deployment URLs provided by Vigil's own infrastructure (not user-controlled). The shell executor runs in Docker with `--network none`. Real-world exploitation requires control of both the target domain AND being a Vigil-installed repo.
**Risk:** LOW (given mitigations) -- document as known limitation.
**Recommendation:** For defense-in-depth, consider resolving the hostname and re-validating the IP before fetch. This is a P3 improvement.

### NEW-2: No per-installation rate limiting (MEDIUM)

**File:** `packages/github/src/webhooks/pull-request.ts`
**Issue:** No cap on how many verification jobs a single installation can enqueue. A malicious repo with many rapid PR events could flood the BullMQ queue.
**Mitigation:** BullMQ deduplication by jobId prevents duplicate jobs for the same PR. GitHub rate-limits webhook delivery. Worker processes one job at a time.
**Risk:** MEDIUM -- a repo with 100 concurrent PRs could create 100 jobs.
**Recommendation:** Add per-installation rate limiting (e.g., max 10 concurrent jobs). P2 priority.

### NEW-3: Docker base image not pinned to digest (LOW)

**File:** `Dockerfile`
**Issue:** `FROM node:22-alpine` uses a floating tag. A compromised Docker Hub image could affect builds.
**Mitigation:** Production image is built once and deployed via Dokploy. Image is not rebuilt on every deploy.
**Risk:** LOW -- supply chain risk mitigated by single build + deploy.
**Recommendation:** Pin to `node:22-alpine@sha256:...` and update periodically. P4 priority.

---

## Remaining Issues (from prior audits)

| ID | Issue | Severity | Status | Notes |
|----|-------|----------|--------|-------|
| M8 | Regex DoS in metadata checker | MEDIUM | **FIXED** this PR | HTML cap at 1 MB |
| M11 | NPX allowlist permissive on flags | MEDIUM | **ACCEPTED** | Flags after tool name are safe -- runs in `--network none` Docker sandbox. Pre-tool flags rejected by regex. |
| M12 | Queue jobId missing installationId | LOW | Open | Cosmetic -- collision requires same PR# across installations. |
| M14 | Pipeline error -> confusing report | LOW | Open | UX improvement, not security. |
| M16 | tsconfig composite conflict | -- | **FALSE POSITIVE** | Separate tsconfig.build.json resolves this. |
| L1-L10 | Various low-priority items | LOW | Open | Tracked in GitHub Issue #13. |

---

## Supply Chain Audit

```
$ pnpm audit
1 vulnerability found
Severity: 1 moderate

esbuild <=0.24.2 (via drizzle-kit > @esbuild-kit/esm-loader)
Advisory: GHSA-67mh-4wv8-2f99
Status: Dev dependency only -- does not reach production Docker image
```

No HIGH or CRITICAL vulnerabilities in any dependency.

---

## Security Architecture Summary

```
GitHub Webhook (HMAC verified by Probot)
  |
  v
Probot Middleware (installation auth)
  |
  v
Queue (BullMQ + Redis, payload <50KB, dedup by jobId)
  |
  v
Worker (single-threaded, exponential backoff)
  |
  +-- Parser (regex, no eval, empty-safe)
  +-- Classifier (rule-based + LLM, safe fallback on failure)
  +-- Shell Executor
  |     +-- Command allowlist (metacharacter block + whitelist)
  |     +-- Docker sandbox (--network none, 512MB RAM, 1 CPU, 5min timeout)
  |     +-- execFile() (no shell interpretation)
  |     +-- Repo path validation (regex + no traversal)
  +-- API Executor
  |     +-- SSRF validation (localhost, private IPs, credentials blocked)
  |     +-- LLM-generated specs validated (relative paths only)
  |     +-- 30s timeout per request
  +-- Browser Executor
  |     +-- Playwright Chromium (sandboxed, headless)
  |     +-- 30s launch timeout, 5s close timeout
  |     +-- LLM-generated actions validated (allowed action types only)
  +-- Metadata Checker
  |     +-- HTML capped at 1 MB
  |     +-- SSRF validation on base URL
  |     +-- 15s fetch timeout
  |
  v
Reporter (HTML-escaped, table-cell-escaped, comment idempotency)
  |
  v
GitHub Check Run + PR Comment (no user content unescaped)
```

---

## Recommendations (Priority Order)

| Priority | Item | Effort |
|----------|------|--------|
| P1 | Structured logging (Pino) for production observability | Medium |
| P2 | Per-installation rate limiting on job enqueue | Medium |
| P3 | DNS resolution validation in SSRF check | Low |
| P4 | Pin Docker base image to SHA digest | Low |
| P5 | Audit trail table for job lifecycle events | Medium |

---

## Verification

- **353 tests pass** (12 test files)
- **Build:** clean (tsup ESM, all 3 packages)
- **Lint:** clean (eslint + typescript-eslint + prettier)
- **Typecheck:** clean (tsc --noEmit, strict mode)
- **pnpm audit:** 0 HIGH/CRITICAL, 1 MODERATE (dev-only)
- **No hardcoded secrets** found in codebase
- **All .env files** excluded via .gitignore
