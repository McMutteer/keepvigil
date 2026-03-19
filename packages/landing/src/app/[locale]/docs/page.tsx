import { redirect } from "next/navigation";
import { isValidLocale } from "@/i18n/config";

export default async function DocsIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const loc = isValidLocale(locale) ? locale : "en";
  redirect(`/${loc}/docs/getting-started`);
}
