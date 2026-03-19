import type { Metadata } from "next";
import { DocsLink as Link } from "@/components/docs/docs-link";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Signals Overview | Vigil Docs",
  description:
    "Six verification signals in two layers — Trust Verification (Free) and Deep Analysis (Pro) — combined into one confidence score.",
};

export default function SignalsPage() {
  const { prev, next } = getPrevNext("/docs/signals");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Signals
      </h1>
      <p className="text-text-secondary mb-8">
        Two layers. Six signals. Full verification.
      </p>

      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil verifies your PR through two layers. The Trust Verification layer
        checks claims, detects undocumented changes, scans for credentials, and
        maps test coverage. The Deep Analysis layer runs contract checking and
        diff analysis for deeper insight. All six signals are combined into a
        weighted average score from 0 to 100, giving you a single number that
        represents merge confidence.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Trust Verification
        <span className="text-sm font-normal text-text-muted ml-2">(Free)</span>
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Core verification signals that run on every PR, included in the Free
        tier. These cover the essentials: verifying claims, catching
        undocumented changes, scanning for leaked credentials, and checking
        test coverage.
      </p>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Signal
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Weight
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                What it measures
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Claims Verifier
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">30</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                LLM verifies each claim in the PR body against the actual diff
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Undocumented Changes
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">25</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                LLM scans the diff for changes not mentioned in the PR body
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <Link href="/docs/signals/credential-scan" className="text-accent hover:underline">
                  Credential Scan
                </Link>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">20</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Detects hardcoded secrets, API keys, and tokens in the diff
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <Link href="/docs/signals/coverage-mapper" className="text-accent hover:underline">
                  Coverage Mapper
                </Link>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">10</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Checks that changed files have corresponding test files
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Deep Analysis
        <span className="text-sm font-normal text-text-muted ml-2">(Pro)</span>
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Advanced signals available on Pro and Team plans. These provide deeper
        structural analysis of your code changes.
      </p>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Signal
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Weight
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                What it measures
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <Link href="/docs/signals/contract-checker" className="text-accent hover:underline">
                  Contract Checker
                </Link>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">10</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Verifies API/frontend type contracts match across files
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <Link href="/docs/signals/diff-analysis" className="text-accent hover:underline">
                  Diff Analyzer
                </Link>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">5</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                LLM analyzes diff for structural and semantic issues
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        How Scoring Works
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The confidence score is a weighted average of all active signal scores.
        Each signal contributes proportionally to its weight:
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          score = sum(signal_score * weight) / sum(weights)
        </code>
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        The total weight across all 6 signals is 100. On the Free tier, only
        the 4 Trust Verification signals run, and their weights are
        renormalized. Signals that are skipped (e.g., Pro signals on a Free
        plan) are excluded from the calculation entirely.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Failure Cap
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        If any deterministic (non-LLM) signal has{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          passed: false
        </code>
        , the final score is capped at 70. This means a PR can never reach
        &ldquo;Safe to merge&rdquo; status if a critical, deterministic check
        has failed. Only Credential Scan and Coverage Mapper can trigger the
        failure cap. LLM-based signals (Claims Verifier, Undocumented Changes,
        Contract Checker, Diff Analyzer) do not trigger it.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Signal Details
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Explore individual signals in depth:
      </p>

      <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
        Trust Verification (Free)
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          Claims Verifier — Validates PR claims against the diff
        </li>
        <li>
          Undocumented Changes — Detects unreported diff changes
        </li>
        <li>
          <Link href="/docs/signals/credential-scan" className="text-accent hover:underline">
            Credential Scan
          </Link>{" "}
          — Secret detection in diffs
        </li>
        <li>
          <Link href="/docs/signals/coverage-mapper" className="text-accent hover:underline">
            Coverage Mapper
          </Link>{" "}
          — Test file coverage analysis
        </li>
      </ul>

      <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
        Deep Analysis (Pro)
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <Link href="/docs/signals/contract-checker" className="text-accent hover:underline">
            Contract Checker
          </Link>{" "}
          — API/frontend compatibility verification
        </li>
        <li>
          <Link href="/docs/signals/diff-analysis" className="text-accent hover:underline">
            Diff Analyzer
          </Link>{" "}
          — LLM-powered structural diff analysis
        </li>
      </ul>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
