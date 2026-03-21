# Hacker News — Show HN Post

> STATUS: DRAFT — Do not publish yet. Review and adapt before posting.

---

## Title (max 80 chars)

```
Show HN: Vigil – Verifies AI-generated PRs actually do what they claim (open source)
```

## URL

```
https://keepvigil.dev/blog/dogfooding
```

## First comment (post immediately after submission)

We built Vigil because we use AI agents (Claude Code) for all our PRs and couldn't keep up with reviewing them.

The core problem: AI-generated code compiles and passes tests, but the PR description often doesn't tell the full story. "Adds auth" might also hardcode a production URL. "No breaking changes" might quietly add a required field.

Vigil reads the PR title, body, and diff, then runs 8 independent signals:
- Claims Verifier — does the PR do what it says?
- Undocumented Changes — what did it change that it didn't mention?
- Credential Scan — any secrets in the diff?
- Coverage Mapper — do changed files have tests?
- Contract Checker — any breaking API changes?
- Diff Analyzer — LLM-powered pattern analysis

It's read-only — never executes code, never modifies your repo.

We dogfooded it on our own codebase (every PR is AI-generated). Found real issues: hardcoded URIs, undocumented side effects, silent redirects. Scores went from 59 to 93 as we fixed false positives.

Stack: Node.js, TypeScript, Probot, PostgreSQL, OpenAI GPT-5.4-mini. Open source (MIT).

Happy to answer questions about building verification tooling for AI-generated code.

---

## Posting notes

- **Best time:** Tuesday or Wednesday, 8–10 AM EST
- **Do NOT ask for upvotes** — HN penalizes this
- **Respond to every comment** within 2 hours
- **Expected questions:** "How is this different from CodeRabbit?" → Vigil verifies claims (truthfulness), CodeRabbit reviews quality (complementary). "Why not just use CI?" → CI tests if code works, Vigil tests if the PR description matches reality.
