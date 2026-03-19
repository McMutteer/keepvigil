import type { Metadata } from "next";
import { ScrollReveal } from "@/components/scroll-reveal";

export const metadata: Metadata = {
  title: "Welcome to Vigil Pro! | Vigil",
  description:
    "Your account has been upgraded to Vigil Pro. All confidence signals are now active.",
  robots: { index: false },
};

const unlockedFeatures = [
  {
    name: "Diff vs Claims",
    description: "LLM gap detection between PR changes and test plan claims",
  },
  {
    name: "Gap Analysis",
    description: "Find changed files that no test plan item covers",
  },
  {
    name: "Contract Checker",
    description: "API and frontend compatibility verification",
  },
  {
    name: "BYOLLM",
    description: "Use your own OpenAI, Groq, or Ollama API key",
  },
  {
    name: "Webhook Notifications",
    description: "Real-time results to Slack or Discord",
  },
];

const nextSteps = [
  {
    step: 1,
    text: "Configure your LLM key in",
    code: ".vigil.yml",
    href: "/docs/byollm",
    linkText: "BYOLLM docs",
  },
  {
    step: 2,
    text: "Push a PR to any enabled repo",
    href: "/docs/getting-started",
    linkText: "Getting started",
  },
  {
    step: 3,
    text: "See the full confidence score with all 9 signals",
    href: "/docs/scoring",
    linkText: "Scoring guide",
  },
];

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 sm:py-24">
      {/* Success hero */}
      <ScrollReveal>
        <div className="text-center mb-16">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent/30 bg-accent/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10 text-accent"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-text-primary mb-3">
            Welcome to Vigil Pro!
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed">
            Your account has been upgraded. All signals are now active.
          </p>
        </div>
      </ScrollReveal>

      {/* What you unlocked */}
      <ScrollReveal delay={100}>
        <div className="mb-16">
          <h2 className="text-xl font-semibold text-text-primary mb-6 pb-2 border-b border-white/[0.06]">
            What you unlocked
          </h2>
          <ul className="space-y-4">
            {unlockedFeatures.map((feature) => (
              <li
                key={feature.name}
                className="flex items-start gap-3 rounded-lg bg-bg-surface p-4 border border-white/[0.06]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <div>
                  <span className="font-medium text-text-primary">
                    {feature.name}
                  </span>
                  <span className="text-text-secondary">
                    {" "}
                    &mdash; {feature.description}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </ScrollReveal>

      {/* Next steps */}
      <ScrollReveal delay={200}>
        <div className="mb-16">
          <h2 className="text-xl font-semibold text-text-primary mb-6 pb-2 border-b border-white/[0.06]">
            Next steps
          </h2>
          <ol className="space-y-5">
            {nextSteps.map(({ step, text, code, href, linkText }) => (
              <li key={step} className="flex items-start gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                  {step}
                </span>
                <p className="text-text-secondary leading-relaxed pt-0.5">
                  {text}
                  {code && (
                    <code className="mx-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-sm text-text-primary">
                      {code}
                    </code>
                  )}
                  <a
                    href={href}
                    className="ml-1 text-accent hover:underline underline-offset-2"
                  >
                    {linkText} &rarr;
                  </a>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </ScrollReveal>

      {/* Bottom links */}
      <ScrollReveal delay={300}>
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-white/[0.06]">
          <a
            href="/docs/getting-started"
            className="text-sm font-medium text-accent hover:underline underline-offset-2"
          >
            View documentation &rarr;
          </a>
          <a
            href="/"
            className="text-sm font-medium text-text-muted hover:text-text-secondary transition-colors duration-150"
          >
            Back to home &rarr;
          </a>
        </div>
      </ScrollReveal>
    </div>
  );
}
