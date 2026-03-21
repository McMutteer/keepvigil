# Twitter/X Thread — "The gotcha moment"

> STATUS: DRAFT — Do not publish yet. Review and adapt before posting.

---

## Thread (7 tweets)

### 1/7
We built a tool that verifies AI-generated PRs.

Then we pointed it at itself.

Here's what it found 🧵

### 2/7
The problem: AI agents (Claude Code, Cursor, Devin) write great code. It compiles. Tests pass.

But the PR description doesn't tell the full story.

"Adds auth middleware" — did it? Or did it also hardcode a callback URL that'll break staging?

### 3/7
Real finding #1: PR adds GitHub OAuth. Description says "adds auth flow."

What it didn't mention: callback URL hardcoded to production. No env var. No config.

Vigil caught it. A human reviewer might not have — it was buried 200 lines deep in the diff.

### 4/7
Real finding #2: PR implements auto-approve for high-score PRs.

Description: "adds auto-approve when score > threshold"

What it didn't say: it creates a GitHub APPROVE review — silently changing the PR's merge status.

The claim was true. The full picture wasn't.

### 5/7
Our scores went from 59 → 93 over 13 PRs.

Not because the code got better. Because we fixed false positives:
- Template literals breaking JSX diffs
- Credential scanner flagging test files
- Coverage mapper complaining about Dockerfiles

The tool got sharper by eating its own dogfood.

### 6/7
Key insight: AI code is syntactically correct but narratively incomplete.

Code review asks "is this code good?"
Verification asks "does this PR do what it claims?"

They're complementary. Use both.

### 7/7
Vigil is open source (MIT) and free for unlimited repos.

8 signals. One score. Know which PRs need your eyes.

Install in 30 seconds: github.com/marketplace/keepvigil

Full blog post: keepvigil.dev/blog/dogfooding

---

## Posting notes

- **Best time:** Tuesday–Wednesday, 9–11 AM EST
- **Post as thread, not single tweet**
- **Add screenshot** of a real Vigil PR comment to tweet 3 or 4
- **Pin thread** after posting
- **Reply to own thread** with: "Ask me anything about building verification for AI-generated code"
