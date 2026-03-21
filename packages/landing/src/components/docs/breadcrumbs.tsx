"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDocsNav, type NavItem } from "@/lib/docs-nav";

function findTitle(
  items: NavItem[],
  href: string
): string | null {
  for (const item of items) {
    if (item.href === href) return item.title;
    if (item.items) {
      const found = findTitle(item.items, href);
      if (found) return found;
    }
  }
  return null;
}

interface Crumb {
  label: string;
  href: string;
}

function buildCrumbs(pathname: string, locale: string): Crumb[] {
  const nav = getDocsNav(locale);
  const crumbs: Crumb[] = [
    { label: "Docs", href: `/${locale}/docs/getting-started` },
  ];

  // Check if we're in a signal subpage
  if (pathname.match(/\/docs\/signals\/.+/)) {
    crumbs.push({
      label: "Signals",
      href: `/${locale}/docs/signals`,
    });
  }

  // Find the current page title from nav
  const title = findTitle(nav, pathname);
  if (title) {
    crumbs.push({ label: title, href: pathname });
  }

  return crumbs;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : "en";

  // Don't show on docs index
  if (pathname === `/${locale}/docs` || pathname === `/${locale}/docs/getting-started`) {
    return null;
  }

  const crumbs = buildCrumbs(pathname, locale);

  if (crumbs.length <= 1) return null;

  return (
    <>
      <div className="bg-bg-deep/50 border-b border-white/[0.03] px-4 sm:px-6 lg:pl-[284px]">
        <nav
          aria-label="Breadcrumb"
          className="max-w-[720px] py-2"
        >
          <ol className="flex items-center gap-1.5 text-xs">
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <li key={crumb.href} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="text-text-muted" aria-hidden="true">
                      ›
                    </span>
                  )}
                  {isLast ? (
                    <span className="text-text-secondary">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-accent hover:text-accent-hover transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
      {/* Schema.org BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: crumbs.map((crumb, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: crumb.label,
              item: `https://keepvigil.dev${crumb.href}`,
            })),
          }),
        }}
      />
    </>
  );
}
