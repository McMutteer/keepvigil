import { locales, isValidLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { LocaleProvider } from "@/i18n/locale-context";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = isValidLocale(localeParam) ? localeParam : "en";

  return (
    <LocaleProvider locale={locale}>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang="${locale}";`,
        }}
      />
      {children}
    </LocaleProvider>
  );
}
