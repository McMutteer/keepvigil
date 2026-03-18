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
      "Open a pull request. Any PR — from AI agents, teammates, or yourself. No test plan needed.",
  },
  {
    number: 3,
    title: "Get your score",
    description:
      "Vigil verifies claims, surfaces undocumented changes, and analyzes impact. Results appear directly on the PR.",
  },
];

export function HowItWorksLanding() {
  return (
    <section className="py-16 sm:py-20">
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
