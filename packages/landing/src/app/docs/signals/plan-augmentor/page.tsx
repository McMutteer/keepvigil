import type { Metadata } from "next";
import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Plan Augmentor | Vigil Docs",
  description:
    "LLM-powered signal that auto-generates and verifies test items your plan missed.",
};

export default function PlanAugmentorPage() {
  const { prev, next } = getPrevNext("/docs/signals/plan-augmentor");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Plan Augmentor
      </h1>
      <p className="text-text-secondary mb-8">
        Weight: 15 | Tier: Pro | Requires LLM
      </p>

      <Callout type="info">
        The Plan Augmentor goes beyond verifying what you wrote &mdash; it finds
        what you forgot to write.
      </Callout>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        What It Does
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        AI-written test plans are typically 90% existence checks: &ldquo;does
        function X exist in file Y?&rdquo; The Plan Augmentor reads your diff
        and your existing test plan, then generates 3-5 additional verification
        items covering what the original plan missed:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong>Logic correctness</strong> &mdash; default values, fallback
          behavior, conditional branches
        </li>
        <li>
          <strong>Edge cases</strong> &mdash; double submission guards, cleanup
          on unmount, error handling
        </li>
        <li>
          <strong>Security</strong> &mdash; input validation, authorization
          scoped to correct user/tenant
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Two-Phase Process
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        <strong>Phase 1 &mdash; Generate:</strong> The LLM reads the PR diff
        alongside the existing test plan and produces additional items that
        target logic, edge cases, and security gaps.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        <strong>Phase 2 &mdash; Verify:</strong> Each generated item is checked
        against the actual codebase using the assertion executor pattern
        (read file, ask LLM to verify claim). Items that fail represent
        potential bugs or missing guards.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Project Context
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The augmentor reads your repo&apos;s{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          CLAUDE.md
        </code>{" "}
        (if it exists) and includes it as project context. This tells the LLM
        about known patterns and intentional decisions, reducing false positives.
        For example, a hardcoded{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          TEMP_USER_ID
        </code>{" "}
        in an MVP won&apos;t be flagged as a bug if the{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          CLAUDE.md
        </code>{" "}
        documents it as intentional.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Contract Filtering
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        When the Contract Checker signal is active (PR touches both API and
        frontend files), the augmentor automatically excludes cross-file
        contract items from generation. The Contract Checker handles those
        better since it reads the full diff, while the augmentor verifies one
        file at a time.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Scoring
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Score = (passed items / verified items) * 100. A low score means the
        augmentor found potential issues worth reviewing &mdash; this is
        valuable information, not necessarily a problem with your code.
        As an LLM-based signal, it does not trigger the failure cap.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Real-World Example
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        In a SiegeKit PR that added a PATCH endpoint for editing targets, the
        original test plan had 6 existence items (all passed). The Plan
        Augmentor generated an item checking whether the PATCH handler fetches
        the existing target type before normalizing &mdash; and discovered the
        code hardcoded &ldquo;DOMAIN&rdquo; as a default instead. A real bug
        the original plan missed.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
