import { ScrollReveal } from "../scroll-reveal";

const TRUST_CARDS = [
  {
    icon: "🔒",
    title: "Sandboxed Execution",
    description:
      "All commands run in Docker containers with --network none. No internet access, no host access, no secrets exposed.",
  },
  {
    icon: "🛡️",
    title: "No Data Retention",
    description:
      "Vigil reads your PR, runs the analysis, posts the results, and forgets. No code is stored on our servers.",
  },
  {
    icon: "🔐",
    title: "Fork PR Protection",
    description:
      "Fork PRs read configuration from your default branch, not from the fork. Untrusted contributors can\u2019t inject malicious config.",
  },
];

export function SecurityTrust() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-4">
              Your code stays safe.
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-text-secondary max-w-[600px] mx-auto">
              Security isn&apos;t an afterthought. Vigil was built from the
              ground up to keep your code and secrets protected.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TRUST_CARDS.map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 100}>
              <div className="bg-bg-surface border-subtle rounded-[12px] p-6 h-full">
                <span className="text-2xl block mb-4">{card.icon}</span>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {card.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={400}>
          <p className="text-center text-sm text-text-muted mt-8">
            Open source under MIT &middot;{" "}
            <a
              href="/docs/security"
              className="text-accent hover:underline underline-offset-4 transition-colors"
            >
              Read our security docs &rarr;
            </a>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
