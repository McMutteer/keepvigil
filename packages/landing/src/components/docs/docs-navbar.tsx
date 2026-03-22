"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";

function LanguageSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname();
  const otherLocale = locale === "en" ? "es" : "en";
  const newPath = pathname.replace(`/${locale}`, `/${otherLocale}`) || `/${otherLocale}`;

  return (
    <Link
      href={newPath}
      className="px-2 py-1 text-xs font-medium text-text-muted hover:text-text-primary transition-colors duration-150 border border-white/[0.06] rounded-[4px]"
      aria-label={locale === "en" ? "Cambiar a español" : "Switch to English"}
    >
      {locale === "en" ? "ES" : "EN"}
    </Link>
  );
}

export function DocsNavbar({ locale }: { locale: Locale }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      aria-label="Docs navigation"
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
        scrolled
          ? "bg-bg-deep/80 backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-bg-deep border-b border-white/[0.06]"
      }`}
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Logo + Docs */}
        <div className="flex items-center gap-3">
          <Link href={`/${locale}`} className="flex items-center gap-2.5">
            <Image
              src="/brand/icon.svg"
              alt="Vigil"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="font-semibold text-lg text-text-primary tracking-wider">vigil</span>
          </Link>
          <span className="text-text-muted text-lg">│</span>
          <span className="text-sm text-text-secondary font-medium">
            Documentation
          </span>
        </div>

        {/* Right: Back to site + language + GitHub + CTA */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href={`/${locale}`}
            className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            ← Back to site
          </Link>
          <LanguageSwitcher locale={locale} />
          <a
            href="https://github.com/McMutteer/keepvigil"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:block p-1.5 text-text-secondary hover:text-text-primary transition-colors duration-150"
            aria-label="GitHub"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          <a
            href="https://github.com/apps/keepvigil"
            className="inline-flex items-center px-3 py-1.5 rounded-[6px] text-xs sm:text-sm font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150"
          >
            Install
          </a>
        </div>
      </div>
    </nav>
  );
}
