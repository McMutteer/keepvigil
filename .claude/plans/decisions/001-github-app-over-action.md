# ADR 001: GitHub App over GitHub Action

**Status:** Accepted
**Date:** 2026-03-01

**Context:** Vigil needs to integrate with GitHub to receive PR events, parse test plans, execute tests, and report results. The two main options are building a GitHub Action (runs in the user's CI pipeline) or a GitHub App (runs on our infrastructure, receives webhooks).

**Decision:** Build a GitHub App using the Probot framework.

**Alternatives considered:**
- **GitHub Action** — rejected because: Actions run in the user's CI environment with limited resources and time constraints (6-hour max). Browser automation (Playwright) requires significant compute. Actions can't persist state between runs. Billing/metering is harder. Also, Actions are triggered by workflow files the user must configure — Vigil should work with zero config.
- **GitHub Action + External Service** — rejected because: Adds complexity of two systems. The Action would just be a thin webhook forwarder, making it pointless.

**Consequences:**
- (+) Full control over execution environment (container with Playwright, Redis, etc.)
- (+) Zero config for users — install the App, done
- (+) Can manage billing, usage limits, and execution queues
- (+) Persistent state for historical tracking
- (-) Must host and maintain infrastructure
- (-) Must handle GitHub App authentication (JWT + installation tokens)
- (-) Higher upfront complexity than a simple Action
