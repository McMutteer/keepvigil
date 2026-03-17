import { type ReactNode } from "react";

const VARIANTS = {
  info: {
    icon: "💡",
    border: "border-l-info",
  },
  warning: {
    icon: "⚠️",
    border: "border-l-warning",
  },
  security: {
    icon: "🔒",
    border: "border-l-failure",
  },
  pro: {
    icon: "✨",
    border: "border-l-accent",
  },
} as const;

export function Callout({
  variant = "info",
  title,
  children,
}: {
  variant?: keyof typeof VARIANTS;
  title?: string;
  children: ReactNode;
}) {
  const { icon, border } = VARIANTS[variant];

  return (
    <div
      className={`bg-bg-surface rounded-r-[8px] border-l-4 ${border} p-4 my-4`}
    >
      <div className="flex gap-3">
        <span className="text-base shrink-0">{icon}</span>
        <div className="text-sm text-text-secondary leading-relaxed">
          {title && (
            <p className="font-medium text-text-primary mb-1">{title}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
