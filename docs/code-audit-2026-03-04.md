# Vigil Code Audit — 2026-03-04

Deep investigation of the entire codebase by 3 parallel analysis agents covering `packages/core`, `packages/github`, `packages/executors`, and root infrastructure.

## Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| HIGH | 5 | 5 | 0 |
| MEDIUM | 17 | 7 | 10 |
| LOW | 10 | 0 | 10 |

**Fixed in:** `fix/code-audit-2026-03-04` branch

---

## HIGH Issues (all fixed)

### H1+H2: Database pool resource leak + missing config
- **File:** `packages/core/src/db/index.ts`
- **Problem:** Pool created without timeout config and not exposed for cleanup. Consumers can't close connections on shutdown.
- **Fix:** `createDb()` now returns `{ db, pool }` with `max: 20`, `idleTimeoutMillis: 30_000`, `connectionTimeoutMillis: 5_000`. Server shutdown calls `pool.end()`.

### H3: Migration pool leak on failure
- **File:** `packages/core/src/db/migrate.ts`
- **Problem:** If `migrate()` throws, `pool.end()` is never called. Container hangs.
- **Fix:** Wrapped in `try/finally` to guarantee pool cleanup.

### H4: entrypoint.sh no error handling
- **File:** `entrypoint.sh`
- **Problem:** No validation of build artifacts, no informative error messages.
- **Fix:** Added `set -eu`, build artifact checks, and descriptive error messages.

### H5: Shell sandbox uses exec() instead of execFile()
- **File:** `packages/executors/src/sandbox.ts`
- **Problem:** `exec()` invokes a shell interpreter, creating injection surface.
- **Fix:** Migrated to `execFile("docker", [...args])` with explicit args array. No shell interpretation.

---

## MEDIUM Issues

### Fixed (7)

| # | Issue | File | Fix |
|---|-------|------|-----|
| M2 | Array bounds in LLM classifier | `packages/core/src/classifier/llm-classifier.ts` | Added null guard with fallback |
| M5+M17 | Browser close/launch no timeout | `packages/executors/src/browser-launcher.ts` | Added `closeBrowser()` (5s timeout) and launch timeout (30s) |
| M6+M7 | Graceful shutdown hangs | `packages/github/src/server.ts` | Added 10s timeout to `server.close()` |
| M9 | SSRF validation incomplete | `packages/executors/src/http-client.ts` | Block localhost, private IPs, IPv6 loopback, credentials in URL |
| M10 | Git clone/fetch no timeout | `packages/github/src/services/repo-clone.ts` | Added 120s timeout to all git operations |
| M15 | Docker compose no resource limits | `docker-compose.yml` | Added CPU/memory limits for all 3 services |

### Remaining (10)

| # | Issue | File | Notes |
|---|-------|------|-------|
| M1 | Health endpoint doesn't check DB/Redis | `packages/github/src/server.ts` | Requires passing pool/Redis into HTTP handler — larger refactor |
| M3 | Queue race condition on init | `packages/github/src/services/queue.ts` | Low probability, needs initialization lock |
| M4 | Empty parse -> check run stuck pending | `packages/github/src/services/pipeline.ts` | Partially mitigated by reporter always running in finally block |
| M8 | Regex DoS in metadata checker | `packages/executors/src/metadata-checker.ts` | Needs HTML length limit or proper parser |
| M11 | NPX allowlist too permissive on flags | `packages/executors/src/allowlist.ts` | Needs flag validation in regex |
| M12 | Queue jobId missing installationId | `packages/github/src/services/queue.ts` | Low risk, needs schema consideration |
| M13 | Queue no payload size validation | `packages/github/src/services/queue.ts` | Needs PR body size limit |
| M14 | Pipeline parsing error -> confusing report | `packages/github/src/services/pipeline.ts` | Needs state tracking for partial failures |
| M16 | tsconfig.build.json inconsistency | N/A | **False positive** — no `composite` found |
| M17 | Browser launch no timeout | N/A | **Fixed** (grouped with M5) |

### LOW Issues (all remaining)

| # | Issue | File |
|---|-------|------|
| L1 | Bold heading regex overly broad | `packages/core/src/parser/section-detector.ts:66` |
| L2 | Hints codeBlocks overwritten on continuation | `packages/core/src/parser/checkbox-parser.ts:53-57` |
| L3 | Status code rule too broad for API classification | `packages/core/src/classifier/rules.ts:112` |
| L4 | assertText passes on empty string | `packages/executors/src/browser.ts:124` |
| L5 | http-client binary response corrupted | `packages/executors/src/http-client.ts:78-91` |
| L6 | Shell metacharacters regex incomplete | `packages/executors/src/allowlist.ts:15` |
| L7 | Console error collection unbounded | `packages/executors/src/viewport.ts` |
| L8 | Truncation suffix can exceed limit | `packages/github/src/services/check-run-updater.ts:31-32` |
| L9 | comment-builder uses `as` type assertions | `packages/github/src/services/comment-builder.ts:108-130` |
| L10 | Dockerfile Alpine no SHA pin | `Dockerfile:1` |

---

## Non-Issues (verified OK)

- No `as any` casts — all type assertions use safe patterns with validation sets
- `strict: true` enabled in tsconfig.base.json
- Parser handles null input; LLM classifier returns fallback on missing content
- No unused imports or unreachable statements
- Shell sandbox has strong input validation (image name, repo path, allowlisted commands)
- Security: allowlist for shell commands, path validation for API specs, Docker `--network none`

## Quality Gates (post-fix)

```
pnpm build    -> OK
pnpm test     -> 352 tests passing (was 349 pre-audit + 3 new SSRF tests)
pnpm lint     -> OK
pnpm typecheck -> OK
```
