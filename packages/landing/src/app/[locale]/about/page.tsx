import type { Metadata } from "next";
import { isValidLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isValidLocale(localeParam) ? localeParam : "en";
  const dict = getDictionary(locale);

  return {
    title: dict.about.title,
    description: dict.about.description,
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = isValidLocale(localeParam) ? localeParam : "en";
  const dict = getDictionary(locale);
  const t = dict.about;

  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold text-text-primary mb-8">
        {t.title}
      </h1>

      <p className="text-text-secondary leading-relaxed mb-4">
        {t.intro}
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        {t.whatWeDoTitle}
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        {t.whatWeDo}
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        {t.howWereDifferentTitle}
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        {t.howWereDifferent}
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        {t.openSourceTitle}
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        {t.openSource}
      </p>

      <div className="mt-12 flex flex-wrap items-center gap-4">
        <a
          href="https://github.com/apps/keepvigil"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[6px] text-sm font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150 active:scale-[0.98]"
        >
          {t.installOnGithub}
        </a>
        <a
          href="https://github.com/McMutteer/keepvigil"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[6px] text-sm text-text-primary border border-white/[0.06] hover:bg-bg-elevated transition-colors duration-150"
        >
          {t.viewOnGithub}
        </a>
      </div>
    </div>
  );
}
