import Image from "next/image";
import { ScrollReveal } from "../scroll-reveal";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";

export function CtaFooter({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const t = dict.ctaFooter;

  return (
    <>
      {/* Final CTA band */}
      <section className="bg-bg-surface py-16 sm:py-20">
        <ScrollReveal>
          <div className="mx-auto max-w-[600px] px-6 text-center">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-4">
              {t.title}
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-text-secondary mb-8">
              {t.subtitle}
            </p>
            <a
              href="https://github.com/apps/keepvigil"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-[6px] text-[15px] font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150 active:scale-[0.98]"
            >
              {t.installOnGithub}
            </a>

          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-12 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
            {/* Logo column */}
            <div className="col-span-2 sm:col-span-1">
              <a href={`/${locale}`} className="flex items-center gap-2 mb-4">
                <Image
                  src="/brand/icon.svg"
                  alt="Vigil"
                  width={20}
                  height={20}
                  className="w-5 h-5 opacity-60"
                />
                <span className="text-sm text-text-muted">vigil</span>
              </a>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-primary mb-4">
                {t.footerProduct}
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href={`/${locale}#signals`} className="text-text-muted hover:text-text-secondary transition-colors">
                    {t.signals}
                  </a>
                </li>
                <li>
                  <a href={`/${locale}/pricing`} className="text-text-muted hover:text-text-secondary transition-colors">
                    {t.pricing}
                  </a>
                </li>
                <li>
                  <a href={`/${locale}/docs/security`} className="text-text-muted hover:text-text-secondary transition-colors">
                    {t.security}
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-primary mb-4">
                {t.footerResources}
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href={`/${locale}/docs/getting-started`} className="text-text-muted hover:text-text-secondary transition-colors">
                    {t.documentation}
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/McMutteer/keepvigil"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {t.github}
                  </a>
                </li>
                <li>
                  <a href={`/${locale}/about`} className="text-text-muted hover:text-text-secondary transition-colors">
                    {t.about}
                  </a>
                </li>
                <li>
                  <a href={`/${locale}/blog`} className="text-text-muted hover:text-text-secondary transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href={`/${locale}/docs/changelog`} className="text-text-muted hover:text-text-secondary transition-colors">
                    {t.changelog}
                  </a>
                </li>
                <li>
                  <a
                    href="https://keepvigil.dev/health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {t.status}
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-primary mb-4">
                {t.footerLegal}
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href={`/${locale}/privacy`} className="text-text-muted hover:text-text-secondary transition-colors">
                    {t.privacyPolicy}
                  </a>
                </li>
                <li>
                  <a href={`/${locale}/terms`} className="text-text-muted hover:text-text-secondary transition-colors">
                    {t.termsOfService}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/[0.06]">
            <p className="text-xs text-text-muted">
              {t.copyright}
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
