## Summary

feat(api): add rate limiting to all public endpoints

Implements sliding window rate limiting using Redis. Each IP gets 100 requests
per minute for public endpoints, 1000 for authenticated users.

## Changes

- Added rate limiter middleware using `ioredis`
- Applied to all `/api/v1/public/*` routes
- Added `X-RateLimit-*` headers to responses
- Added rate limit exceeded error handler (429)

## Test Plan

- [ ] Run `pnpm build` to verify no compilation errors
- [ ] Run `pnpm test` to verify all existing tests pass
- [ ] Send 6 requests to `GET /api/v1/public/products` and verify the 6th returns 429
- [ ] Verify `X-RateLimit-Remaining` header decrements with each request
- [x] Authenticated requests to `POST /api/v1/orders` have a higher limit (1000/min)
- [ ] Manual: Verify rate limit resets after the window expires (wait 60s)
- [ ] Check that `GET /health` is NOT rate limited
- [ ] Run `ruff check .` to verify linting passes
- [ ] Verify error response body matches `{ "error": "Too Many Requests", "retryAfter": <seconds> }`
- [ ] Navigate to https://staging.example.com/docs and verify API docs reflect new rate limit info

## How to Verify

```bash
docker compose up -d
curl http://localhost:3000/health
for i in $(seq 1 7); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/v1/public/products; done
```
