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
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  { free: "\u2705", pro: "\u2705", team: "\u2705" },
  { free: "\u2014", pro: "\u2705", team: "\u2705" },
  { free: "\u2014", pro: "\u2705", team: "\u2705" },
  { free: "\u2014", pro: "\u2705", team: "\u2705" },
  { free: "\u2014", pro: "\u2705", team: "\u2705" },
  { free: "\u2014", pro: "\u2705", team: "\u2705" },
  { free: "\u2014", pro: "\u2014", team: "\u2705" },
  { free: "\u2014", pro: "\u2014", team: "\u2705" },
  { free: "\u2014", pro: "\u2014", team: "\u2705" },
  { free: "10", pro: "50", team: "200" },
  { free: "50", pro: "500", team: "2,000" },
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
    <div className="flex items-center justify-center gap-3 mb-12 sm:mb-16">
      <span
        className={`text-sm font-medium transition-colors ${
          !annual ? "text-text-primary" : "text-text-muted"
        }`}
      >
        {t.monthly}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={annual}
        aria-label="Toggle annual billing"
        onClick={onToggle}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-white/[0.06] bg-bg-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-accent shadow-sm transition-transform duration-200 ${
            annual ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span
        className={`text-sm font-medium transition-colors ${
          annual ? "text-text-primary" : "text-text-muted"
        }`}
      >
        {t.annual}
      </span>
      {annual && (
        <span className="text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
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
      className={`bg-bg-surface rounded-[12px] p-8 flex flex-col ${
        plan.highlighted
          ? "border border-accent/30 relative"
          : "border border-white/[0.06]"
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-[0.05em] text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full">
          {plan.badge}
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-1">
          {plan.name}
        </h3>
        <p className="text-sm text-text-secondary">{plan.description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-semibold text-text-primary font-mono">
            {displayPrice}
          </span>
          <span className="text-sm text-text-muted">{period}</span>
        </div>
        {savings && (
          <p className="text-xs text-accent mt-1">{savings}</p>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-sm text-text-secondary"
          >
            <span className="text-text-muted mt-0.5 shrink-0">&#10003;</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <a
        href={plan.ctaHref(annual)}
        className={`block w-full text-center py-3 rounded-[6px] text-sm font-medium transition-colors duration-150 active:scale-[0.98] ${
          plan.highlighted
            ? "bg-accent text-[#080d1a] hover:bg-accent-hover"
            : "border border-white/[0.06] text-text-primary hover:bg-bg-elevated"
        }`}
      >
        {plan.cta}
      </a>
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
      monthly: 19,
      annual: 190,
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
      monthly: 49,
      annual: 490,
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
