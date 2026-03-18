import { ScrollReveal } from "../scroll-reveal";

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

const CARDS = [
  {
    title: "See every line of code",
    description:
      "Vigil is open source. Read the code, audit the logic, verify the claims.",
    link: "Browse on GitHub →",
    href: "https://github.com/McMutteer/keepvigil",
  },
  {
    title: "Read a real PR review",
    description:
      "See exactly what Vigil posts on a pull request. No mock-ups, no demos.",
    link: "See PR #47 →",
    href: "https://github.com/McMutteer/keepvigil/pull/47",
  },
  {
    title: "Check our uptime",
    description:
      "Vigil runs on dedicated infrastructure. Check the health endpoint anytime.",
    link: "View status →",
    href: "https://keepvigil.dev/health",
  },
];

export function SocialProof() {
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
          {CARDS.map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 100}>
              <div className="rounded-[12px] bg-bg-surface p-6 h-full">
                <h3 className="text-base font-semibold text-text-secondary">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {card.description}
                </p>
                <a
                  href={card.href}
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
            We don&apos;t have a wall of logos yet. We have something better:
            radical transparency.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
