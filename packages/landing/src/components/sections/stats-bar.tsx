import { ScrollReveal } from "../scroll-reveal";
import type { Dictionary } from "@/i18n/get-dictionary";

export function StatsBar({ dict }: { dict: Dictionary }) {
  const t = dict.statsBar;
  const STATS = [
    { value: "2", label: t.verificationLayers },
    { value: "6", label: t.signalsPerPr },
    { value: "30s", label: t.setupTime },
    { value: "0", label: t.configRequired },
  ];

  return (
    <section className="py-12">
      <div className="mx-auto max-w-[1200px] px-6">
        <ScrollReveal>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`flex flex-col items-center py-4 ${
                  i < STATS.length - 1
                    ? "lg:border-r lg:border-white/[0.06]"
                    : ""
                } ${i < 2 ? "border-b border-white/[0.06] lg:border-b-0" : ""}`}
              >
                <span className="font-mono text-3xl font-semibold text-accent">
                  {stat.value}
                </span>
                <span className="mt-1 text-sm text-text-muted">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
