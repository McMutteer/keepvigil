"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * A locale-aware Link wrapper for docs pages.
 * Automatically prefixes /docs/... hrefs with the current locale.
 */
export function DocsLink(props: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : "en";

  let href = props.href;
  if (typeof href === "string" && href.startsWith("/docs/")) {
    href = `/${locale}${href}`;
  }

  return <Link {...props} href={href} />;
}
