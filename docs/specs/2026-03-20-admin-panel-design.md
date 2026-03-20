# Admin Panel — admin.keepvigil.dev

## Overview

Internal operations dashboard for Vigil. Tracks LLM costs, installations, executions, errors, and subscriptions. Access restricted to 2 users (founder + COO) via GitHub OAuth whitelist.

## Users

- Sotero (founder) — GitHub user ID: 124670303
- COO — GitHub user ID: TBD (add when needed)

## Pages

### Overview (landing page)

4 metric cards:
- **LLM Spend** — today / this week / this month in USD
- **PRs Processed** — today / total all-time
- **Installations** — total active / new this week
- **Errors** — last 24h count (green if 0, red if >0)

Below cards: activity feed — last 20 PRs with repo, score, cost, timestamp.

### Costs (/costs)

- Daily spend chart (bar or line)
- Breakdown by repo (top 10)
- Breakdown by installation
- Model split: OpenAI mini vs Groq fallback
- Token totals: prompt vs completion

### Installations (/installations)

- Table: account, plan, total PRs, last PR date, install date
- Filter by plan (free/pro/team)
- Sort by activity, date, PR count

### Executions (/executions)

- Paginated feed of all PR verifications
- Columns: repo, PR#, score, recommendation, cost, duration, timestamp
- Click → detail view with full signal breakdown
- Filter by repo, score range, date

### Errors (/errors)

- Pipeline failures, LLM fallbacks, timeouts, rate limit hits
- Filterable by date range, error type
- Each entry: timestamp, repo, PR#, error message, correlation ID

### Subscriptions (/subscriptions)

- All paying users
- Columns: account, plan, status, Stripe customer ID, start date, current period end
- MRR calculation

## Technical Architecture

### New DB table: `llm_usage`

```sql
CREATE TABLE llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id TEXT NOT NULL,
  installation_id TEXT NOT NULL,
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  pull_number INTEGER NOT NULL,
  signal_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  estimated_cost_usd REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Cost estimation formula:
- GPT-5.4-mini: $0.40/1M input + $1.60/1M output (estimate)
- Groq gpt-oss-120b: $0.00 (free tier, rate-limited)

### API Endpoints

All under `/api/admin/*`, protected by admin auth middleware.

| Method | Endpoint | Returns |
|--------|----------|---------|
| GET | `/api/admin/overview` | 4 metric cards + recent 20 executions |
| GET | `/api/admin/costs?from=&to=` | Daily cost aggregation, by repo, by model |
| GET | `/api/admin/installations` | All installations with stats |
| GET | `/api/admin/executions?page=&repo=&from=&to=` | Paginated execution feed |
| GET | `/api/admin/executions/:id` | Single execution detail |
| GET | `/api/admin/errors?from=&to=&type=` | Error log |
| GET | `/api/admin/subscriptions` | All subscriptions with MRR |

### Auth

- Reuse existing GitHub OAuth flow (`/api/auth/login`)
- Admin middleware checks `session.userId` against hardcoded allowlist
- 403 for non-admins
- Allowlist: `const ADMIN_IDS = [124670303];`

### Frontend

- Vite + React 19 + React Router + Tailwind CSS 4
- Same design system as dashboard (dark theme, Geist fonts)
- Served by nginx at `/admin/` path (same pattern as `/dashboard/`)
- No SSR needed — pure SPA

### DNS & Routing

- Vercel DNS: CNAME `admin` → 161.97.97.243 (same server)
- Traefik: route `admin.keepvigil.dev` → nginx container
- nginx: `/admin/` → SPA fallback

## Implementation Order

1. DB: `llm_usage` table + migration
2. Backend: insert LLM usage in llm-client after each call
3. Backend: admin auth middleware
4. Backend: 7 admin API endpoints
5. Frontend: SPA scaffold (Vite + React + Router)
6. Frontend: overview page
7. Frontend: costs, installations, executions, errors, subscriptions pages
8. Infra: nginx config, Traefik config, Vercel DNS
9. Deploy + verify
