import Link from "next/link";
import { type NavItem } from "@/lib/docs-nav";

export function PrevNext({
  prev,
  next,
}: {
  prev: NavItem | null;
  next: NavItem | null;
}) {
  if (!prev && !next) return null;

  return (
    <div className="flex justify-between items-center mt-16 pt-6 border-t border-white/[0.06]">
      {prev ? (
        <Link
          href={prev.href}
          className="group flex flex-col gap-1 text-sm hover:text-accent transition-colors"
        >
          <span className="text-text-muted text-xs">← Previous</span>
          <span className="text-text-secondary group-hover:text-accent">
            {prev.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group flex flex-col gap-1 text-sm text-right hover:text-accent transition-colors"
        >
          <span className="text-text-muted text-xs">Next →</span>
          <span className="text-text-secondary group-hover:text-accent">
            {next.title}
          </span>
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
