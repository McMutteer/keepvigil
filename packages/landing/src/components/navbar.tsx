"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";
import { usePathname } from "next/navigation";

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className={className}
    >
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GitHubIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  function getAlternateHref(): string {
    const otherLocale = locale === "en" ? "es" : "en";
    const newPath = pathname.replace(`/${locale}`, `/${otherLocale}`);
    return newPath || `/${otherLocale}`;
  }

  return (
    <Link
      href={getAlternateHref()}
      className="px-2 py-1 text-xs font-medium text-text-muted hover:text-text-primary transition-colors duration-150 border border-white/[0.06] rounded-[4px]"
      aria-label={locale === "en" ? "Cambiar a español" : "Switch to English"}
    >
      {locale === "en" ? "ES" : "EN"}
    </Link>
  );
}

function MegaDropdown({
  id,
  label,
  isActive,
  openId,
  onOpen,
  onClose,
  closeTimeoutRef,
  children,
}: {
  id: string;
  label: string;
  isActive: boolean;
  openId: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
  closeTimeoutRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
  children: React.ReactNode;
}) {
  const open = openId === id;

  const handleEnter = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    onOpen(id);
  }, [id, onOpen, closeTimeoutRef]);

  const handleLeave = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => onClose(), 150);
  }, [onClose, closeTimeoutRef]);

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors duration-150 ${
          isActive
            ? "text-accent"
            : "text-text-secondary hover:text-text-primary"
        }`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
          <div className="bg-bg-surface border border-white/[0.08] rounded-[12px] shadow-xl shadow-black/20 overflow-hidden">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function NavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm transition-colors duration-150 ${
        isActive
          ? "text-accent border-b-2 border-accent"
          : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </Link>
  );
}

export function Navbar({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const t = dict.nav;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isProductActive =
    pathname.includes("/docs/signals") ||
    pathname.includes("/docs/how-it-works") ||
    pathname.includes("/docs/scoring") ||
    pathname.includes("/docs/changelog");
  const isDocsActive =
    pathname.includes("/docs/") && !isProductActive;
  const isPricingActive = pathname.includes("/pricing");
  const isAboutActive = pathname.includes("/about");
  const isBlogActive = pathname.includes("/blog");

  return (
    <>
      <nav
        aria-label="Main"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? "bg-bg-deep/80 backdrop-blur-xl border-b border-white/[0.06]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-[1200px] px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Image
                src="/brand/icon-cropped.svg"
                alt="Vigil"
                width={38}
                height={38}
                className="w-[38px] h-[38px]"
              />
            </div>
            <span className="font-semibold text-[28px] text-text-primary tracking-wider">
              vigil
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            {/* Product mega-dropdown */}
            <MegaDropdown id="product" label={t.product} isActive={isProductActive} openId={openDropdown} onOpen={setOpenDropdown} onClose={() => setOpenDropdown(null)} closeTimeoutRef={dropdownTimeoutRef}>
              <div className="flex gap-0 p-4 min-w-[480px]">
                <div className="flex-1 pr-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[1px] text-accent mb-2.5">
                    Verification
                  </p>
                  <div className="space-y-1">
                    <Link
                      href={`/${locale}/docs/signals/credential-scan`}
                      className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      🔍 Claims Verifier
                      <span className="block text-[11px] text-text-muted">
                        Verify PR claims against diff
                      </span>
                    </Link>
                    <Link
                      href={`/${locale}/docs/signals`}
                      className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      📋 Undocumented Changes
                      <span className="block text-[11px] text-text-muted">
                        Surface hidden changes
                      </span>
                    </Link>
                    <Link
                      href={`/${locale}/docs/signals/credential-scan`}
                      className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      🔑 Credential Scan
                      <span className="block text-[11px] text-text-muted">
                        Detect leaked secrets
                      </span>
                    </Link>
                  </div>
                </div>
                <div className="flex-1 border-l border-white/[0.06] pl-4 pr-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[1px] text-accent mb-2.5">
                    Analysis
                  </p>
                  <div className="space-y-1">
                    <Link
                      href={`/${locale}/docs/signals/coverage-mapper`}
                      className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      📊 Coverage Mapper
                      <span className="block text-[11px] text-text-muted">
                        Map test coverage
                      </span>
                    </Link>
                    <Link
                      href={`/${locale}/docs/signals/contract-checker`}
                      className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      📝 Contract Checker
                      <span className="block text-[11px] text-text-muted">
                        API contract changes
                      </span>
                    </Link>
                    <Link
                      href={`/${locale}/docs/signals/diff-analysis`}
                      className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      🔬 Diff Analyzer
                      <span className="block text-[11px] text-text-muted">
                        Deep diff analysis
                      </span>
                    </Link>
                  </div>
                </div>
                <div className="flex-1 border-l border-white/[0.06] pl-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[1px] text-accent mb-2.5">
                    Learn
                  </p>
                  <div className="space-y-1">
                    <Link
                      href={`/${locale}/docs/how-it-works`}
                      className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {t.productLinks.howItWorks}
                    </Link>
                    <Link
                      href={`/${locale}/docs/scoring`}
                      className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Confidence Score
                    </Link>
                    <Link
                      href={`/${locale}/docs/changelog`}
                      className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {t.productLinks.changelog}
                    </Link>
                  </div>
                </div>
              </div>
            </MegaDropdown>

            {/* Docs dropdown */}
            <MegaDropdown id="docs" label={t.docs} isActive={isDocsActive} openId={openDropdown} onOpen={setOpenDropdown} onClose={() => setOpenDropdown(null)} closeTimeoutRef={dropdownTimeoutRef}>
              <div className="flex gap-0 p-4 min-w-[340px]">
                <div className="flex-1 pr-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[1px] text-accent mb-2.5">
                    Guides
                  </p>
                  <div className="space-y-1">
                    <Link
                      href={`/${locale}/docs/getting-started`}
                      className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {t.docsLinks.gettingStarted}
                      <span className="block text-[11px] text-text-muted">
                        Install and first PR
                      </span>
                    </Link>
                    <Link
                      href={`/${locale}/docs/configuration`}
                      className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {t.docsLinks.configuration}
                      <span className="block text-[11px] text-text-muted">
                        Customize .vigil.yml
                      </span>
                    </Link>
                  </div>
                </div>
                <div className="flex-1 border-l border-white/[0.06] pl-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[1px] text-accent mb-2.5">
                    Reference
                  </p>
                  <div className="space-y-1">
                    <Link
                      href={`/${locale}/docs/signals`}
                      className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Signals
                      <span className="block text-[11px] text-text-muted">
                        All 8 verification signals
                      </span>
                    </Link>
                    <Link
                      href={`/${locale}/docs/security`}
                      className="block py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {t.docsLinks.security}
                      <span className="block text-[11px] text-text-muted">
                        Data handling and privacy
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </MegaDropdown>

            <NavLink href={`/${locale}/pricing`} isActive={isPricingActive}>
              {t.productLinks.pricing}
            </NavLink>
            <NavLink href={`/${locale}/about`} isActive={isAboutActive}>
              {t.about}
            </NavLink>
            <NavLink href={`/${locale}/blog`} isActive={isBlogActive}>
              {t.blog}
            </NavLink>
          </div>

          {/* Desktop right */}
          <div className="hidden sm:flex items-center gap-3">
            <LanguageSwitcher locale={locale} />
            <a
              href="/dashboard"
              className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              {t.dashboard}
            </a>
            <a
              href="https://github.com/McMutteer/keepvigil"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-text-secondary hover:text-text-primary transition-colors duration-150"
              aria-label="GitHub"
            >
              <GitHubIcon />
            </a>
            <a
              href="https://github.com/apps/keepvigil"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150 active:scale-[0.98]"
            >
              {t.installOnGithub}
            </a>
          </div>

          {/* Mobile: CTA + hamburger */}
          <div className="flex sm:hidden items-center gap-3">
            <LanguageSwitcher locale={locale} />
            <a
              href="https://github.com/apps/keepvigil"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150 active:scale-[0.98]"
            >
              {t.installOnGithub}
            </a>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-2 text-text-secondary hover:text-text-primary transition-colors duration-150"
              aria-label="Open menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay + panel */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over panel */}
          <div className="absolute top-0 right-0 bottom-0 w-[280px] bg-bg-deep overflow-y-auto">
            {/* Header with close */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <Link
                href={`/${locale}`}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-1.5"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <Image
                    src="/brand/icon-cropped.svg"
                    alt="Vigil"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <span className="font-semibold text-2xl text-text-primary tracking-wider">vigil</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors duration-150"
                aria-label="Close menu"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-4 pb-8 pt-4 space-y-6">
              {/* Product group */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[1px] text-accent mb-2 px-2">
                  {t.product}
                </p>
                <div className="space-y-0.5">
                  <Link
                    href={`/${locale}/docs/signals`}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                  >
                    {t.productLinks.signalsOverview}
                  </Link>
                  <Link
                    href={`/${locale}/docs/how-it-works`}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                  >
                    {t.productLinks.howItWorks}
                  </Link>
                  <Link
                    href={`/${locale}/docs/scoring`}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                  >
                    Confidence Score
                  </Link>
                  <Link
                    href={`/${locale}/docs/changelog`}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                  >
                    {t.productLinks.changelog}
                  </Link>
                </div>
              </div>

              {/* Resources group */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[1px] text-accent mb-2 px-2">
                  Resources
                </p>
                <div className="space-y-0.5">
                  <Link
                    href={`/${locale}/docs/getting-started`}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                  >
                    {t.docsLinks.gettingStarted}
                  </Link>
                  <Link
                    href={`/${locale}/docs/configuration`}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                  >
                    {t.docsLinks.configuration}
                  </Link>
                  <Link
                    href={`/${locale}/blog`}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                  >
                    {t.blog}
                  </Link>
                </div>
              </div>

              {/* Standalone links */}
              <div className="border-t border-white/[0.06] pt-4 space-y-0.5">
                <Link
                  href={`/${locale}/pricing`}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                >
                  {t.productLinks.pricing}
                </Link>
                <Link
                  href={`/${locale}/about`}
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                >
                  {t.about}
                </Link>
                <a
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                >
                  {t.dashboard}
                </a>
                <a
                  href="https://github.com/McMutteer/keepvigil"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                >
                  <GitHubIcon size={16} />
                  GitHub
                </a>
              </div>

              {/* CTA */}
              <a
                href="https://github.com/apps/keepvigil"
                className="block text-center px-4 py-2.5 rounded-[6px] text-sm font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150 active:scale-[0.98]"
              >
                {t.installOnGithub}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
