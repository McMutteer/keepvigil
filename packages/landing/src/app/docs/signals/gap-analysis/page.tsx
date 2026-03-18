import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Gap Analysis | Vigil Docs",
  description:
    "LLM-powered signal that identifies untested areas in your changed code.",
};

export default function GapAnalysisPage() {
  const { prev, next } = getPrevNext("/docs/signals/gap-analysis");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Gap Analysis
      </h1>
      <p className="text-text-secondary mb-8">
        Weight: 5 &middot; Pro tier
      </p>

      <Callout variant="pro" title="Pro signal">
        This signal requires BYOLLM configuration. See the{" "}
        <Link href="/docs/byollm" className="text-accent hover:underline">
          BYOLLM setup guide
        </Link>{" "}
        to connect your own LLM provider.
      </Callout>

      <Callout variant="info" title="Requires test plan">
        This signal runs when the PR includes a test plan with checkbox items.
        For PRs without test plans, Vigil uses Claims Verification instead.
      </Callout>

      <p className="text-text-secondary leading-relaxed mb-4">
        The Gap Analysis signal identifies areas of the changed code that are
        not covered by <em>any</em> test plan item — the &ldquo;unknown
        unknowns.&rdquo; While Diff vs Claims checks whether specific changes
        match specific test plan items, Gap Analysis looks for entire code
        areas that the test plan does not address at all.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        How It Works
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil sends the changed code and the full test plan to the LLM. The
        LLM identifies gaps — code areas that lack any form of test coverage
        — and assigns each gap a severity level. The LLM is prompted to be
        conservative with critical severity, reserving it for genuinely
        dangerous gaps like authentication bypasses or data loss scenarios.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Severity Levels
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Each identified gap carries a severity that determines its penalty
        weight:
      </p>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Severity
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Penalty
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Example
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Critical
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                15 points
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Authentication bypass, data loss risk
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                High
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                10 points
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Error handling missing, race condition
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Medium
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                3 points
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Edge case not covered, validation gap
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Low
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                1 point
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Logging, cosmetic change, documentation
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Scoring
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The score starts at 100 and decreases by the severity-weighted penalty
        for each identified gap. For example, one critical gap and two medium
        gaps would result in a score of 100 - 15 - 3 - 3 = 79.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Error Handling
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Malformed gap entries from the LLM are silently dropped — the parser
        returns{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          null
        </code>{" "}
        for invalid entries rather than an empty array, ensuring that
        partially valid responses still contribute useful results. As an
        LLM-based signal, Gap Analysis does not trigger the failure cap.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
