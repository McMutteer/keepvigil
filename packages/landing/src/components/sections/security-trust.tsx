import { ScrollReveal } from "../scroll-reveal";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";

export function SecurityTrust({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const t = dict.securityTrust;

  const badges = [
    { icon: "\ud83d\udd12", label: t.badges.dockerSandbox },
    { icon: "\ud83d\udee1\ufe0f", label: t.badges.noDataRetention },
    { icon: "\ud83d\udcdc", label: t.badges.mitLicensed },
    { icon: "\ud83c\udf0d", label: t.badges.euServers },
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-6">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-4">
              {t.title}
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-text-secondary max-w-[600px] mx-auto">
              {t.subtitle}
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {t.cards.map((card, i) => (
            <ScrollReveal key={i} delay={i * 100}>
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

        {/* Security badges */}
        <ScrollReveal delay={400}>
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {badges.map((badge) => (
              <span
                key={badge.label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-text-muted bg-bg-surface border border-white/[0.06]"
              >
                {badge.icon} {badge.label}
              </span>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={500}>
          <p className="text-center text-sm text-text-muted mt-6">
            {t.openSourceMit} &middot;{" "}
            <a
              href={`/${locale}/docs/security`}
              className="text-accent hover:underline underline-offset-4 transition-colors"
            >
              {t.securityDocsLink}
            </a>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
