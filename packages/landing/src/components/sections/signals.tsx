import type { ReactNode } from "react";

import { ScrollReveal } from "../scroll-reveal";

function SignalIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function IconCiBridge() {
  return <SignalIcon><circle cx="6" cy="12" r="3" /><circle cx="18" cy="12" r="3" /><path d="M9 12h6" /></SignalIcon>;
}

function IconCredentialScan() {
  return <SignalIcon><path d="M12 3l8 4v5c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V7l8-4z" /></SignalIcon>;
}

function IconTestExecution() {
  return <SignalIcon><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></SignalIcon>;
}

function IconCoverageMapper() {
  return <SignalIcon><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></SignalIcon>;
}

function IconAssertionVerifier() {
  return <SignalIcon><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></SignalIcon>;
}

function IconPlanAugmentor() {
  return <SignalIcon><path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.8 5.6 21.2 8 14 2 9.2h7.6z" /></SignalIcon>;
}

function IconDiffVsClaims() {
  return <SignalIcon><line x1="18" y1="20" x2="18" y2="4" /><polyline points="14 8 18 4 22 8" /><line x1="6" y1="4" x2="6" y2="20" /><polyline points="10 16 6 20 2 16" /></SignalIcon>;
}

function IconGapAnalysis() {
  return <SignalIcon><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></SignalIcon>;
}

function IconContractChecker() {
  return <SignalIcon><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></SignalIcon>;
}

const FREE_SIGNALS = [
  {
    icon: <IconCiBridge />,
    name: "CI Bridge",
    description:
      "Maps test plan items to your GitHub Actions results. If CI already verified it, Vigil knows.",
  },
  {
    icon: <IconCredentialScan />,
    name: "Credential Scan",
    description:
      "Scans the diff for hardcoded secrets, API keys, and passwords. Catches what code review misses.",
  },
  {
    icon: <IconTestExecution />,
    name: "Test Execution",
    description:
      "Runs shell commands from the test plan in a sandboxed Docker container. Real verification.",
  },
  {
    icon: <IconCoverageMapper />,
    name: "Coverage Mapper",
    description:
      "Checks if changed files have corresponding test files. Files referenced by the test plan count as covered.",
  },
  {
    icon: <IconAssertionVerifier />,
    name: "Assertion Verifier",
    description:
      'Reads your actual source files and verifies claims like "Dockerfile uses non-root USER."',
  },
  {
    icon: <IconPlanAugmentor />,
    name: "Plan Augmentor",
    description:
      "Automatically generates 3-5 verification items your test plan missed — logic checks, contracts, edge cases — then verifies each one.",
  },
];

const PRO_SIGNALS = [
  {
    icon: <IconDiffVsClaims />,
    name: "Diff vs Claims",
    description:
      "LLM compares what the PR actually changed against what the test plan promises. Finds the gaps between words and code.",
  },
  {
    icon: <IconGapAnalysis />,
    name: "Gap Analysis",
    description:
      "LLM identifies areas of the code that changed but aren't covered by any test plan item. The unknown unknowns.",
  },
  {
    icon: <IconContractChecker />,
    name: "Contract Checker",
    description:
      "Detects when a PR touches both API and frontend. Compares response shapes to ensure they still match.",
  },
];

function SignalCard({
  icon,
  name,
  description,
  pro = false,
}: {
  icon: ReactNode;
  name: string;
  description: string;
  pro?: boolean;
}) {
  return (
    <div
      className={`bg-bg-surface rounded-[12px] p-6 ${
        pro ? "border border-accent/20" : "border-subtle"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className={pro ? "text-accent" : "text-text-muted"}>{icon}</span>
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
    <section id="signals" className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-4">
              Nine signals. One score.
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
        <ScrollReveal delay={600}>
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs font-medium uppercase tracking-[0.05em] text-accent">
              Pro — Bring Your Own LLM
            </span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
        </ScrollReveal>

        {/* Pro signals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[1000px] mx-auto">
          {PRO_SIGNALS.map((signal, i) => (
            <ScrollReveal key={signal.name} delay={700 + i * 100}>
              <SignalCard {...signal} pro />
            </ScrollReveal>
          ))}
        </div>

        {/* Score formula note */}
        <ScrollReveal delay={1000}>
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
