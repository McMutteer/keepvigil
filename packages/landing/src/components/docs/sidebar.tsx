"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { getDocsNav, type NavItem } from "@/lib/docs-nav";

function NavLink({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const pathname = usePathname();
  const isActive = pathname === item.href;
  const hasChildren = item.items && item.items.length > 0;
  const isChildActive = hasChildren
    ? item.items!.some((child) => pathname === child.href)
    : false;
  const [expanded, setExpanded] = useState(isActive || isChildActive);

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={item.href}
          className={`flex-1 flex items-center gap-2 py-1.5 text-sm transition-colors duration-150 ${
            depth > 0 ? "pl-6" : ""
          } ${
            isActive
              ? "text-accent font-medium border-l-2 border-accent -ml-px pl-3"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {item.title}
          {item.badge && (
            <span className="text-[10px] font-medium uppercase tracking-[0.05em] text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
        </Link>
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-text-muted hover:text-text-primary text-xs"
            aria-label={expanded ? "Collapse section" : "Expand section"}
          >
            {expanded ? "▾" : "▸"}
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="mt-0.5">
          {item.items!.map((child) => (
            <NavLink key={child.href} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : "en";
  const nav = getDocsNav(locale);

  return (
    <nav className="flex flex-col h-full" aria-label="Documentation">
      <div className="p-4 border-b border-white/[0.06]">
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <Image
            src="/brand/icon.svg"
            alt="Vigil"
            width={24}
            height={24}
            className="w-6 h-6"
          />
          <span className="font-medium text-text-primary">vigil</span>
          <span className="text-xs text-text-muted">docs</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {nav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      <div className="p-4 border-t border-white/[0.06]">
        <a
          href="https://github.com/apps/keepvigil"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-[6px] text-xs font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors"
        >
          Install on GitHub
        </a>
      </div>
    </nav>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-[6px] bg-bg-surface border border-white/[0.06] text-text-primary"
        aria-label="Open navigation"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[280px] bg-bg-deep border-r border-white/[0.06] z-50 lg:hidden">
            <div className="flex justify-end p-3">
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary"
                aria-label="Close navigation"
              >
                ✕
              </button>
            </div>
            <Sidebar />
          </div>
        </>
      )}
    </>
  );
}
