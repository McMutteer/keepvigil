"use client";

import { useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import type { Dictionary } from "@/i18n/get-dictionary";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

type Plan = {
  name: string;
  monthly: number;
  annual: number;
  description: string;
  badge?: string;
  features: readonly string[];
  cta: string;
  ctaHref: (annual: boolean) => string;
  highlighted: boolean;
};

const COMPARISON_VALUES: { free: string; pro: string; team: string }[] = [
  // Claims Verifier
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  // Undocumented Changes
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  // Credential Scan
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  // Coverage Mapper
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  // Contract Checker
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  // Diff Analyzer
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  // Risk Assessment
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  // Description Generator
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  // PR at a Glance
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  // Inline review comments
  { free: "\u2014", pro: "\u2705", team: "\u2705" },
  // Auto-approve
  { free: "\u2014", pro: "\u2705", team: "\u2705" },
  // Webhook notifications
  { free: "\u2014", pro: "\u2705", team: "\u2705" },
  // @vigil commands
  { free: "\u2014", pro: "\u2014", team: "\u2705" },
  // Repo memory
  { free: "\u2014", pro: "\u2014", team: "\u2705" },
  // Custom scoring rules
  { free: "\u2014", pro: "\u2014", team: "\u2705" },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function BillingToggle({
  annual,
  onToggle,
  dict,
}: {
  annual: boolean;
  onToggle: () => void;
  dict: Dictionary;
}) {
  const t = dict.pricing;
  return (
    <div className="flex flex-col items-center gap-3 mb-12 sm:mb-16">
      <div className="inline-flex items-center bg-bg-surface border border-white/[0.06] rounded-full p-1">
        <button
          type="button"
          onClick={() => annual && onToggle()}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            !annual
              ? "bg-accent text-[#080d1a] shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {t.monthly}
        </button>
        <button
          type="button"
          onClick={() => !annual && onToggle()}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            annual
              ? "bg-accent text-[#080d1a] shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {t.annual}
        </button>
      </div>
      {annual && (
        <span className="text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full animate-fade-in">
          {t.saveUpTo}
        </span>
      )}
    </div>
  );
}

function PricingCard({
  plan,
  annual,
  dict,
}: {
  plan: Plan;
  annual: boolean;
  dict: Dictionary;
}) {
  const t = dict.pricing;
  const price = plan.monthly === 0 ? 0 : annual ? plan.annual : plan.monthly;
  const displayPrice = price === 0 ? "$0" : `$${price}`;
  const period =
    price === 0 ? t.forever : annual ? t.perYear : t.perMonth;
  const savings =
    annual && plan.monthly > 0
      ? `Save $${plan.monthly * 12 - plan.annual}`
      : null;

  return (
    <div
      className={`rounded-[16px] p-[1px] flex flex-col ${
        plan.highlighted
          ? "bg-gradient-to-b from-accent/40 via-accent/10 to-transparent"
          : "bg-white/[0.06]"
      }`}
    >
      <div className={`bg-bg-surface rounded-[15px] p-8 flex flex-col flex-1 relative ${
        plan.highlighted ? "bg-bg-surface" : ""
      }`}>
        {plan.badge && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#080d1a] bg-accent px-4 py-1 rounded-full shadow-sm shadow-accent/20">
            {plan.badge}
          </span>
        )}

        <div className="mb-8">
          <h3 className="text-xl font-semibold text-text-primary mb-1.5">
            {plan.name}
          </h3>
          <p className="text-sm text-text-secondary">{plan.description}</p>
        </div>

        <div className="mb-8">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-5xl font-bold tracking-tight font-mono ${
              plan.highlighted ? "text-accent" : "text-text-primary"
            }`}>
              {displayPrice}
            </span>
            <span className="text-sm text-text-muted">{period}</span>
          </div>
          {savings && (
            <p className="text-xs text-accent mt-2 font-medium">{savings}</p>
          )}
        </div>

        <ul className="space-y-3.5 mb-8 flex-1">
          {plan.features.map((feature, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-sm text-text-secondary"
            >
              <span className={`mt-0.5 shrink-0 ${plan.highlighted ? "text-accent" : "text-text-muted"}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <a
          href={plan.ctaHref(annual)}
          className={`block w-full text-center py-3.5 rounded-[8px] text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${
            plan.highlighted
              ? "bg-accent text-[#080d1a] hover:bg-accent-hover shadow-sm shadow-accent/20"
              : "border border-white/[0.08] text-text-primary hover:bg-bg-elevated hover:border-white/[0.12]"
          }`}
        >
          {plan.cta}
        </a>
      </div>
    </div>
  );
}

function ComparisonTable({ dict }: { dict: Dictionary }) {
  const t = dict.pricing;

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full min-w-[600px] bg-bg-surface rounded-[12px] overflow-hidden">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left text-sm font-medium text-text-primary px-6 py-4 w-[40%]">
              {t.feature}
            </th>
            <th className="text-center text-sm font-medium text-text-primary px-4 py-4 w-[20%]">
              Free
            </th>
            <th className="text-center text-sm font-medium text-accent px-4 py-4 w-[20%]">
              Pro
            </th>
            <th className="text-center text-sm font-medium text-text-primary px-4 py-4 w-[20%]">
              Team
            </th>
          </tr>
        </thead>
        <tbody>
          {t.comparisonFeatures.map((featureName, i) => {
            const row = COMPARISON_VALUES[i];
            return (
              <tr
                key={i}
                className={`border-b border-white/[0.06] last:border-b-0 ${
                  i % 2 === 1 ? "bg-white/[0.015]" : ""
                }`}
              >
                <td className="text-sm text-text-secondary px-6 py-3.5">
                  {featureName}
                </td>
                <td className="text-center text-sm px-4 py-3.5">{row.free}</td>
                <td className="text-center text-sm px-4 py-3.5">{row.pro}</td>
                <td className="text-center text-sm px-4 py-3.5">{row.team}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PricingFaq({ dict }: { dict: Dictionary }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const t = dict.pricing;

  function toggle(index: number) {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  return (
    <div className="mx-auto max-w-[800px]">
      <ScrollReveal>
        <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary text-center mb-12 sm:mb-16">
          {t.billingQuestions}
        </h2>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div className="divide-y divide-white/[0.06]">
          {t.faq.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors"
                >
                  <span className="text-[15px] font-medium text-text-primary">
                    {item.question}
                  </span>
                  <ChevronIcon open={isOpen} />
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 text-sm leading-relaxed text-text-secondary">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollReveal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function TeamCalculator({ annual, dict }: { annual: boolean; dict: Dictionary }) {
  const [teamSize, setTeamSize] = useState(5);
  const locale = dict.nav.about === "About" ? "en" : "es";

  const proCost = annual ? teamSize * 120 : teamSize * 12;
  const teamCost = annual ? teamSize * 240 : teamSize * 24;
  const period = annual
    ? locale === "en" ? "/year" : "/año"
    : locale === "en" ? "/month" : "/mes";
  const label = locale === "en"
    ? `${teamSize} developer${teamSize !== 1 ? "s" : ""}`
    : `${teamSize} desarrollador${teamSize !== 1 ? "es" : ""}`;
  const heading = locale === "en" ? "How much for your team?" : "¿Cuánto para tu equipo?";

  return (
    <div className="bg-bg-surface border border-white/[0.06] rounded-[16px] p-6 sm:p-8">
      <h3 className="text-lg font-semibold text-text-primary text-center mb-8">{heading}</h3>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-text-secondary">{label}</span>
          <span className="text-2xl font-bold font-mono text-accent">{teamSize}</span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          value={teamSize}
          onChange={(e) => setTeamSize(Number(e.target.value))}
          className="w-full h-2 bg-bg-elevated rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-accent/30"
          aria-label={heading}
        />
        <div className="flex justify-between text-[10px] text-text-muted mt-1.5">
          <span>1</span>
          <span>25</span>
          <span>50</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-bg-deep rounded-[12px] p-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted mb-2">Free</div>
          <div className="text-xl font-bold font-mono text-text-primary">$0</div>
          <div className="text-[10px] text-text-muted mt-1">{locale === "en" ? "forever" : "siempre"}</div>
        </div>
        <div className="bg-bg-deep rounded-[12px] p-4 border border-accent/20 relative">
          <div className="text-[10px] font-medium uppercase tracking-wider text-accent mb-2">Pro</div>
          <div className="text-xl font-bold font-mono text-accent">${proCost}</div>
          <div className="text-[10px] text-text-muted mt-1">{period}</div>
        </div>
        <div className="bg-bg-deep rounded-[12px] p-4">
          <div className="text-[10px] font-medium uppercase tracking-wider text-text-muted mb-2">Team</div>
          <div className="text-xl font-bold font-mono text-text-primary">${teamCost}</div>
          <div className="text-[10px] text-text-muted mt-1">{period}</div>
        </div>
      </div>
    </div>
  );
}

export function PricingPageClient({
  dict,
}: {
  dict: Dictionary;
}) {
  const [annual, setAnnual] = useState(false);
  const t = dict.pricing;

  const plans: Plan[] = [
    {
      name: t.plans.free.name,
      monthly: 0,
      annual: 0,
      description: t.plans.free.description,
      features: t.plans.free.features,
      cta: t.plans.free.cta,
      ctaHref: () => "https://github.com/apps/keepvigil",
      highlighted: false,
    },
    {
      name: t.plans.pro.name,
      monthly: 12,
      annual: 120,
      description: t.plans.pro.description,
      badge: t.plans.pro.badge,
      features: t.plans.pro.features,
      cta: t.plans.pro.cta,
      ctaHref: (ann) =>
        ann
          ? "/api/checkout?plan=pro&interval=annual"
          : "/api/checkout?plan=pro",
      highlighted: true,
    },
    {
      name: t.plans.team.name,
      monthly: 24,
      annual: 240,
      description: t.plans.team.description,
      features: t.plans.team.features,
      cta: t.plans.team.cta,
      ctaHref: (ann) =>
        ann
          ? "/api/checkout?plan=team&interval=annual"
          : "/api/checkout?plan=team",
      highlighted: false,
    },
  ];

  return (
    <div className="py-24 sm:py-32">
      {/* Header */}
      <div className="mx-auto max-w-[1200px] px-6">
        <ScrollReveal>
          <h1 className="text-3xl sm:text-5xl font-semibold leading-[1.15] text-text-primary text-center mb-4">
            {t.title}
          </h1>
          <p className="text-center text-text-secondary text-lg max-w-[560px] mx-auto mb-12 sm:mb-16">
            {t.subtitle}
          </p>
        </ScrollReveal>

        {/* Billing toggle */}
        <ScrollReveal delay={100}>
          <BillingToggle annual={annual} onToggle={() => setAnnual((a) => !a)} dict={dict} />
        </ScrollReveal>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[1000px] mx-auto">
          {plans.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={150 + i * 100}>
              <PricingCard plan={plan} annual={annual} dict={dict} />
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={500}>
          <p className="text-center text-xs text-text-muted mt-8 mb-0">
            {t.allPlansNote}
          </p>
        </ScrollReveal>
      </div>

      {/* Team size calculator */}
      <div className="mx-auto max-w-[600px] px-6 mt-16 sm:mt-20">
        <ScrollReveal delay={200}>
          <TeamCalculator annual={annual} dict={dict} />
        </ScrollReveal>
      </div>

      {/* Comparison table */}
      <div className="mx-auto max-w-[1200px] px-6 py-24 sm:py-32">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary text-center mb-12 sm:mb-16">
            {t.comparePlans}
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <ComparisonTable dict={dict} />
        </ScrollReveal>
      </div>

      {/* Dashboard CTA */}
      <div className="mx-auto max-w-[1200px] px-6 pb-12 sm:pb-16">
        <ScrollReveal delay={200}>
          <div className="bg-bg-surface border border-white/[0.06] rounded-[12px] p-8 text-center max-w-[600px] mx-auto">
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {t.alreadyUsingVigil}
            </h3>
            <p className="text-sm text-text-secondary mb-5">
              {t.alreadyUsingVigilDescription}
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[6px] text-sm font-medium border border-white/[0.06] text-text-primary hover:bg-bg-elevated transition-colors duration-150"
            >
              {t.openDashboard}
            </a>
          </div>
        </ScrollReveal>
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-[1200px] px-6">
        <PricingFaq dict={dict} />
      </div>
    </div>
  );
}
