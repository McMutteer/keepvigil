# Security Policy

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Please report security issues to **hello@keepvigil.dev** with the subject line "Security: [brief description]".

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

- **Acknowledge:** Within 48 hours
- **Triage:** Within 5 business days
- **Fix (critical):** Within 7 days
- **Fix (non-critical):** Within 30 days

### Scope

| In scope | Out of scope |
|----------|-------------|
| Vigil GitHub App | Your own repositories |
| keepvigil.dev | Third-party LLM providers (Groq, OpenAI) |
| The verification pipeline | GitHub platform issues |
| Authentication and billing flows | Social engineering attacks |

### Safe Harbor

We will not take legal action against researchers who:
- Act in good faith
- Do not access or modify other users' data
- Report findings responsibly
- Do not publicly disclose before a fix is available

## Security Architecture

- **Sandboxed execution:** All shell commands run in Docker containers with `--network none`
- **No data retention:** PR diffs are processed and discarded — no code is stored
- **Fork PR protection:** Configuration is read from the default branch, not from forks
- **BYOLLM:** Pro users control their own LLM API keys — Vigil never stores them

For more details, see our [security documentation](https://keepvigil.dev/docs/security).
