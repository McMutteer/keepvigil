# Contributing to Vigil

Thanks for your interest in contributing to Vigil! This guide will help you get started.

## Prerequisites

- [Node.js 22](https://nodejs.org/) (see `.nvmrc`)
- [pnpm 10](https://pnpm.io/)
- [Docker](https://www.docker.com/) (for test execution sandbox)
- A GitHub account

## Setup

```bash
# Clone the repo
git clone https://github.com/McMutteer/keepvigil.git
cd keepvigil

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
# Fill in required values (see .env.example for descriptions)

# Run tests to verify setup
pnpm test
```

## Development Workflow

### Branch naming

```
feat/short-description    — new features
fix/short-description     — bug fixes
docs/short-description    — documentation only
refactor/short-description — code restructuring
```

### Commit style

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(parser): extract checkbox items from markdown
fix(credential-scan): handle base64-encoded secrets
docs(signals): add plan augmentor examples
refactor(pipeline): extract signal runner into separate module
```

### Quality gates

All of these must pass before submitting a PR:

```bash
pnpm build       # Build all packages
pnpm test        # Run test suite
pnpm lint        # ESLint
pnpm typecheck   # TypeScript type checking
```

## Monorepo Structure

```
packages/
  core/         — types, parser, classifier, score engine
  github/       — Probot app, webhooks, pipeline, signals
  executors/    — shell, API, browser, assertion execution
  landing/      — Next.js landing page (keepvigil.dev)
  dashboard/    — Vite + React dashboard SPA
```

## Pull Requests

1. Create a branch from `main`
2. Make your changes with incremental commits
3. Ensure all quality gates pass
4. Open a PR with a clear description of what and why
5. Wait for CI and code review

### PR description should include

- What the PR does and why
- How to verify the changes
- Any breaking changes or migration steps

## Reporting Bugs

Open a [GitHub issue](https://github.com/McMutteer/keepvigil/issues) with:

- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS)

For security vulnerabilities, see [SECURITY.md](SECURITY.md).

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
