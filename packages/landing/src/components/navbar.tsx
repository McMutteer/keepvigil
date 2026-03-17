"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      aria-label="Main"
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-150 ${
        scrolled
          ? "bg-bg-deep/80 backdrop-blur-md border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-[1200px] px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5">
          <Image
            src="/brand/icon.svg"
            alt=""
            width={28}
            height={28}
            className="w-7 h-7"
          />
          <span className="font-medium text-lg text-text-primary tracking-wide">
            vigil
          </span>
        </a>

        <div className="flex items-center gap-3">
          <a
            href="/pricing"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            Pricing
          </a>
          <a
            href="/docs/getting-started"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            Docs
          </a>
          <a
            href="/about"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            About
          </a>
          <a
            href="https://github.com/McMutteer/keepvigil"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm text-text-primary border border-white/[0.06] hover:bg-bg-elevated transition-colors duration-150"
          >
            GitHub
          </a>
          <a
            href="https://github.com/apps/keepvigil"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150 active:scale-[0.98]"
          >
            Install on GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
