import { ScrollReveal } from "../scroll-reveal";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "All 8 signals, zero config.",
    features: [
      "All 8 verification signals included",
      "PR at a Glance \u2014 instant PR summary",
      "Risk Assessment \u2014 flag high-risk changes",
      "Description Generator \u2014 auto-generate missing descriptions",
      "Unlimited repos and PRs",
    ],
    cta: "Install Free",
    ctaHref: "https://github.com/apps/keepvigil",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/dev/month",
    description: "Inline comments and automation.",
    badge: "Recommended",
    features: [
      "Everything in Free, plus:",
      "Inline review comments on diff lines",
      "Auto-approve for high-confidence PRs",
      "Webhook notifications (Slack/Discord)",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    ctaHref: "https://keepvigil.dev/api/checkout?plan=pro",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$24",
    period: "/dev/month",
    description: "For teams managing agents at scale.",
    features: [
      "Everything in Pro, plus:",
      "Dashboard \u2014 PR history, scores, team metrics",
      "@vigil commands \u2014 explain, verify, recheck, ignore",
      "Repo memory \u2014 persistent ignore rules",
      "Custom scoring rules",
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
            All plans include all 8 signals and unlimited repos. No credit card
            required for the Free tier.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
