import type { Metadata } from "next";
import Link from "next/link";
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
        Every Vigil run follows the same five-step pipeline. The entire process
        typically completes in under 60 seconds.
      </p>
      <CodeBlock
        filename="pipeline"
        code={`PR opened/updated
    │
    ▼
Webhook received
    │
    ▼
Parse test plan (extract checkboxes from PR body)
    │
    ▼
Classify items (rule-based → LLM fallback)
    │
    ▼
Collect signals (8 independent checks)
    │
    ▼
Calculate confidence score (0-100 weighted average)
    │
    ▼
Post results (PR comment + GitHub Check Run)`}
      />

      {/* Step 1: Parse */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Step 1: Parse
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil scans the PR description for checkbox items. It looks for
        headings like{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          ## Test Plan
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          ## Testing
        </code>
        , or{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          ## Verification
        </code>{" "}
        followed by{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          - [ ]
        </code>{" "}
        items.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        Each checkbox becomes a test plan item with a sequential ID:{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          tp-1
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          tp-2
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          tp-3
        </code>
        , and so on. These IDs are used throughout the pipeline and in the{" "}
        <Link href="/docs/commands" className="text-accent hover:underline">
          retry command
        </Link>{" "}
        to reference specific items.
      </p>

      {/* Step 2: Classify */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Step 2: Classify
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Classification uses a two-pass system to determine what each test plan
        item is asking for:
      </p>
      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Pass 1: Rule-based matching
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        Fast pattern matching catches the most common item types. Items
        containing shell commands (
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          npm test
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          pnpm build
        </code>
        ), file paths (
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          src/auth.ts
        </code>
        ), API endpoints (
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          GET /api/users
        </code>
        ), or curl commands are classified instantly.
      </p>
      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Pass 2: LLM classifier
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        Ambiguous items that don&apos;t match any rule are sent to an LLM for
        classification. The LLM determines the category, confidence level, and
        which executor should handle the item.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        Each item receives a category (
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          build
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          api
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          assertion
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          ui-flow
        </code>
        , etc.), a confidence level (HIGH, MEDIUM, LOW), and an executor type
        that determines how it will be verified.
      </p>

      {/* Step 3: Collect Signals */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Step 3: Collect Signals
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Eight independent signals run in parallel. Each signal examines a
        different aspect of the PR and produces a score from 0 to 100, a
        pass/fail status, and detailed evidence explaining its findings.
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
                What it checks
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">CI Bridge</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">30%</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">CI pipeline status (GitHub Actions, etc.)</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Credential Scan</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">25%</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Leaked secrets, API keys, tokens in the diff</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Test Execution</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">20%</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Shell commands, API calls, browser tests</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Coverage Mapper</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">10%</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Changed files covered by test plan items</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Assertion Verifier</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">20%</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">File contents match claimed behavior</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Diff vs Claims</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">10%</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">LLM compares diff against test plan claims</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Gap Analysis</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">5%</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">LLM identifies untested changes in the diff</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-text-secondary leading-relaxed mb-4">
        See the{" "}
        <Link href="/docs/signals" className="text-accent hover:underline">
          Signals
        </Link>{" "}
        page for detailed documentation on each signal.
      </p>

      {/* Step 4: Score */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Step 4: Score
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
        A failure cap applies: if any deterministic signal (CI Bridge,
        Credential Scan, Test Execution) fails critically, the score is capped
        at 70 regardless of other results. See{" "}
        <Link href="/docs/scoring" className="text-accent hover:underline">
          Confidence Score
        </Link>{" "}
        for the full scoring methodology.
      </p>

      {/* Step 5: Report */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Step 5: Report
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil posts results in two places:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">PR comment</strong> — A
          detailed breakdown with the confidence score, signal table, test plan
          item results, and actionable recommendations. Comments are
          idempotent: Vigil updates the same comment on subsequent runs instead
          of creating duplicates.
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
        If something looks wrong, you can re-run individual items using the{" "}
        <Link href="/docs/commands" className="text-accent hover:underline">
          /vigil retry
        </Link>{" "}
        command directly in a PR comment.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
