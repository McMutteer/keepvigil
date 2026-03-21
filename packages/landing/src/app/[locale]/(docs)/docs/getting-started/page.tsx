import type { Metadata } from "next";
import { DocsLink as Link } from "@/components/docs/docs-link";
import { CodeBlock } from "@/components/docs/code-block";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Getting Started | Vigil Docs",
  description:
    "Install Vigil and get your first verification score in under 2 minutes.",
};

export default function GettingStartedPage() {
  const { prev, next } = getPrevNext("/docs/getting-started");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Getting Started
      </h1>
      <p className="text-text-secondary mb-8">
        Install Vigil and get your first verification score in under 2 minutes.
      </p>

      <p className="text-text-secondary leading-relaxed mb-4">
        Whether your PRs are written by humans, AI coding agents like Claude
        Code, Cursor, or GitHub Copilot, or a mix of both — Vigil verifies
        that what the PR claims to do matches what the code actually does.
        Zero config, zero friction.
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
        2. Open a Pull Request
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Open any pull request. Vigil automatically analyzes the diff and PR
        description across six verification signals: claims verification,
        undocumented change detection, credential scanning, coverage mapping,
        contract checking, and diff analysis.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        No test plan is required. Vigil reads your PR title and description,
        extracts claims, and verifies them against the actual code changes.
        It also catches changes you forgot to mention.
      </p>

      {/* Step 3 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        3. See your verification score
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Once the PR is opened or updated, Vigil automatically:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>Reads the PR title and description to extract claims</li>
        <li>Analyzes the diff for undocumented changes</li>
        <li>Scans for leaked credentials</li>
        <li>Checks test coverage for changed files</li>
        <li>Calculates a weighted verification score from 0 to 100</li>
        <li>Posts results as a PR comment and GitHub Check Run</li>
      </ul>
      <CodeBlock
        filename="PR comment"
        code={`Vigil Verification Score: 85/100 — Safe to merge

| Signal              | Score | Status |
|---------------------|-------|--------|
| Claims Verifier     |    92 |   Pass |
| Undocumented Changes|    78 |   Pass |
| Credential Scan     |   100 |   Pass |
| Coverage Mapper     |    70 |   Pass |
| Contract Checker    |    85 |   Pass |
| Diff Analyzer       |    90 |   Pass |`}
      />

      {/* Step 4 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Optional: Add configuration
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil works out of the box with zero configuration. If you need to
        customize notifications, auto-approval thresholds, or coverage
        exclusions, drop a{" "}
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
