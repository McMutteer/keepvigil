"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const productLinks = [
  { label: "Signals Overview", href: "/docs/signals" },
  { label: "How It Works", href: "/docs/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/docs/changelog" },
];

const docsLinks = [
  { label: "Getting Started", href: "/docs/getting-started" },
  { label: "Configuration", href: "/docs/configuration" },
  { label: "BYOLLM", href: "/docs/byollm" },
  { label: "Shell Allowlist", href: "/docs/shell-allowlist" },
  { label: "Security", href: "/docs/security" },
];

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

function GitHubIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function Dropdown({
  label,
  items,
}: {
  label: string;
  items: { label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        className="flex items-center gap-1 px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
        aria-expanded={open}
      >
        {label}
        <ChevronDown
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 pt-1">
          <div className="min-w-[200px] bg-bg-surface border border-white/[0.06] rounded-[12px] shadow-lg py-1.5 overflow-hidden">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block py-2 px-4 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors duration-150"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
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

  return (
    <>
      <nav
        aria-label="Main"
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-150 ${
          scrolled
            ? "bg-bg-deep/80 backdrop-blur-md border-b border-white/[0.06]"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-[1200px] px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/brand/icon.svg"
              alt="Vigil"
              width={28}
              height={28}
              className="w-7 h-7"
            />
            <span className="font-medium text-lg text-text-primary tracking-wide">
              vigil
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            <Dropdown label="Product" items={productLinks} />
            <Dropdown label="Docs" items={docsLinks} />
            <Link
              href="/about"
              className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              About
            </Link>
          </div>

          {/* Desktop right */}
          <div className="hidden sm:flex items-center gap-3">
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
              Install on GitHub
            </a>
          </div>

          {/* Mobile: CTA + hamburger */}
          <div className="flex sm:hidden items-center gap-3">
            <a
              href="https://github.com/apps/keepvigil"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150 active:scale-[0.98]"
            >
              Install on GitHub
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
            {/* Close button */}
            <div className="flex justify-end p-4">
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

            <div className="px-4 pb-8 space-y-6">
              {/* Product group */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2 px-2">
                  Product
                </p>
                <div className="space-y-0.5">
                  {productLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Documentation group */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2 px-2">
                  Documentation
                </p>
                <div className="space-y-0.5">
                  {docsLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Standalone links */}
              <div className="space-y-0.5">
                <Link
                  href="/about"
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                >
                  About
                </Link>
                <a
                  href="https://github.com/McMutteer/keepvigil"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 py-2 px-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 rounded-md hover:bg-bg-elevated"
                >
                  <GitHubIcon />
                  GitHub
                </a>
              </div>

              {/* CTA */}
              <a
                href="https://github.com/apps/keepvigil"
                className="block text-center px-4 py-2.5 rounded-[6px] text-sm font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150 active:scale-[0.98]"
              >
                Install on GitHub
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
