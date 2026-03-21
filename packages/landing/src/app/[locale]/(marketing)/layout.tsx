import { isValidLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BackToTop } from "@/components/back-to-top";
import { MobileFloatingCta } from "@/components/mobile-floating-cta";

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = isValidLocale(localeParam) ? localeParam : "en";
  const dict = getDictionary(locale);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:p-4 focus:bg-accent focus:text-[#080d1a] focus:rounded-[6px] focus:m-2"
      >
        {dict.hero.skipToContent}
      </a>
      <Navbar locale={locale} dict={dict} />
      <main id="main-content" className="animate-fade-in">
        {children}
      </main>
      <Footer dict={dict} locale={locale} />
      <BackToTop />
      <MobileFloatingCta dict={dict} />
    </>
  );
}
