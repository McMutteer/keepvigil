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

function IconClaimsVerification() {
  return <SignalIcon><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M9 15l2 2 4-4" /></SignalIcon>;
}

function IconUndocumentedChanges() {
  return <SignalIcon><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></SignalIcon>;
}

function IconImpactAnalysis() {
  return <SignalIcon><path d="M12 3l8 4v5c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V7l8-4z" /></SignalIcon>;
}

const LAYERS = [
  {
    icon: <IconClaimsVerification />,
    name: "Claims Verification",
    tier: "Free",
    description:
      "Reads your PR title and description. Extracts every claim — 'adds auth middleware,' 'fixes timeout,' 'no breaking changes.' Verifies each one against the actual diff. Confirmed, unverified, or contradicted.",
    signals: [
      {
        name: "CI Bridge",
        description:
          "Maps test plan items to your GitHub Actions results. If CI already verified it, Vigil knows.",
      },
      {
        name: "Assertion Verifier",
        description:
          'Reads your actual source files and verifies claims like "Dockerfile uses non-root USER."',
      },
      {
        name: "Plan Augmentor",
        description:
          "Automatically generates 3-5 verification items your test plan missed — logic checks, contracts, edge cases — then verifies each one.",
      },
    ],
  },
  {
    icon: <IconUndocumentedChanges />,
    name: "Undocumented Changes",
    tier: "Free",
    description:
      "Reads the full diff. Finds significant changes you didn't mention — new dependencies, environment variables, schema changes, API modifications. The things reviewers need to know but the PR description doesn't surface.",
    signals: [
      {
        name: "Credential Scan",
        description:
          "Scans the diff for hardcoded secrets, API keys, and passwords. Catches what code review misses.",
      },
      {
        name: "Coverage Mapper",
        description:
          "Checks if changed files have corresponding test files. Files referenced by the test plan count as covered.",
      },
      {
        name: "Test Execution",
        description:
          "Runs shell commands from the test plan in a sandboxed Docker container. Real verification.",
      },
    ],
  },
  {
    icon: <IconImpactAnalysis />,
    name: "Impact Analysis",
    tier: "Pro",
    description:
      "Goes deeper. Breaking API changes, coverage gaps where modified files have no tests, cross-file contract violations where a producer changed but the consumer wasn't updated, credential patterns in the diff.",
    signals: [
      {
        name: "Diff vs Claims",
        description:
          "LLM compares what the PR actually changed against what the test plan promises. Finds the gaps between words and code.",
      },
      {
        name: "Gap Analysis",
        description:
          "LLM identifies areas of the code that changed but aren't covered by any test plan item. The unknown unknowns.",
      },
      {
        name: "Contract Checker",
        description:
          "Detects when a PR touches both API and frontend. Compares response shapes to ensure they still match.",
      },
    ],
  },
];

function LayerCard({
  icon,
  name,
  tier,
  description,
  signals,
  index,
}: {
  icon: ReactNode;
  name: string;
  tier: string;
  description: string;
  signals: { name: string; description: string }[];
  index: number;
}) {
  const isPro = tier === "Pro";

  return (
    <ScrollReveal delay={index * 200}>
      <div
        className={`bg-bg-surface rounded-[12px] p-6 ${
          isPro ? "border border-accent/20" : "border-subtle"
        }`}
      >
        {/* Layer header */}
        <div className="flex items-center gap-3 mb-3">
          <span className={isPro ? "text-accent" : "text-text-muted"}>{icon}</span>
          <span className="font-mono text-[15px] text-text-primary">{name}</span>
          <span
            className={`ml-auto text-[10px] font-medium uppercase tracking-[0.05em] px-2 py-0.5 rounded-full ${
              isPro
                ? "text-accent bg-accent/10"
                : "text-text-muted bg-white/[0.04]"
            }`}
          >
            {tier}
          </span>
        </div>

        {/* Layer description */}
        <p className="text-sm leading-relaxed text-text-secondary mb-5">
          {description}
        </p>

        {/* Individual signals within layer */}
        <div className="space-y-3 pt-4 border-t border-white/[0.06]">
          {signals.map((signal) => (
            <div key={signal.name}>
              <p className="text-[13px] font-medium text-text-primary">
                {signal.name}
              </p>
              <p className="text-xs leading-relaxed text-text-muted">
                {signal.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}

export function Signals() {
  return (
    <section id="signals" className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-4">
              Three layers. Full verification.
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-text-secondary max-w-[720px] mx-auto">
              Vigil reads your PR description, verifies every claim against the
              actual diff, and surfaces what you missed.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {LAYERS.map((layer, i) => (
            <LayerCard key={layer.name} {...layer} index={i} />
          ))}
        </div>

        {/* Score formula note */}
        <ScrollReveal delay={600}>
          <p className="text-center text-xs text-text-muted mt-8 max-w-[600px] mx-auto">
            Each layer contributes to the verification score. Claims and
            Undocumented Changes are free — the core value. Impact Analysis
            unlocks with Pro.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
