import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Writing Test Plans | Vigil Docs",
  description:
    "How to write test plans that maximize Vigil's detection power. The difference between a fake 70/100 and a real confidence score.",
};

export default function WritingTestPlansPage() {
  const { prev, next } = getPrevNext("/docs/writing-test-plans");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Writing Test Plans
      </h1>
      <p className="text-text-secondary mb-8">
        The quality of your confidence score depends on the quality of your test
        plan. Here&apos;s how to write plans that catch real bugs.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        The Problem with Default Test Plans
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        AI coding agents generate test plans with almost every PR. But most of
        those items are <strong className="text-text-primary">existence checks</strong>
        &nbsp;— &quot;does this function exist?&quot;, &quot;does this file
        import X?&quot; Vigil verifies them correctly, they all pass, and you
        get a high score. But the score is misleading — existence checks
        don&apos;t catch logic bugs, broken contracts between files, or missing
        edge cases.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
        <div className="bg-bg-surface border border-white/[0.06] rounded-[12px] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.05em] text-failure mb-3">
            Before — Existence-only plan
          </p>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>☑ Function exists in auth.ts</p>
            <p>☑ Route handler is exported</p>
            <p>☑ Config file has JWT section</p>
            <p>☑ Middleware is imported</p>
            <p>☑ Error type is defined</p>
            <p>☑ Test file exists</p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <p className="text-sm text-text-muted">
              Result: <span className="text-accent font-mono">6/6 passed</span>{" "}
              · Score: 70 · <span className="text-failure">Bug shipped</span>
            </p>
          </div>
        </div>

        <div className="bg-bg-surface border border-accent/20 rounded-[12px] p-5">
          <p className="text-xs font-medium uppercase tracking-[0.05em] text-success mb-3">
            After — Multi-category plan
          </p>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>☑ validateToken returns error for expired JWTs</p>
            <p>☑ Route handler calls validateToken before DB query</p>
            <p>☑ Frontend sends token in Authorization header</p>
            <p>☑ Backend reads from same header name</p>
            <p>☑ Missing token returns 401, not 500</p>
            <p>☑ Expired token returns 401 with &quot;expired&quot; message</p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <p className="text-sm text-text-muted">
              Result: <span className="text-accent font-mono">5/6 passed</span>{" "}
              · Score: 85 ·{" "}
              <span className="text-success">Bug caught before merge</span>
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        The Four Categories
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        A strong test plan balances four types of items. Aim for these rough
        proportions:
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

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Five Rules for Better Test Plans
      </h2>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        1. Use full file paths
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil reads files by path. Ambiguous names like{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          auth.ts
        </code>{" "}
        might resolve to the wrong file. Use the full path from the repo root.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-code-bg rounded-[8px] p-3">
          <p className="text-xs text-failure mb-1">❌ Ambiguous</p>
          <code className="font-mono text-[13px] text-code-text">
            auth.ts validates tokens
          </code>
        </div>
        <div className="bg-code-bg rounded-[8px] p-3">
          <p className="text-xs text-success mb-1">✅ Specific</p>
          <code className="font-mono text-[13px] text-code-text">
            src/middleware/auth.ts validates tokens
          </code>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        2. Be specific about logic
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        Don&apos;t say &quot;normalizes values.&quot; Say exactly what the
        normalization does and what inputs it uses. Vigil reads the actual code —
        give it something concrete to verify.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-code-bg rounded-[8px] p-3">
          <p className="text-xs text-failure mb-1">❌ Vague</p>
          <code className="font-mono text-[13px] text-code-text">
            normalizes the target value
          </code>
        </div>
        <div className="bg-code-bg rounded-[8px] p-3">
          <p className="text-xs text-success mb-1">✅ Specific</p>
          <code className="font-mono text-[13px] text-code-text">
            PATCH handler reads existing.type before calling normalize
          </code>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        3. Verify contracts across files
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        When frontend and backend must agree on a field name, API shape, or
        enum, write a separate item for each side. Vigil verifies one file per
        assertion — two items, two files, same expectation.
      </p>
      <CodeBlock
        filename="example"
        code={`## Test Plan
- [ ] \`src/api/routes/users.ts\` returns { id, name, email } in GET /users response
- [ ] \`src/app/components/UserList.tsx\` reads id, name, email from the API response`}
      />

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        4. Describe edge case mechanisms
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        Don&apos;t just say &quot;handles errors.&quot; Describe the mechanism —
        what check prevents the bad state, what the code does when it triggers.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-code-bg rounded-[8px] p-3">
          <p className="text-xs text-failure mb-1">❌ Vague</p>
          <code className="font-mono text-[13px] text-code-text">
            prevents double submit
          </code>
        </div>
        <div className="bg-code-bg rounded-[8px] p-3">
          <p className="text-xs text-success mb-1">✅ Mechanism</p>
          <code className="font-mono text-[13px] text-code-text">
            handleSubmit checks isLoading and returns early if true
          </code>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        5. Leave a blank line before footers
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        AI agents often append a &quot;Generated with...&quot; line right after
        the last checkbox. This can merge with the last item and corrupt the
        assertion. Always leave a blank line between the last test item and any
        footer text.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Template
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Copy this into your PR description and fill in the items:
      </p>
      <CodeBlock
        filename="PR description"
        code={`## Test Plan

### Existence
- [ ] \`path/to/file.ts\` exports the expected function/type
- [ ] \`path/to/other.ts\` imports the dependency

### Logic
- [ ] \`path/to/handler.ts\` validates input before processing
- [ ] \`path/to/service.ts\` uses the correct field from the database result
- [ ] \`path/to/util.ts\` returns early when input is empty

### Contracts
- [ ] \`src/api/route.ts\` returns { field1, field2 } in the response
- [ ] \`src/app/component.tsx\` reads field1, field2 from the response

### Edge Cases
- [ ] \`path/to/handler.ts\` returns 400 when required field is missing
- [ ] \`path/to/form.tsx\` disables submit button while request is in flight`}
      />

      <Callout variant="info" title="Vigil also helps automatically">
        <p>
          Even without a perfect test plan, Vigil&apos;s signals work together
          to find issues. The Credential Scan catches secrets regardless of the
          plan. The Coverage Mapper finds untested files. And Pro signals analyze
          the actual diff to find gaps the test plan missed.
        </p>
      </Callout>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
