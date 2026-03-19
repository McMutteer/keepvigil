import type { Metadata } from "next";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Changelog | Vigil Docs",
  description: "Release history and notable changes to Vigil.",
};

export default function ChangelogPage() {
  const { prev, next } = getPrevNext("/docs/changelog");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Changelog
      </h1>
      <p className="text-text-secondary mb-8">
        Release history and notable changes
      </p>

      {/* v4.3 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        v4.3 &mdash; Signal Quality
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">March 2026</p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          Fixed template literal confusion in diffs &mdash; backticks in
          JSX/TSX code are no longer misread as single quotes
        </li>
        <li>
          Credential scan now reduces severity for test files instead of
          failing the entire signal
        </li>
        <li>
          Coverage mapper walks up parent directories to find{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            __tests__/
          </code>{" "}
          test files
        </li>
        <li>
          Config files (
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            *.config.*
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            nginx.conf
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            Dockerfile
          </code>
          ) excluded from coverage analysis
        </li>
      </ul>

      {/* v4.2 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        v4.2 &mdash; Dashboard
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">March 2026</p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          New:{" "}
          <strong className="text-text-primary">Dashboard</strong> at{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            /dashboard
          </code>{" "}
          &mdash; view PR verification history, scores, and repo metrics
        </li>
        <li>
          GitHub OAuth login with JWT sessions
        </li>
        <li>
          Execution persistence &mdash; pipeline results now stored in
          database with score, signals, and pipeline mode
        </li>
        <li>
          Dashboard API: paginated executions, stats, repos, and execution
          detail endpoints
        </li>
        <li>
          Dashboard link added to landing navbar and pricing page
        </li>
      </ul>

      {/* v4.1 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        v4.1 &mdash; Inline Comments &amp; Conversational
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">March 2026</p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">Inline review comments</strong>{" "}
          &mdash; findings posted directly on diff lines via GitHub Reviews API
          (Pro only)
        </li>
        <li>
          New commands:{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            @vigil explain
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            @vigil verify
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            @vigil recheck
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            @vigil ignore
          </code>
        </li>
        <li>
          Repo memory &mdash; persistent ignore rules per repository via{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            @vigil ignore
          </code>
        </li>
      </ul>

      {/* v4.0 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        v4.0 &mdash; PR Verification
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">March 2026</p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          Vigil now verifies{" "}
          <strong className="text-text-primary">any PR</strong> &mdash; no test
          plan required
        </li>
        <li>
          New:{" "}
          <strong className="text-text-primary">Claims Verification</strong>{" "}
          &mdash; extracts claims from PR title/body, verifies against diff
        </li>
        <li>
          New:{" "}
          <strong className="text-text-primary">
            Undocumented Change Detection
          </strong>{" "}
          &mdash; surfaces changes not mentioned in the PR
        </li>
        <li>
          New:{" "}
          <strong className="text-text-primary">Dual-mode pipeline</strong>{" "}
          &mdash; v1+v2 with test plan, v2-only without
        </li>
        <li>
          New: v2-specific onboarding tips for repos without test plans
        </li>
        <li>Rebalanced signal weights for 10-signal architecture</li>
      </ul>

      {/* v3.1 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        v3.1 &mdash; Commercial Launch
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">March 2026</p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          Dedicated{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            /pricing
          </code>{" "}
          page with monthly/annual toggle and feature comparison
        </li>
        <li>
          Checkout success page (
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            /checkout/success
          </code>
          )
        </li>
        <li>
          Billing endpoints:{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            /api/billing-portal
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            /api/account
          </code>
        </li>
        <li>Billing documentation page</li>
        <li>MIT LICENSE added</li>
        <li>Repo made public</li>
        <li>GitHub Marketplace listing submitted</li>
      </ul>

      {/* v3.0 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        v3.0 &mdash; Signal Improvements
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">March 2026</p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          New signal:{" "}
          <strong className="text-text-primary">Plan Augmentor</strong> &mdash;
          auto-generates verification items the test plan missed
        </li>
        <li>
          New signal:{" "}
          <strong className="text-text-primary">Contract Checker</strong>{" "}
          &mdash; verifies API/frontend type compatibility
        </li>
        <li>
          Coverage Mapper reform &mdash; plan-covered files count as tested
        </li>
        <li>
          Signal coordination: contract-over-assertion trust, pipeline reorder
        </li>
        <li>
          Augmentor reads{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            CLAUDE.md
          </code>{" "}
          for project context
        </li>
        <li>Smart file reader &mdash; keyword-directed context extraction</li>
        <li>Onboarding tips on first Vigil comment per PR</li>
      </ul>

      {/* v2.0 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        v2.0 &mdash; Confidence Score
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">March 2026</p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>Score engine: weighted 0&ndash;100 confidence score</li>
        <li>
          BYOLLM support: bring your own OpenAI, Groq, or Ollama key
        </li>
        <li>
          6 new signals: CI Bridge, Credential Scan, Coverage Mapper, Diff
          Analyzer, Gap Analyzer, Executor Adapter
        </li>
        <li>Free/Pro tier gating</li>
        <li>
          Failure cap: deterministic signal failures cap score at 70
        </li>
      </ul>

      {/* v1.0 */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        v1.0 &mdash; Core
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">March 2026</p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>GitHub App with webhook integration</li>
        <li>Test plan parser (markdown checkbox extraction)</li>
        <li>Item classifier (rule-based + LLM two-pass)</li>
        <li>
          Shell executor (Docker sandbox,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            --network none
          </code>
          )
        </li>
        <li>API test executor</li>
        <li>Browser test executor (Playwright)</li>
        <li>Result reporter (PR comment + Check Run)</li>
      </ul>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
