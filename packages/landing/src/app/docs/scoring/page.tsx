import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Confidence Score | Vigil Docs",
  description:
    "How Vigil calculates the 0-100 confidence score and what it means for your PR.",
};

export default function ScoringPage() {
  const { prev, next } = getPrevNext("/docs/scoring");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Confidence Score
      </h1>
      <p className="text-text-secondary mb-8">
        How Vigil calculates the 0-100 score and what it means.
      </p>

      {/* Formula */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Formula
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The confidence score is a weighted average of all active signals:
      </p>
      <CodeBlock
        filename="formula"
        code={`Score = Sum(signal_score x weight) / Sum(weight)`}
      />
      <p className="text-text-secondary leading-relaxed mb-4">
        Each signal produces a score from 0 to 100. The final score is the sum
        of each signal&apos;s score multiplied by its weight, divided by the total
        weight of all active signals. The result is rounded to the nearest
        integer.
      </p>

      {/* Worked Example */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Worked Example
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Consider a PR where all seven signals are active. Here is how the final
        score is calculated:
      </p>
      <CodeBlock
        filename="example calculation"
        code={`Signal              Score   Weight   Contribution
─────────────────   ─────   ──────   ────────────
CI Bridge             100   x  30   =       3000
Credential Scan       100   x  25   =       2500
Test Execution         67   x  20   =       1340
Coverage Mapper        75   x  10   =        750
Diff vs Claims         85   x  10   =        850
Gap Analysis           90   x   5   =        450
                                    ────────────
Total                          100         8890

Score = 8890 / 100 = 88.9 → 89`}
      />
      <p className="text-text-secondary leading-relaxed mb-4">
        The Assertion Verifier shares weight with Test Execution. When both
        produce results, the executor signal reflects the combined outcome of
        shell commands and file assertions.
      </p>

      {/* Recommendation Tiers */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Recommendation Tiers
      </h2>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Score Range
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Recommendation
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                GitHub Check
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">80 - 100</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Safe to merge</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">success</code>
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">50 - 79</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Review needed</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">neutral</code>
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">0 - 49</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Caution</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">failure</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-text-secondary leading-relaxed mb-4">
        You can use the GitHub Check conclusion with branch protection rules to
        gate merges. For example, require the Vigil check to pass (
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">success</code>
        ) before allowing a merge.
      </p>

      {/* Failure Cap */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Failure Cap
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        If any <strong className="text-text-primary">deterministic</strong> (non-LLM)
        signal has{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">passed: false</code>,
        the final score is capped at 70. This ensures the PR never reaches
        &quot;Safe to merge&quot; territory when a hard check has failed.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        Deterministic signals that can trigger the cap:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">CI Bridge</strong> — CI pipeline failed
        </li>
        <li>
          <strong className="text-text-primary">Credential Scan</strong> — secrets detected in the diff
        </li>
        <li>
          <strong className="text-text-primary">Test Execution</strong> — shell commands or assertions failed
        </li>
        <li>
          <strong className="text-text-primary">Coverage Mapper</strong> — changed files have no test coverage
        </li>
      </ul>
      <p className="text-text-secondary leading-relaxed mb-4">
        LLM-based signals (Diff vs Claims and Gap Analysis) do{" "}
        <strong className="text-text-primary">not</strong> trigger the failure cap.
        They are advisory: they can lower the score, but they cannot block a PR
        from being &quot;Safe to merge&quot; on their own. This reflects the inherent
        uncertainty of LLM analysis.
      </p>

      {/* Infrastructure Skips */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Infrastructure Skips
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Some test plan items cannot execute due to missing infrastructure. For
        example, a browser test that requires a preview URL, or a shell command
        that needs Docker. These items are not failures — they are
        infrastructure limitations.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        Skipped items are excluded from scoring entirely. They do not penalize
        the score, but they also do not contribute positively. In the PR
        comment, they appear with a skip icon and a brief explanation of why
        they could not run.
      </p>

      {/* Action Items */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Action Items
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The PR comment includes up to 5 actionable items at the top, sorted by
        severity:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">Must Fix</strong> — items that
          directly failed a deterministic check. These are blocking issues like
          leaked credentials, failing tests, or broken builds.
        </li>
        <li>
          <strong className="text-text-primary">Consider</strong> — items flagged
          by advisory signals like gap analysis or coverage mapper. These
          deserve a look but may be intentional.
        </li>
      </ul>
      <p className="text-text-secondary leading-relaxed mb-4">
        A maximum of 5 action items are shown to keep the comment focused. If
        more issues exist, they are still visible in the detailed signal
        breakdown below the summary.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
