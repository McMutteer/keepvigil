import { ScrollReveal } from "../scroll-reveal";

const SIGNAL_ROWS = [
  {
    name: "Credential Scan",
    score: "100/100",
    status: "✅ Passed",
    detail: "No secrets detected",
    color: "text-success",
  },
  {
    name: "CI Bridge",
    score: "100/100",
    status: "✅ Passed",
    detail: "12 items mapped",
    color: "text-success",
  },
  {
    name: "Test Execution",
    score: "100/100",
    status: "✅ Passed",
    detail: "12/12 items passed",
    color: "text-success",
  },
  {
    name: "Coverage Mapper",
    score: "50/100",
    status: "⚠️ Partial",
    detail: "4/8 changed files covered",
    color: "text-warning",
  },
  {
    name: "Diff vs Claims",
    score: "47/100",
    status: "⚠️ Gaps found",
    detail: "8 passed, 4 warnings",
    color: "text-warning",
  },
  {
    name: "Gap Analysis",
    score: "96/100",
    status: "✅ Passed",
    detail: "No critical gaps",
    color: "text-success",
  },
  {
    name: "Plan Augmentation",
    score: "100/100",
    status: "✅ Passed",
    detail: "5/5 auto-generated items verified",
    color: "text-success",
  },
  {
    name: "Contract Check",
    score: "100/100",
    status: "✅ Passed",
    detail: "Cross-file contracts compatible",
    color: "text-success",
  },
];

export function Evidence() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-[900px] px-6">
        <ScrollReveal>
          <div className="text-center mb-4">
            <p className="text-xs font-medium uppercase tracking-[0.05em] text-accent mb-3">
              Real result from keepvigil PR #47
            </p>
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
                <span className="text-accent">95/100</span> — Safe to merge ✅
              </p>
              <p className="text-xs text-text-muted mt-1">
                12/12 test plan items passed · 5 auto-generated items verified
              </p>
            </div>

            {/* Score explanation line */}
            <div className="text-xs font-mono text-text-muted mb-6 px-3 py-2 bg-code-bg rounded-[8px]">
              Credential ✅ • CI Bridge ✅ • Execution ✅ • Coverage ⚠️ • Diff
              ⚠️ • Gap ✅ • Augmentor ✅ • Contract ✅
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
                  <span className="font-medium text-warning">Consider:</span>
                </p>
                <p className="text-[13px] text-text-secondary pl-4">
                  ⚠️ 4 changed files have no corresponding test coverage
                </p>
                <p className="text-[13px] text-text-secondary pl-4">
                  ⚠️ Diff analysis found 4 areas not explicitly covered by test
                  plan
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={400}>
          <p className="text-center text-sm mt-8">
            <a
              href="https://github.com/McMutteer/keepvigil/pull/47"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover transition-colors"
            >
              See this exact result on GitHub →
            </a>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
