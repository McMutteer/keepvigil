import { isValidLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { Hero } from "@/components/sections/hero";
import { StatsBar } from "@/components/sections/stats-bar";
import { SocialProof } from "@/components/sections/social-proof";
import { Problem } from "@/components/sections/problem";
import { HowItWorksLanding } from "@/components/sections/how-it-works-landing";
import { Signals } from "@/components/sections/signals";
import { Evidence } from "@/components/sections/evidence";
import { SecurityTrust } from "@/components/sections/security-trust";
import { Faq } from "@/components/sections/faq";

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
      <Hero dict={dict} />
      <StatsBar dict={dict} />
      <SocialProof dict={dict} />
      <Problem dict={dict} />
      <HowItWorksLanding dict={dict} />
      <Signals dict={dict} />
      <Evidence dict={dict} />
      <SecurityTrust dict={dict} locale={locale} />
      <Faq dict={dict} />
    </>
  );
}
