import { ScrollReveal } from "../scroll-reveal";

const STATS = [
  { value: "9", label: "Independent Signals" },
  { value: "72%", label: "Of AI test plans go unverified" },
  { value: "30s", label: "Setup Time" },
  { value: "0", label: "Config Required" },
];

export function StatsBar() {
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
