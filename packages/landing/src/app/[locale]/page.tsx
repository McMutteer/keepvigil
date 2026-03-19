import { isValidLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/sections/hero";
import { StatsBar } from "@/components/sections/stats-bar";
import { SocialProof } from "@/components/sections/social-proof";
import { Problem } from "@/components/sections/problem";
import { HowItWorksLanding } from "@/components/sections/how-it-works-landing";
import { Signals } from "@/components/sections/signals";
import { Evidence } from "@/components/sections/evidence";
import { SecurityTrust } from "@/components/sections/security-trust";
import { Faq } from "@/components/sections/faq";
import { CtaFooter } from "@/components/sections/cta-footer";

export default async function Home({
  params,
}: {
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
      <main id="main-content">
        <Hero dict={dict} />
        <StatsBar dict={dict} />
        <SocialProof dict={dict} />
        <Problem dict={dict} />
        <HowItWorksLanding dict={dict} />
        <Signals dict={dict} />
        <Evidence dict={dict} />
        <SecurityTrust dict={dict} locale={locale} />
        <Faq dict={dict} />
      </main>
      <CtaFooter dict={dict} locale={locale} />
    </>
  );
}
