import { ScrollReveal } from "../scroll-reveal";
import type { Dictionary } from "@/i18n/get-dictionary";

export function Problem({ dict }: { dict: Dictionary }) {
  const t = dict.problem;

  return (
    <section className="py-16 sm:py-20">
      <ScrollReveal>
        <div className="mx-auto max-w-[720px] px-6 text-center">
          <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-6">
            {t.title1}
            <br />
            {t.title2}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-text-secondary max-w-[600px] mx-auto">
            {t.description}
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}
