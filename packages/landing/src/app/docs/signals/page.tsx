import type { Metadata } from "next";
import Link from "next/link";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Signals Overview | Vigil Docs",
  description:
    "Seven independent signals combined into one confidence score for your PR.",
};

export default function SignalsPage() {
  const { prev, next } = getPrevNext("/docs/signals");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Signals
      </h1>
      <p className="text-text-secondary mb-8">
        Seven independent signals. One confidence score.
      </p>

      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil collects multiple signals about your PR. Each signal measures a
        different dimension of quality — from CI results and credential hygiene
        to test coverage and code-level assertions. Signals are combined into a
        weighted average score from 0 to 100, giving you a single number that
        represents merge confidence.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Signal Reference
      </h2>

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
                Tier
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                What it measures
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <Link href="/docs/signals/ci-bridge" className="text-accent hover:underline">
                  CI Bridge
                </Link>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">30</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Free</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Maps test plan items to GitHub Actions results
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <Link href="/docs/signals/credential-scan" className="text-accent hover:underline">
                  Credential Scan
                </Link>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">25</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Free</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Detects hardcoded secrets in the diff
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <Link href="/docs/signals/test-execution" className="text-accent hover:underline">
                  Test Execution
                </Link>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">20</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Free</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Runs test plan items in sandbox, browser, or assertion mode
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <Link href="/docs/signals/coverage-mapper" className="text-accent hover:underline">
                  Coverage Mapper
                </Link>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">10</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Free</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Checks changed files have corresponding test files
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <Link href="/docs/signals/diff-analysis" className="text-accent hover:underline">
                  Diff vs Claims
                </Link>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">10</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Pro</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                LLM compares actual changes vs test plan promises
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <Link href="/docs/signals/gap-analysis" className="text-accent hover:underline">
                  Gap Analysis
                </Link>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">5</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Pro</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                LLM identifies untested code changes
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <Link href="/docs/signals/assertion-verifier" className="text-accent hover:underline">
                  Assertion Verifier
                </Link>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">-</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Free</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Reads files and verifies claims (uses executor weight)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        How Scoring Works
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The confidence score is a weighted average of all signal scores. Each
        signal contributes proportionally to its weight:
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          score = sum(signal_score * weight) / sum(weights)
        </code>
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        The final score is clamped to the range 0-100. Signals that are skipped
        (infrastructure skip) are excluded from the calculation entirely — they
        do not count toward the denominator.
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
        has failed. LLM-based signals (Diff vs Claims, Gap Analysis) do not
        trigger the failure cap — only CI Bridge, Credential Scan, Test
        Execution, and Coverage Mapper can.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Infrastructure Skips
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Some test plan items cannot be executed due to infrastructure
        constraints — for example, browser tests without a deployment preview
        URL, or shell commands without Docker available. These items are marked
        with a &ldquo;skip&rdquo; status and do not penalize the score.
        Infrastructure skips are displayed as{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          &#x23ED;&#xFE0F;
        </code>{" "}
        in the PR comment rather than a failure icon, making it clear that the
        item was not tested due to environment limitations, not because it
        failed.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Signal Details
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Explore each signal in depth:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <Link href="/docs/signals/ci-bridge" className="text-accent hover:underline">
            CI Bridge
          </Link>{" "}
          — GitHub Actions integration
        </li>
        <li>
          <Link href="/docs/signals/credential-scan" className="text-accent hover:underline">
            Credential Scan
          </Link>{" "}
          — Secret detection in diffs
        </li>
        <li>
          <Link href="/docs/signals/test-execution" className="text-accent hover:underline">
            Test Execution
          </Link>{" "}
          — Shell, API, browser, and assertion executors
        </li>
        <li>
          <Link href="/docs/signals/coverage-mapper" className="text-accent hover:underline">
            Coverage Mapper
          </Link>{" "}
          — Test file coverage analysis
        </li>
        <li>
          <Link href="/docs/signals/assertion-verifier" className="text-accent hover:underline">
            Assertion Verifier
          </Link>{" "}
          — File-level claim verification
        </li>
        <li>
          <Link href="/docs/signals/diff-analysis" className="text-accent hover:underline">
            Diff vs Claims
          </Link>{" "}
          — LLM-powered diff analysis (Pro)
        </li>
        <li>
          <Link href="/docs/signals/gap-analysis" className="text-accent hover:underline">
            Gap Analysis
          </Link>{" "}
          — LLM-powered gap detection (Pro)
        </li>
      </ul>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
