import { ScrollReveal } from "../scroll-reveal";
import type { Dictionary } from "@/i18n/get-dictionary";

const BADGES = [
  {
    src: "https://img.shields.io/github/stars/McMutteer/keepvigil?style=flat&color=e8a820&labelColor=0f1729",
    alt: "GitHub stars",
  },
  {
    src: "https://img.shields.io/badge/license-MIT-e8a820?labelColor=0f1729",
    alt: "MIT License",
  },
  {
    src: "https://img.shields.io/github/actions/workflow/status/McMutteer/keepvigil/ci.yml?label=build&color=22c55e&labelColor=0f1729",
    alt: "Build status",
  },
];

const CARD_HREFS = [
  "https://github.com/McMutteer/keepvigil",
  "https://github.com/McMutteer/keepvigil/pull/47",
  "https://keepvigil.dev/health",
];

export function SocialProof({ dict }: { dict: Dictionary }) {
  const t = dict.socialProof;

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        {/* GitHub badges */}
        <ScrollReveal>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {BADGES.map((badge) => (
              <img
                key={badge.alt}
                src={badge.src}
                alt={badge.alt}
                className="h-5"
              />
            ))}
          </div>
        </ScrollReveal>

        {/* Transparency cards */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.cards.map((card, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="rounded-[12px] bg-bg-surface p-6 h-full">
                <h3 className="text-base font-semibold text-text-secondary">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {card.description}
                </p>
                <a
                  href={CARD_HREFS[i]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
                >
                  {card.link}
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Tagline */}
        <ScrollReveal delay={400}>
          <p className="mt-10 text-center text-sm text-text-muted">
            {t.tagline}
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
