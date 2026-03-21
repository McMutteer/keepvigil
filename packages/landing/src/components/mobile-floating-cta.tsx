"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/get-dictionary";

export function MobileFloatingCta({ dict }: { dict: Dictionary }) {
  const [visible, setVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Show after scrolling past the hero
    const handleScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Hide when footer is visible
    const footer = document.querySelector("footer");
    if (footer) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => setFooterVisible(entry.isIntersecting),
        { threshold: 0.1 }
      );
      observerRef.current.observe(footer);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observerRef.current?.disconnect();
    };
  }, []);

  if (!visible || footerVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden p-3 bg-gradient-to-t from-bg-deep via-bg-deep/95 to-transparent pt-8">
      <a
        href="https://github.com/apps/keepvigil"
        className="block text-center w-full px-4 py-3 rounded-[8px] text-sm font-semibold bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150 active:scale-[0.98] shadow-lg shadow-accent/20"
      >
        {dict.nav.installOnGithub} →
      </a>
    </div>
  );
}
