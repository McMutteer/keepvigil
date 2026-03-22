import Image from "next/image";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";

export function Footer({
  dict,
  locale,
}: {
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.ctaFooter;

  return (
    <footer className="border-t border-white/[0.06] bg-[#060a14]">
      <div className="mx-auto max-w-[1200px] px-6 py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
          {/* Brand column */}
          <div className="col-span-2 sm:col-span-1">
            <a href={`/${locale}`} className="flex items-center gap-1.5 mb-3">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
                <Image
                  src="/brand/icon-cropped.svg"
                  alt="Vigil"
                  width={30}
                  height={30}
                  className="w-[30px] h-[30px]"
                />
              </div>
              <span className="text-xl font-semibold text-text-primary tracking-wider">
                vigil
              </span>
            </a>
            <p className="text-xs text-text-muted leading-relaxed">
              The verification layer for
              <br />
              AI-assisted development.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-primary mb-4">
              {t.footerProduct}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href={`/${locale}/docs/signals`}
                  className="text-text-muted hover:text-text-secondary transition-colors"
                >
                  {t.signals}
                </a>
              </li>
              <li>
                <a
                  href={`/${locale}/pricing`}
                  className="text-text-muted hover:text-text-secondary transition-colors"
                >
                  {t.pricing}
                </a>
              </li>
              <li>
                <a
                  href={`/${locale}/docs/changelog`}
                  className="text-text-muted hover:text-text-secondary transition-colors"
                >
                  {t.changelog}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/apps/keepvigil"
                  className="text-text-muted hover:text-text-secondary transition-colors"
                >
                  GitHub App
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
                <a
                  href={`/${locale}/docs/getting-started`}
                  className="text-text-muted hover:text-text-secondary transition-colors"
                >
                  {t.documentation}
                </a>
              </li>
              <li>
                <a
                  href={`/${locale}/blog`}
                  className="text-text-muted hover:text-text-secondary transition-colors"
                >
                  Blog
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

          {/* Company */}
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-text-primary mb-4">
              Company
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href={`/${locale}/about`}
                  className="text-text-muted hover:text-text-secondary transition-colors"
                >
                  {t.about}
                </a>
              </li>
              <li>
                <a
                  href={`/${locale}/privacy`}
                  className="text-text-muted hover:text-text-secondary transition-colors"
                >
                  {t.privacyPolicy}
                </a>
              </li>
              <li>
                <a
                  href={`/${locale}/terms`}
                  className="text-text-muted hover:text-text-secondary transition-colors"
                >
                  {t.termsOfService}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-xs text-text-muted">{t.copyright}</p>
          <p className="text-xs text-text-muted hidden sm:block">
            Made with vigilance.
          </p>
        </div>
      </div>
    </footer>
  );
}
