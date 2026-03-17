import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Diff vs Claims | Vigil Docs",
  description:
    "LLM-powered signal that compares actual code changes against test plan promises.",
};

export default function DiffAnalysisPage() {
  const { prev, next } = getPrevNext("/docs/signals/diff-analysis");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Diff vs Claims
      </h1>
      <p className="text-text-secondary mb-8">
        Weight: 10 &middot; Pro tier
      </p>

      <Callout variant="pro" title="Pro signal">
        This signal requires BYOLLM configuration. See the{" "}
        <Link href="/docs/byollm" className="text-accent hover:underline">
          BYOLLM setup guide
        </Link>{" "}
        to connect your own LLM provider.
      </Callout>

      <p className="text-text-secondary leading-relaxed mb-4">
        The Diff vs Claims signal uses an LLM to read the actual PR diff and
        compare it against the test plan. It identifies changes in the code
        that the test plan does not cover — the gap between what was changed
        and what was promised to be tested.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        How It Works
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil sends the full diff and the parsed test plan to the LLM. The LLM
        analyzes each changed file, function, and code path, then identifies
        which changes are covered by at least one test plan item and which are
        not. The LLM is prompted to be generous — only changes that genuinely
        lack coverage are flagged.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Penalty System
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Each uncovered significant change incurs a 5-point penalty, up to a
        maximum of 30 points total. The score starts at 100 and decreases with
        each penalty:
      </p>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Uncovered changes
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">0</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">100</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">1</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">95</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">3</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">85</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">6+</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">70 (floor)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Prompt Injection Protection
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Since the LLM reads user-supplied content (the PR diff and test plan),
        Vigil applies prompt injection protections. Backtick characters in user
        content are escaped, and the prompt includes explicit data boundary
        instructions to prevent the LLM from treating diff content as
        instructions.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        No Failure Cap
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        As an LLM-based signal, Diff vs Claims does not trigger the failure
        cap. Even if it scores poorly, it cannot limit the total confidence
        score to 70. Only deterministic signals (CI Bridge, Credential Scan,
        Test Execution, Coverage Mapper) can trigger the cap.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
