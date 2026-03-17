import type { Metadata } from "next";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Contract Checker | Vigil Docs",
  description:
    "LLM-powered signal that verifies API/frontend type contracts match across files.",
};

export default function ContractCheckerPage() {
  const { prev, next } = getPrevNext("/docs/signals/contract-checker");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Contract Checker
      </h1>
      <p className="text-text-secondary mb-8">
        Weight: 10 | Tier: Pro | Requires LLM
      </p>

      <Callout variant="info">
        The #1 source of runtime crashes in fullstack PRs: the backend returns
        one shape, the frontend expects another.
      </Callout>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        What It Does
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        When a PR touches both backend (API routes, controllers, handlers) and
        frontend (components, pages, hooks) files, the Contract Checker reads
        the full diff and verifies that response shapes match consumer
        expectations. It catches mismatches like:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          Backend returns{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            {"{ totals: { targets: N } }"}
          </code>{" "}
          but frontend expects{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            {"{ totalTargets: N }"}
          </code>
        </li>
        <li>Backend uses snake_case, frontend expects camelCase</li>
        <li>Frontend accesses fields the backend doesn&apos;t send</li>
        <li>
          Status enum mismatches:{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            &quot;COMPLETED&quot;
          </code>{" "}
          vs{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            &quot;DONE&quot;
          </code>
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Fast Path
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The signal only runs when the PR diff contains both producer and
        consumer files. If a PR only touches backend code or only touches
        frontend code, the signal returns immediately with a pass &mdash; no
        LLM call needed.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        File classification uses path patterns:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong>Producer patterns:</strong>{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            /routes/
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            /api/
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            /controllers/
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            /handlers/
          </code>
        </li>
        <li>
          <strong>Consumer patterns:</strong>{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            /app/
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            /pages/
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            /components/
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            .tsx
          </code>
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Contract-over-Assertion Trust
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        When the Contract Checker verifies that a file pair is compatible, the
        executor adapter trusts that result. If an assertion item fails because
        it can only read one file at a time, but the Contract Checker already
        confirmed cross-file compatibility, the failure is overridden to a pass.
        This prevents false negatives from single-file limitations.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Scoring
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Score = (compatible contracts / total contracts) * 100. A score of 0
        means every detected contract has a mismatch. As an LLM-based signal,
        it does not trigger the failure cap, but incompatible contracts appear
        as action items in the PR comment.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Real-World Example
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        In a SiegeKit PR that added a reports page with a new API endpoint, the
        backend returned{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          {"{ totals: { targets: N } }"}
        </code>{" "}
        but the frontend&apos;s TypeScript interface expected{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          {"{ totalTargets: N }"}
        </code>
        . This would have caused a runtime crash with{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          undefined
        </code>{" "}
        values. The Contract Checker would have caught this mismatch
        automatically.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
