import type { Metadata } from "next";
import { isValidLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { PricingPageClient } from "./pricing-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isValidLocale(localeParam) ? localeParam : "en";
  const dict = getDictionary(locale);

  const title = `${dict.pricing.title} | Vigil`;

  return {
    title,
    description: dict.pricing.subtitle,
    openGraph: {
      title,
      description: dict.pricing.subtitle,
      url: `https://keepvigil.dev/${locale}/pricing`,
      siteName: "Vigil",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description: dict.pricing.subtitle,
    },
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = isValidLocale(localeParam) ? localeParam : "en";
  const dict = getDictionary(locale);

  return <PricingPageClient dict={dict} />;
}
