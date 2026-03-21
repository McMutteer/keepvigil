import { isValidLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { Sidebar, MobileSidebar } from "@/components/docs/sidebar";
import { DocsNavbar } from "@/components/docs/docs-navbar";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";

export default async function DocsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = isValidLocale(localeParam) ? localeParam : "en";

  return (
    <>
      <DocsNavbar locale={locale} />
      <Breadcrumbs />
      <div className="flex min-h-screen pt-14">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[260px] shrink-0 border-r border-white/[0.06] sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <Sidebar />
        </aside>

        {/* Mobile sidebar */}
        <MobileSidebar />

        {/* Content */}
        <main className="flex-1 min-w-0 px-6 py-12 lg:px-16 animate-fade-in">
          <div className="max-w-[720px] mx-auto">{children}</div>
        </main>
      </div>
    </>
  );
}
