# Reddit Posts

> STATUS: DRAFT — Do not publish yet. Review and adapt before posting.

---

## r/programming

### Title
```
We pointed our PR verification tool at its own AI-generated PRs — here's what it found
```

### Body
```
We built Vigil, an open-source GitHub App that verifies pull requests. Every PR in our codebase is written by AI agents (Claude Code), so we needed a way to verify that what the PR *says* matches what the code *does*.

We dogfooded it on our own PRs and found:

1. **Hardcoded production URL** — PR added OAuth, description said "adds auth flow." Didn't mention the callback URL was hardcoded to production. No env var.

2. **Undocumented side effect** — PR implemented auto-approve. Description said "adds auto-approve." Didn't mention it creates a GitHub APPROVE review, silently changing merge status.

3. **Silent redirect** — PR added i18n. Buried in the diff: a redirect page not mentioned anywhere.

Our scores went from 59 to 93 over 13 PRs, mostly by fixing false positives.

Key takeaway: AI-generated code is syntactically correct but narratively incomplete. The code compiles, tests pass, but the PR description doesn't tell the full story.

Vigil is MIT licensed, free for unlimited repos: https://keepvigil.dev/blog/dogfooding

Happy to answer questions.
```

---

## r/devtools

### Title
```
Open source tool that verifies AI-generated PRs do what they claim — we ran it on itself
```

### Body
```
We use AI agents for all our PRs. The code quality is fine — it compiles, tests pass. But we kept finding that PR descriptions didn't match reality.

So we built Vigil: a GitHub App that reads the PR title/body, compares against the diff, and surfaces gaps. 8 signals, one score.

What it caught in our own PRs:
- Hardcoded URI not mentioned in description
- Auto-approve creating undocumented GitHub reviews
- Silent redirect pages buried in diffs

Read-only analysis — never executes code. Free, open source (MIT).

Blog post with full data: https://keepvigil.dev/blog/dogfooding
GitHub: https://github.com/McMutteer/keepvigil
```

---

## Posting notes

- **r/programming:** Post on weekday mornings EST. Flair as [Open Source] if available
- **r/devtools:** Smaller sub, less competitive — can post anytime
- **Do NOT cross-post simultaneously** — space 1-2 days apart
- **Respond to every comment** — Reddit rewards engagement
- **Don't be salesy** — lead with the story, link at the end
