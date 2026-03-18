import { ScrollReveal } from "../scroll-reveal";

const PLANS = [
  {
    name: "Free",
    price: "$0",
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
    ],
    cta: "Install Free",
    ctaHref: "https://github.com/apps/keepvigil",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
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
      "Priority support",
    ],
    cta: "Start Pro Trial",
    ctaHref: "https://keepvigil.dev/api/checkout?plan=pro",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/month",
    description: "For teams managing agents at scale.",
    features: [
      "Everything in Pro, plus:",
      "Shared dashboard",
      "Custom scoring rules",
      "SSO / SAML",
      "Org-wide configuration",
      "Dedicated support",
    ],
    cta: "Start Team Trial",
    ctaHref: "https://keepvigil.dev/api/checkout?plan=team",
    highlighted: false,
  },
];

function PricingCard({
  plan,
}: {
  plan: (typeof PLANS)[number];
}) {
  return (
    <div
      className={`bg-bg-surface rounded-[12px] p-8 flex flex-col ${
        plan.highlighted
          ? "border border-accent/30 relative"
          : "border-subtle"
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

      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-semibold text-text-primary font-mono">
          {plan.price}
        </span>
        <span className="text-sm text-text-muted">{plan.period}</span>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2.5 text-sm text-text-secondary"
          >
            <span className="text-text-muted mt-0.5 shrink-0">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <a
        href={plan.ctaHref}
        className={`w-full text-center py-3 rounded-[6px] text-sm font-medium transition-colors duration-150 active:scale-[0.98] ${
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

export function Pricing() {
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1000px] px-6">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary text-center mb-12 sm:mb-16">
            Start free. Scale when you&apos;re ready.
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 100}>
              <PricingCard plan={plan} />
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={400}>
          <p className="text-center text-xs text-text-muted mt-8">
            All plans include unlimited PRs. BYOLLM means you control LLM costs
            — typically &lt; $0.01 per PR.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
