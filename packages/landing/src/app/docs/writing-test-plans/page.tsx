import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Writing PR Descriptions | Vigil Docs",
  description:
    "How to write PR descriptions that maximize Vigil's verification power. Good descriptions lead to better claims verification.",
};

export default function WritingTestPlansPage() {
  const { prev, next } = getPrevNext("/docs/writing-test-plans");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Writing PR Descriptions
      </h1>
      <p className="text-text-secondary mb-8">
        Vigil verifies any PR — no test plan required. But the quality of your
        confidence score depends on what you write in the PR description.
        Here&apos;s how to get the most out of it.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        How Vigil Reads Your PR
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil extracts{" "}
        <strong className="text-text-primary">claims</strong> from your PR title
        and body — anything that describes what this PR does, what changed, or
        what should work. It then verifies those claims against the actual diff.
        The more specific your description, the deeper the verification.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        A PR with the title &quot;fix auth bug&quot; and no body still gets
        verified — Vigil will analyze the diff for undocumented changes,
        credential leaks, and CI status. But a well-written description unlocks
        claims verification: Vigil checks that what you <em>said</em> you did
        matches what you <em>actually</em> did.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
        <div className="bg-bg-surface border border-white/[0.06] rounded-[12px] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.05em] text-failure mb-3">
            Before — Minimal description
          </p>
          <div className="space-y-2 text-sm text-text-secondary">
            <p className="font-medium text-text-primary">fix auth bug</p>
            <p className="italic text-text-muted">(no body)</p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <p className="text-sm text-text-muted">
              Result: undocumented change detection only ·{" "}
              <span className="text-accent font-mono">Score: 65</span>
            </p>
          </div>
        </div>

        <div className="bg-bg-surface border border-accent/20 rounded-[12px] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.05em] text-success mb-3">
            After — Descriptive PR
          </p>
          <div className="space-y-2 text-sm text-text-secondary">
            <p className="font-medium text-text-primary">
              fix: expired JWT returns 500 instead of 401
            </p>
            <p>
              The validateToken middleware was not catching TokenExpiredError.
              Added a catch block that returns 401 with an &quot;expired&quot;
              message. Also updated the frontend to redirect to /login on 401.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <p className="text-sm text-text-muted">
              Result: 4 claims verified against diff ·{" "}
              <span className="text-accent font-mono">Score: 88</span> ·{" "}
              <span className="text-success">
                Undocumented change in config.ts surfaced
              </span>
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Tips for Better PR Descriptions
      </h2>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        1. State what changed and why
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil extracts claims from natural language. The more concrete your
        description, the more claims it can verify. Mention specific files,
        functions, or behaviors.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-code-bg rounded-[8px] p-3">
          <p className="text-xs text-failure mb-1">Weak</p>
          <code className="font-mono text-[13px] text-code-text">
            Updated the auth flow
          </code>
        </div>
        <div className="bg-code-bg rounded-[8px] p-3">
          <p className="text-xs text-success mb-1">Strong</p>
          <code className="font-mono text-[13px] text-code-text">
            validateToken in src/middleware/auth.ts now catches TokenExpiredError
            and returns 401
          </code>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        2. Mention both sides of a contract
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        If your change touches both backend and frontend, describe both. Vigil
        will verify that the diff matches on both sides — catching mismatches
        between what the API returns and what the UI expects.
      </p>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        3. Call out edge cases you handled
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        If you handled a null check, an empty array, or a race condition,
        mention it. These become claims that Vigil verifies in the diff.
      </p>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        4. Let Vigil find what you missed
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil&apos;s Undocumented Change Detection compares your description
        against the full diff. Changes you didn&apos;t mention get flagged. This
        is most useful when your description is detailed — the contrast between
        &quot;documented&quot; and &quot;undocumented&quot; changes becomes
        meaningful.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Bonus: Including a Test Plan
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        If your PR includes a markdown checkbox test plan, Vigil runs in dual
        mode — combining v2 claims verification with v1 test plan execution.
        This gives you the deepest analysis possible.
      </p>

      <Callout variant="info" title="Test plans are optional, not deprecated">
        <p>
          AI coding agents often generate test plans automatically. If your
          workflow already produces them, great — Vigil uses them. If not, Vigil
          works just as well with a plain PR description.
        </p>
      </Callout>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        The Four Categories of Test Items
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        When writing a test plan, balance these four types of items:
      </p>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                Category
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                Target
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                What it catches
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/[0.04]">
              <td className="py-2.5 px-3 text-text-primary font-medium">
                Existence
              </td>
              <td className="py-2.5 px-3 text-text-secondary">≤ 30%</td>
              <td className="py-2.5 px-3 text-text-secondary">
                Missing files, missing exports, missing imports
              </td>
            </tr>
            <tr className="border-b border-white/[0.04]">
              <td className="py-2.5 px-3 text-text-primary font-medium">
                Logic
              </td>
              <td className="py-2.5 px-3 text-text-secondary">30 – 40%</td>
              <td className="py-2.5 px-3 text-text-secondary">
                Wrong behavior, incorrect conditionals, bad calculations
              </td>
            </tr>
            <tr className="border-b border-white/[0.04]">
              <td className="py-2.5 px-3 text-text-primary font-medium">
                Contracts
              </td>
              <td className="py-2.5 px-3 text-text-secondary">20 – 30%</td>
              <td className="py-2.5 px-3 text-text-secondary">
                Frontend/backend mismatches, broken interfaces between files
              </td>
            </tr>
            <tr className="border-b border-white/[0.04]">
              <td className="py-2.5 px-3 text-text-primary font-medium">
                Edge cases
              </td>
              <td className="py-2.5 px-3 text-text-secondary">10 – 20%</td>
              <td className="py-2.5 px-3 text-text-secondary">
                Null handling, empty states, error paths, race conditions
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Test Plan Tips
      </h3>
      <ul className="list-disc ml-6 space-y-2 text-text-secondary mb-6">
        <li>
          <strong className="text-text-primary">Use full file paths</strong> —
          Vigil reads files by path. Use the full path from the repo root, not
          just the filename.
        </li>
        <li>
          <strong className="text-text-primary">
            Be specific about logic
          </strong>{" "}
          — Don&apos;t say &quot;normalizes values.&quot; Say exactly what the
          normalization does and what inputs it uses.
        </li>
        <li>
          <strong className="text-text-primary">
            Verify contracts across files
          </strong>{" "}
          — When frontend and backend must agree on a field name, write a
          separate item for each side.
        </li>
        <li>
          <strong className="text-text-primary">
            Describe edge case mechanisms
          </strong>{" "}
          — Don&apos;t just say &quot;handles errors.&quot; Describe the
          mechanism — what check prevents the bad state.
        </li>
        <li>
          <strong className="text-text-primary">
            Leave a blank line before footers
          </strong>{" "}
          — AI agents often append a &quot;Generated with...&quot; line that can
          merge with the last checkbox item.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Template
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        A good PR description for Vigil — with optional test plan:
      </p>
      <CodeBlock
        filename="PR description"
        code={`## Summary
Fixes expired JWT returning 500 instead of 401. The validateToken middleware
now catches TokenExpiredError. Frontend redirects to /login on 401.

## Test Plan (optional — for deeper verification)

### Logic
- [ ] \`src/middleware/auth.ts\` catches TokenExpiredError and returns 401
- [ ] \`src/middleware/auth.ts\` returns 401 with "expired" message body

### Contracts
- [ ] \`src/api/routes/users.ts\` returns 401 for expired tokens
- [ ] \`src/app/hooks/useAuth.ts\` redirects to /login on 401 response

### Edge Cases
- [ ] \`src/middleware/auth.ts\` returns 401 (not 500) when token is malformed`}
      />

      <Callout variant="info" title="Vigil works on any PR">
        <p>
          Even without a description or test plan, Vigil runs undocumented
          change detection, credential scanning, CI bridge, and coverage
          mapping. A good description just unlocks the full power of claims
          verification.
        </p>
      </Callout>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
