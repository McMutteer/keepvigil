import type { Metadata } from "next";
import { DocsLink as Link } from "@/components/docs/docs-link";
import { CodeBlock } from "@/components/docs/code-block";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "How It Works | Vigil Docs",
  description:
    "Understand Vigil's pipeline — from PR webhook to confidence score.",
};

export default function HowItWorksPage() {
  const { prev, next } = getPrevNext("/docs/how-it-works");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        How It Works
      </h1>
      <p className="text-text-secondary mb-8">
        From PR webhook to confidence score — what happens when you open a
        pull request.
      </p>

      {/* The Pipeline */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        The Pipeline
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil runs on <strong className="text-text-primary">every pull request</strong> — no
        configuration or test plan required. The entire process typically
        completes in under 60 seconds.
      </p>
      <CodeBlock
        filename="pipeline"
        code={`PR opened/updated
    │
    ▼
Webhook received
    │
    ▼
Fetch diff from GitHub API
    │
    ▼
Run 6 verification signals in parallel
    │
    ▼
Calculate confidence score (0-100 weighted average)
    │
    ▼
Post results (PR comment + GitHub Check Run)
    │
    ▼
Send inline review comments (Pro only)`}
      />

      {/* Step 1: Receive */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Step 1: Receive
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        When a PR is opened, updated, or reopened, GitHub sends a webhook to
        Vigil. Vigil reads the PR title, description, and diff via the GitHub
        API. No code is cloned or executed — all analysis is performed against
        the diff data.
      </p>

      {/* Step 2: Analyze */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Step 2: Analyze
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Six independent verification signals run in parallel. Each signal
        examines a different aspect of the PR and produces a score from 0 to
        100, a pass/fail status, and detailed evidence explaining its findings.
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
                Tier
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                What it checks
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Claims Verifier</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">30</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Free</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">LLM verifies PR description claims against the actual diff</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Undocumented Changes</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">25</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Free</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Detects meaningful changes not mentioned in the PR description</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Credential Scan</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">20</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Free</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Detects leaked secrets, API keys, and tokens in the diff</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Coverage Mapper</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">10</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Free</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Checks that changed files have corresponding test files</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Contract Checker</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">10</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Pro</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">LLM compares API response shapes vs frontend interfaces</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Diff Analyzer</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">5</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Pro</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">LLM analyzes diff for structural and semantic issues</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-text-secondary leading-relaxed mb-4">
        On the Free tier, only the four Trust Verification signals run. Pro
        users get all six signals for deeper analysis. See the{" "}
        <Link href="/docs/signals" className="text-accent hover:underline">
          Signals
        </Link>{" "}
        page for detailed documentation on each signal.
      </p>

      {/* Step 3: Score */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Step 3: Score
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The confidence score is a weighted average of all signal scores. Each
        signal contributes proportionally to its weight. The final score falls
        into one of three tiers:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">80-100 — Safe to merge.</strong>{" "}
          All critical checks pass, high confidence.
        </li>
        <li>
          <strong className="text-text-primary">50-79 — Review recommended.</strong>{" "}
          Some signals flagged issues worth investigating.
        </li>
        <li>
          <strong className="text-text-primary">0-49 — Caution.</strong>{" "}
          Significant issues detected, manual review strongly advised.
        </li>
      </ul>
      <p className="text-text-secondary leading-relaxed mb-4">
        A failure cap applies: if any deterministic signal (Credential Scan,
        Coverage Mapper) fails critically, the score is capped at 70 regardless
        of other results. See{" "}
        <Link href="/docs/scoring" className="text-accent hover:underline">
          Confidence Score
        </Link>{" "}
        for the full scoring methodology.
      </p>

      {/* Step 4: Report */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Step 4: Report
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil posts results in two places:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">PR comment</strong> — A
          detailed breakdown with the confidence score, signal table, and
          actionable recommendations. Comments are idempotent: Vigil updates
          the same comment on subsequent runs instead of creating duplicates.
        </li>
        <li>
          <strong className="text-text-primary">GitHub Check Run</strong> — A
          check with a conclusion of{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            success
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            neutral
          </code>
          , or{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            failure
          </code>
          . Use this with branch protection rules to gate merges on the
          confidence score.
        </li>
      </ul>
      <p className="text-text-secondary leading-relaxed mb-4">
        Pro users also receive inline review comments posted directly on
        relevant diff lines, making findings easy to act on without scrolling
        through the full report.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        If something looks wrong, you can re-run Vigil using the{" "}
        <Link href="/docs/commands" className="text-accent hover:underline">
          @vigil recheck
        </Link>{" "}
        command directly in a PR comment.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
