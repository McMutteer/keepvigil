import { ScrollReveal } from "../scroll-reveal";

const FREE_SIGNALS = [
  {
    icon: "🔍",
    name: "CI Bridge",
    description:
      "Maps test plan items to your GitHub Actions results. If CI already verified it, Vigil knows.",
  },
  {
    icon: "🔐",
    name: "Credential Scan",
    description:
      "Scans the diff for hardcoded secrets, API keys, and passwords. Catches what code review misses.",
  },
  {
    icon: "⚡",
    name: "Test Execution",
    description:
      "Runs shell commands from the test plan in a sandboxed Docker container. Real verification.",
  },
  {
    icon: "📊",
    name: "Coverage Mapper",
    description:
      "Checks if changed files have corresponding test files. Finds the blind spots.",
  },
  {
    icon: "📁",
    name: "Assertion Verifier",
    description:
      'Reads your actual source files and verifies claims like "Dockerfile uses non-root USER."',
  },
];

const PRO_SIGNALS = [
  {
    icon: "🔬",
    name: "Diff vs Claims",
    description:
      "LLM compares what the PR actually changed against what the test plan promises. Finds the gaps between words and code.",
  },
  {
    icon: "🕳️",
    name: "Gap Analysis",
    description:
      "LLM identifies areas of the code that changed but aren't covered by any test plan item. The unknown unknowns.",
  },
];

function SignalCard({
  icon,
  name,
  description,
  pro = false,
}: {
  icon: string;
  name: string;
  description: string;
  pro?: boolean;
}) {
  return (
    <div
      className={`bg-bg-surface rounded-[12px] p-6 ${
        pro
          ? "border border-accent/20"
          : "border-subtle"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-lg">{icon}</span>
        <span className="font-mono text-[15px] text-text-primary">{name}</span>
        {pro && (
          <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.05em] text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            Pro
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}

export function Signals() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-4">
              Seven signals. One score.
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-text-secondary max-w-[720px] mx-auto">
              Vigil doesn&apos;t just run tests. It collects multiple
              independent signals about your PR and combines them into a
              weighted confidence score.
            </p>
          </div>
        </ScrollReveal>

        {/* Free signals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {FREE_SIGNALS.map((signal, i) => (
            <ScrollReveal key={signal.name} delay={i * 100}>
              <SignalCard {...signal} />
            </ScrollReveal>
          ))}
        </div>

        {/* Pro divider */}
        <ScrollReveal delay={500}>
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-accent">
              Pro — Bring Your Own LLM
            </span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
        </ScrollReveal>

        {/* Pro signals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[800px] mx-auto">
          {PRO_SIGNALS.map((signal, i) => (
            <ScrollReveal key={signal.name} delay={600 + i * 100}>
              <SignalCard {...signal} pro />
            </ScrollReveal>
          ))}
        </div>

        {/* Score formula note */}
        <ScrollReveal delay={800}>
          <p className="text-center text-xs text-text-muted mt-8 max-w-[600px] mx-auto">
            Each signal has a weight. The confidence score is a weighted average
            from 0 to 100. Any critical failure caps the score at 70 — one
            problem means it&apos;s never &quot;safe to merge.&quot;
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
