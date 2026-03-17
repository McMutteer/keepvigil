import { ScrollReveal } from "../scroll-reveal";

const SIGNAL_ROWS = [
  {
    name: "Credential Scan",
    score: 100,
    status: "✅ Passed",
    detail: "No secrets detected",
    color: "text-success",
  },
  {
    name: "CI Bridge",
    score: 100,
    status: "✅ Passed",
    detail: "3/3 check runs passed",
    color: "text-success",
  },
  {
    name: "Test Execution",
    score: 67,
    status: "⚠️ Partial",
    detail: "4/6 items passed",
    color: "text-warning",
  },
  {
    name: "Coverage Mapper",
    score: 75,
    status: "⚠️ Partial",
    detail: "3/4 changed files covered",
    color: "text-warning",
  },
  {
    name: "Assertion Verifier",
    score: 100,
    status: "✅ Passed",
    detail: "📁 5 files verified",
    color: "text-success",
  },
  {
    name: "Diff vs Claims",
    score: 85,
    status: "✅ Passed",
    detail: "1 minor gap found",
    color: "text-success",
  },
  {
    name: "Gap Analysis",
    score: 90,
    status: "✅ Passed",
    detail: "No critical gaps",
    color: "text-success",
  },
];

export function Evidence() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-[900px] px-6">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-4">
              This appears on every PR.
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-text-secondary max-w-[600px] mx-auto">
              No dashboard. No separate tool. The results live where you already
              work — right on the pull request.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="bg-bg-surface border-subtle rounded-[16px] p-5 sm:p-8 max-w-[800px] mx-auto">
            {/* Comment header */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.06]">
              <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-sm">
                🛡️
              </div>
              <span className="font-medium text-sm text-text-primary">
                vigil
              </span>
              <span className="text-xs text-text-muted">bot</span>
            </div>

            {/* Score header */}
            <div className="mb-4">
              <p className="text-lg sm:text-xl font-semibold text-text-primary">
                🛡️ Vigil Confidence Score:{" "}
                <span className="text-accent">82/100</span> — Safe to merge ✅
              </p>
            </div>

            {/* Score explanation line */}
            <div className="text-xs font-mono text-text-muted mb-6 px-3 py-2 bg-code-bg rounded-[8px]">
              Credential Scan ✅ • CI Bridge ✅ • Test Execution ⚠️ • Coverage
              ⚠️ • Assertion ✅ • Diff ✅ • Gap ✅
            </div>

            {/* Signal table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-2 px-2 text-xs font-medium uppercase tracking-[0.05em] text-text-muted">
                      Signal
                    </th>
                    <th className="text-left py-2 px-2 text-xs font-medium uppercase tracking-[0.05em] text-text-muted">
                      Score
                    </th>
                    <th className="text-left py-2 px-2 text-xs font-medium uppercase tracking-[0.05em] text-text-muted">
                      Status
                    </th>
                    <th className="text-left py-2 px-2 text-xs font-medium uppercase tracking-[0.05em] text-text-muted hidden sm:table-cell">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SIGNAL_ROWS.map((row) => (
                    <tr
                      key={row.name}
                      className="border-b border-white/[0.04]"
                    >
                      <td className="py-2.5 px-2 font-mono text-[13px] text-text-primary">
                        {row.name}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-[13px] text-text-secondary">
                        {row.score}
                      </td>
                      <td className={`py-2.5 px-2 text-[13px] ${row.color}`}>
                        {row.status}
                      </td>
                      <td className="py-2.5 px-2 text-[13px] text-text-muted hidden sm:table-cell">
                        {row.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action items */}
            <div>
              <p className="text-sm font-semibold text-text-primary mb-2">
                Action Items
              </p>
              <div className="space-y-1.5">
                <p className="text-[13px] text-text-secondary">
                  <span className="font-medium text-failure">Must Fix:</span>
                </p>
                <p className="text-[13px] text-text-secondary pl-4">
                  ❌{" "}
                  <code className="font-mono text-xs bg-code-bg px-1.5 py-0.5 rounded">
                    npm test
                  </code>{" "}
                  exits with code 1 — fix failing test
                </p>
                <p className="text-[13px] text-text-secondary mt-2">
                  <span className="font-medium text-warning">Consider:</span>
                </p>
                <p className="text-[13px] text-text-secondary pl-4">
                  ⚠️{" "}
                  <code className="font-mono text-xs bg-code-bg px-1.5 py-0.5 rounded">
                    src/utils/auth.ts
                  </code>{" "}
                  changed but has no test file
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
