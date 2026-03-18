"use client";

import { useState } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

type Plan = {
  name: string;
  monthly: number;
  annual: number;
  period: string;
  description: string;
  badge?: string;
  features: string[];
  cta: string;
  ctaHref: (annual: boolean) => string;
  highlighted: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    monthly: 0,
    annual: 0,
    period: "forever",
    description: "Immediate value, zero config.",
    features: [
      "CI Bridge — verify GitHub Actions results",
      "Credential Scan — catch hardcoded secrets",
      "Coverage Mapper — find untested files",
      "Test Execution — sandbox verification",
      "Assertion Verifier — file content checks",
      "Plan Augmentor — auto-generate missing checks",
      "Unlimited public repos",
      "10 PRs/hour, 50 PRs/day",
    ],
    cta: "Install Free",
    ctaHref: () => "https://github.com/apps/keepvigil",
    highlighted: false,
  },
  {
    name: "Pro",
    monthly: 19,
    annual: 190,
    period: "/month",
    description: "Full verification with impact analysis.",
    badge: "Recommended",
    features: [
      "Everything in Free, plus:",
      "Diff vs Claims — LLM gap detection",
      "Gap Analysis — find untested changes",
      "Contract Checker — API/frontend compatibility",
      "BYOLLM — use your own API key",
      "Webhook notifications (Slack/Discord)",
      "50 PRs/hour, 500 PRs/day",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    ctaHref: (annual) =>
      annual
        ? "/api/checkout?plan=pro&interval=annual"
        : "/api/checkout?plan=pro",
    highlighted: true,
  },
  {
    name: "Team",
    monthly: 49,
    annual: 490,
    period: "/month",
    description: "For teams managing agents at scale.",
    features: [
      "Everything in Pro, plus:",
      "Shared dashboard",
      "Custom scoring rules",
      "SSO / SAML",
      "Org-wide configuration",
      "200 PRs/hour, 2000 PRs/day",
      "Dedicated support",
    ],
    cta: "Start Team Trial",
    ctaHref: (annual) =>
      annual
        ? "/api/checkout?plan=team&interval=annual"
        : "/api/checkout?plan=team",
    highlighted: false,
  },
];

const COMPARISON_FEATURES: {
  name: string;
  free: string;
  pro: string;
  team: string;
}[] = [
  { name: "CI Bridge", free: "\u2705", pro: "\u2705", team: "\u2705" },
  { name: "Credential Scan", free: "\u2705", pro: "\u2705", team: "\u2705" },
  { name: "Test Execution", free: "\u2705", pro: "\u2705", team: "\u2705" },
  { name: "Coverage Mapper", free: "\u2705", pro: "\u2705", team: "\u2705" },
  {
    name: "Assertion Verifier",
    free: "\u2705",
    pro: "\u2705",
    team: "\u2705",
  },
  { name: "Plan Augmentor", free: "\u2705", pro: "\u2705", team: "\u2705" },
  { name: "Diff vs Claims", free: "\u2014", pro: "\u2705", team: "\u2705" },
  { name: "Gap Analysis", free: "\u2014", pro: "\u2705", team: "\u2705" },
  { name: "Contract Checker", free: "\u2014", pro: "\u2705", team: "\u2705" },
  { name: "BYOLLM", free: "\u2014", pro: "\u2705", team: "\u2705" },
  {
    name: "Webhook notifications",
    free: "\u2014",
    pro: "\u2705",
    team: "\u2705",
  },
  {
    name: "Custom scoring rules",
    free: "\u2014",
    pro: "\u2014",
    team: "\u2705",
  },
  { name: "SSO / SAML", free: "\u2014", pro: "\u2014", team: "\u2705" },
  { name: "Org-wide config", free: "\u2014", pro: "\u2014", team: "\u2705" },
  { name: "PRs per hour", free: "10", pro: "50", team: "200" },
  { name: "PRs per day", free: "50", pro: "500", team: "2,000" },
];

const FAQ_ITEMS = [
  {
    question: "How does billing work?",
    answer:
      "You're billed at the start of each billing cycle — monthly or annually. All charges go through Stripe. You'll receive an invoice by email for every payment.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel from your Stripe customer portal at any time. Your plan stays active until the end of the current billing period — no partial-month charges.",
  },
  {
    question: "What happens when I cancel?",
    answer:
      "Your account reverts to the Free tier at the end of your billing period. Pro-only signals (Diff, Gap, Contract Checker) stop running, but your repos stay connected and Free signals continue working.",
  },
  {
    question: "Do I get a refund?",
    answer:
      "We don't offer prorated refunds for unused time. If you cancel mid-cycle, you keep access until the period ends. If there's an issue, reach out — we'll work with you.",
  },
  {
    question: "How does BYOLLM billing work?",
    answer:
      "Vigil doesn't charge for LLM usage — you bring your own API key (OpenAI, Groq, or Ollama). LLM costs are typically less than $0.01 per PR using fast models like Groq's llama-3.3-70b.",
  },
  {
    question: "Can I change plans?",
    answer:
      "Yes. Upgrade or downgrade anytime from your Stripe portal. Upgrades take effect immediately with prorated billing. Downgrades apply at the next billing cycle.",
  },
  {
    question: "Is there an annual discount?",
    answer:
      "Yes. Annual billing saves you two months: Pro is $190/year (vs. $228 monthly) and Team is $490/year (vs. $588 monthly).",
  },
  {
    question: "Do I need a credit card for Free?",
    answer:
      "No. Install the GitHub App and start using Vigil immediately. No credit card, no trial expiration, no catch.",
  },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function BillingToggle({
  annual,
  onToggle,
}: {
  annual: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 mb-12 sm:mb-16">
      <span
        className={`text-sm font-medium transition-colors ${
          !annual ? "text-text-primary" : "text-text-muted"
        }`}
      >
        Monthly
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
        Annual
      </span>
      {annual && (
        <span className="text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
          Save up to $98
        </span>
      )}
    </div>
  );
}

function PricingCard({
  plan,
  annual,
}: {
  plan: Plan;
  annual: boolean;
}) {
  const price = plan.monthly === 0 ? 0 : annual ? plan.annual : plan.monthly;
  const displayPrice = price === 0 ? "$0" : `$${price}`;
  const period =
    price === 0 ? "forever" : annual ? "/year" : "/month";
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
        {plan.features.map((feature) => (
          <li
            key={feature}
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

function ComparisonTable() {
  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full min-w-[600px] bg-bg-surface rounded-[12px] overflow-hidden">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left text-sm font-medium text-text-primary px-6 py-4 w-[40%]">
              Feature
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
          {COMPARISON_FEATURES.map((row, i) => (
            <tr
              key={row.name}
              className={`border-b border-white/[0.06] last:border-b-0 ${
                i % 2 === 1 ? "bg-white/[0.015]" : ""
              }`}
            >
              <td className="text-sm text-text-secondary px-6 py-3.5">
                {row.name}
              </td>
              <td className="text-center text-sm px-4 py-3.5">{row.free}</td>
              <td className="text-center text-sm px-4 py-3.5">{row.pro}</td>
              <td className="text-center text-sm px-4 py-3.5">{row.team}</td>
            </tr>
          ))}
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

function PricingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  return (
    <div className="mx-auto max-w-[800px]">
      <ScrollReveal>
        <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary text-center mb-12 sm:mb-16">
          Billing questions
        </h2>
      </ScrollReveal>

      <ScrollReveal delay={100}>
        <div className="divide-y divide-white/[0.06]">
          {FAQ_ITEMS.map((item, i) => {
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

export function PricingPageClient() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="py-24 sm:py-32">
      {/* Header */}
      <div className="mx-auto max-w-[1200px] px-6">
        <ScrollReveal>
          <h1 className="text-3xl sm:text-5xl font-semibold leading-[1.15] text-text-primary text-center mb-4">
            Start free. Scale when you&apos;re ready.
          </h1>
          <p className="text-center text-text-secondary text-lg max-w-[560px] mx-auto mb-12 sm:mb-16">
            Every plan includes unlimited repos and unlimited PRs. Upgrade for deeper analysis.
          </p>
        </ScrollReveal>

        {/* Billing toggle */}
        <ScrollReveal delay={100}>
          <BillingToggle annual={annual} onToggle={() => setAnnual((a) => !a)} />
        </ScrollReveal>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[1000px] mx-auto">
          {PLANS.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={150 + i * 100}>
              <PricingCard plan={plan} annual={annual} />
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={500}>
          <p className="text-center text-xs text-text-muted mt-8 mb-0">
            All plans include unlimited PRs. BYOLLM means you control LLM costs
            &mdash; typically &lt; $0.01 per PR.
          </p>
        </ScrollReveal>
      </div>

      {/* Comparison table */}
      <div className="mx-auto max-w-[1200px] px-6 py-24 sm:py-32">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary text-center mb-12 sm:mb-16">
            Compare plans
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <ComparisonTable />
        </ScrollReveal>
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-[1200px] px-6">
        <PricingFaq />
      </div>
    </div>
  );
}
