# Vigil Strategic Repositioning — Discussion Notes (2026-03-15)

> Raw notes from a brainstorming session. To be analyzed and refined later.

## The Core Insight

The original positioning — "Your test plans, actually tested" — assumes the developer writes test plans and wants someone to run them. But the reality in 2026 is different:

**AI agents (Claude Code, Cursor, etc.) are writing most PRs.** The developer isn't writing the test plan — the agent is. And the developer merges without verifying.

The gap isn't "I don't have time to test." It's "I'm not even in the loop."

## Current Problem with Shell Sandbox

Vigil's shell executor runs commands in a Docker sandbox (`node:22-alpine`), but:
- Most commands fail because the sandbox doesn't have project dependencies (pip, node_modules, etc.)
- Installing deps in the sandbox is slow and has infinite edge cases
- For commands like `pytest` or `npm test`, **CI already does this** — Vigil is redundant

## Options Analyzed

### Option 1: Install dependencies in sandbox
- Detect stack (package.json → npm ci, requirements.txt → pip install)
- Problems: slow, resource-heavy, infinite edge cases (monorepos, workspaces, .nvmrc)
- Verdict: too much friction, still unreliable

### Option 2: User provides Docker image
- Already implemented (PR #28, `shell.image` in `.vigil.yml`)
- Still doesn't solve dependency installation
- User friction: must maintain a custom image

### Option 3: Hook into existing CI
- Instead of running commands, verify that CI checks already passed
- Zero-friction, works with any stack
- Changes the model: Vigil becomes a "check verifier" not an "executor"

### Option 4: Hybrid — smart classification
- Shell commands that CI handles → verify CI results
- Visual/UI checks → execute in browser (unique value)
- API checks → call preview deployment endpoints

## The Repositioning

**Before:** "Your test plans, actually tested" — tool for lazy developers
**After:** "Trust but verify" — verification layer for AI-generated code

### Target user
Not the developer who writes code. The developer who **supervises agents that write code**.

### The flow
1. Agent (Claude Code) generates PR with test plan
2. Vigil intercepts automatically
3. Vigil verifies: opens preview, navigates flows, checks visually, calls APIs
4. Developer gets report: "of 8 promises your agent made, 6 verified, 1 failed, 1 needs human review"
5. Developer merges based on **evidence**, not blind trust

### Why this is more sellable
- Market growing exponentially (more agent-generated PRs every day)
- No one trusts agent output 100%, but everyone merges anyway
- No direct competition — CI tools verify code, not agent promises
- Real and growing pain point

### Differentiator
- Shell commands = commodity (CI does this)
- **Browser testing from natural language** = unique value
- "The login page renders correctly" → Vigil opens browser, navigates, takes screenshot
- Requires preview deployments (Vercel, Netlify, Railway) — but that's exactly the segment that uses AI agents most

## Dependencies for This Strategy
- Preview deployment detection (partially implemented)
- Robust browser executor (implemented, needs real-world testing)
- LLM-driven flow verification (implemented via Playwright generator)
- CI check verification (not implemented — new feature)

## Next Steps (when revisiting)
1. Define the new tagline and positioning
2. Analyze if browser testing is reliable enough for production use
3. Design the "CI check verifier" feature
4. Evaluate pricing model — this is a different value prop than a simple CI addon
5. Consider the landing page messaging change
