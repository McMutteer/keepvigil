import type { ReactNode } from "react";

import { ScrollReveal } from "../scroll-reveal";
import type { Dictionary } from "@/i18n/get-dictionary";

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
  signals: readonly { readonly name: string; readonly description: string }[];
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

export function Signals({ dict }: { dict: Dictionary }) {
  const t = dict.signals;
  const layers = [
    { icon: <IconClaimsVerification />, ...t.layers.claimsVerification },
    { icon: <IconUndocumentedChanges />, ...t.layers.undocumentedChanges },
    { icon: <IconImpactAnalysis />, ...t.layers.impactAnalysis },
  ];

  return (
    <section id="signals" className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-4">
              {t.title}
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-text-secondary max-w-[720px] mx-auto">
              {t.subtitle}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {layers.map((layer, i) => (
            <LayerCard key={i} {...layer} index={i} />
          ))}
        </div>

        {/* Score formula note */}
        <ScrollReveal delay={600}>
          <p className="text-center text-xs text-text-muted mt-8 max-w-[600px] mx-auto">
            {t.scoreNote}
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
