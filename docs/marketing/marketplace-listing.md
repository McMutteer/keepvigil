# GitHub Marketplace Listing — Updated Copy

> Copy this into GitHub → Settings → Developer settings → GitHub Apps → Vigil → Marketplace listing

---

## App description (short)

```
Verifies that your PR does what it says it does. 8 signals, one score — know which PRs need your eyes.
```

## App description (long)

```
Vigil reads your PR title, description, and diff, then runs 8 independent verification signals to produce a confidence score (0-100).

It catches the gap between what a PR claims and what the code actually does — undocumented changes, unverified claims, exposed credentials, and missing test coverage.

Read-only analysis. Never executes code. Never modifies your repo.

Signals:
• Claims Verifier — verifies PR claims against the actual diff
• Undocumented Changes — surfaces changes not mentioned in the PR
• Credential Scan — detects secrets and API keys in the diff
• Coverage Mapper — checks if changed files have tests
• Contract Checker — verifies API compatibility across files
• Diff Analyzer — LLM-powered diff quality analysis
• Risk Score — informational risk assessment
• Description Generator — suggests descriptions for empty PRs

Works with any language, any framework. Zero config. Install and open a PR.
```

## Free plan description

```
All 8 verification signals per PR. Unlimited repos. Zero config.

• Claims verification against the diff
• Undocumented change detection
• Credential scanning
• Coverage mapping
• Risk assessment
• Description generation for empty PRs
```

## Pro plan description ($12/dev/month)

```
Everything in Free plus:

• Contract Checker — API compatibility verification
• Diff Analyzer — LLM-powered pattern analysis
• Inline review comments on findings
• Auto-approve for high-score PRs
• Webhook notifications (Slack, Discord)
• 10 PRs/hour per developer

Upgrade at keepvigil.dev/pricing
```

## Team plan description ($24/dev/month)

```
Everything in Pro plus:

• Higher rate limits (50 PRs/hour)
• Team dashboard
• @vigil commands and repo memory
• Custom scoring rules

Upgrade at keepvigil.dev/pricing
```
