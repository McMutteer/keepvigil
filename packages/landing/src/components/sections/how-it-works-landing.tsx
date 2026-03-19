import { ScrollReveal } from "../scroll-reveal";
import type { Dictionary } from "@/i18n/get-dictionary";

export function HowItWorksLanding({ dict }: { dict: Dictionary }) {
  const t = dict.howItWorks;

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary">
              {t.title}
            </h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {t.steps.map((step, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="bg-bg-surface border-subtle rounded-[12px] p-6 h-full">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[#080d1a] font-mono text-sm font-semibold mb-4">
                  {i + 1}
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
