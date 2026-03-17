import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Getting Started | Vigil Docs",
  description:
    "Install Vigil and get your first confidence score in under 2 minutes.",
};

export default function GettingStartedPage() {
  const { prev, next } = getPrevNext("/docs/getting-started");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Getting Started
      </h1>
      <p className="text-text-secondary mb-8">
        Install Vigil and get your first confidence score in under 2 minutes.
      </p>

      {/* Step 1 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        1. Install the GitHub App
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Head to the{" "}
        <a
          href="https://github.com/apps/keepvigil"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Vigil GitHub App page
        </a>{" "}
        and click <strong className="text-text-primary">Install</strong>. The
        entire process takes about 30 seconds.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        Choose which repositories Vigil should monitor. You can grant access to
        all repositories in your organization or select specific ones. Vigil
        only needs read access to pull requests and write access to checks and
        comments.
      </p>

      {/* Step 2 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        2. Create a PR with a test plan
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        If you use AI coding agents like Claude Code, Cursor, or GitHub
        Copilot, your PRs likely already include test plans. These agents
        generate checkbox lists describing what should be verified before
        merging. Vigil reads those checkboxes and turns them into real checks.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        Here is what a typical test plan looks like in your PR description:
      </p>
      <CodeBlock
        filename="PR description"
        code={`## Test Plan
- [ ] \`npm test\` passes
- [ ] \`src/auth.ts\` validates JWT tokens
- [ ] API returns 200 for valid requests
- [ ] No hardcoded credentials in diff`}
      />
      <p className="text-text-secondary leading-relaxed mb-4">
        Each checkbox becomes a test plan item. Vigil assigns each one an ID
        (like{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          tp-1
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          tp-2
        </code>
        ), classifies its type, and routes it to the appropriate executor.
      </p>

      {/* Step 3 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        3. See your confidence score
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Once the PR is opened or updated, Vigil automatically:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>Parses the test plan from the PR body</li>
        <li>Classifies each item (shell command, file assertion, API test, etc.)</li>
        <li>Collects 8 independent signals in parallel</li>
        <li>Calculates a weighted confidence score from 0 to 100</li>
        <li>Posts results as a PR comment and GitHub Check Run</li>
      </ul>
      <CodeBlock
        filename="PR comment"
        code={`🛡️ Vigil Confidence Score: 82/100 — Safe to merge

| Signal            | Score | Status |
|-------------------|-------|--------|
| CI Bridge         |   100 |   ✅   |
| Credential Scan   |   100 |   ✅   |
| Test Execution    |    75 |   ⚠️   |
| Coverage Mapper   |    60 |   ⚠️   |
| Assertion Verifier|   100 |   ✅   |
| Diff vs Claims    |    80 |   ✅   |
| Gap Analysis      |    70 |   ⚠️   |`}
      />

      {/* Step 4 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Optional: Add configuration
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil works out of the box with zero configuration. If you need to
        customize timeouts, add shell commands to the allowlist, or bring your
        own LLM, drop a{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          .vigil.yml
        </code>{" "}
        file in your repository root. See the{" "}
        <Link href="/docs/configuration" className="text-accent hover:underline">
          Configuration
        </Link>{" "}
        page for the full reference.
      </p>

      <Callout variant="info">
        Vigil works with zero configuration. The Free tier runs automatically
        on every PR — just install the GitHub App and open a pull request.
      </Callout>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
