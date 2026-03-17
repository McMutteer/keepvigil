import { ScrollReveal } from "../scroll-reveal";

const STEPS = [
  {
    number: 1,
    title: "Install",
    description:
      "Add Vigil to your GitHub repos in one click. No code changes, no CI config, no setup.",
  },
  {
    number: 2,
    title: "Push a PR",
    description:
      "Your AI agent generates a PR with a test plan. Vigil intercepts automatically via webhook.",
  },
  {
    number: 3,
    title: "Get your score",
    description:
      "Vigil runs 7 signals, calculates a confidence score, and posts results directly on the PR.",
  },
];

export function HowItWorksLanding() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary">
              How it works
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STEPS.map((step, i) => (
            <ScrollReveal key={step.number} delay={i * 100}>
              <div className="bg-bg-surface border-subtle rounded-[12px] p-6 h-full">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[#080d1a] font-mono text-sm font-semibold mb-4">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {step.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
