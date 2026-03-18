import { ScrollReveal } from "../scroll-reveal";

const BEFORE_ITEMS = [
  "Function exists in auth.ts",
  "Route handler is exported",
  "Config file has JWT section",
  "Middleware is imported",
  "Error type is defined",
  "Test file exists",
];

const AFTER_ITEMS = [
  "validateToken returns error for expired JWTs",
  "Route handler calls validateToken before DB query",
  "Frontend sends token in Authorization header",
  "Backend reads from same header name",
  "Missing token returns 401, not 500",
  "Expired token returns 401 with 'expired' message",
];

export function TestPlansPreview() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-4">
              Better descriptions. Better verification.
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-text-secondary max-w-[720px] mx-auto">
              The quality of your verification depends on what you describe in
              your PR.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Before card */}
          <ScrollReveal delay={0}>
            <div className="bg-bg-surface border-subtle rounded-[16px] p-6 sm:p-8 h-full">
              <p className="text-sm font-medium text-failure mb-5">
                Existence-only plan
              </p>
              <ul className="space-y-3 mb-6">
                {BEFORE_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-white/[0.12]" />
                    <span className="text-sm text-text-secondary">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-white/[0.06] pt-4">
                <p className="text-xs font-mono text-text-muted">
                  6/6 passed &middot; Score: 70 &middot;{" "}
                  <span className="text-failure">Bug shipped</span>
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* After card */}
          <ScrollReveal delay={150}>
            <div className="bg-bg-surface rounded-[16px] p-6 sm:p-8 h-full border border-accent/20">
              <p className="text-sm font-medium text-success mb-5">
                Multi-category plan
              </p>
              <ul className="space-y-3 mb-6">
                {AFTER_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-white/[0.12]" />
                    <span className="text-sm text-text-secondary">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-white/[0.06] pt-4">
                <p className="text-xs font-mono text-text-muted">
                  5/6 passed &middot; Score: 85 &middot;{" "}
                  <span className="text-success">Bug caught before merge</span>
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={300}>
          <p className="text-center mt-8">
            <a
              href="/docs/writing-test-plans"
              className="text-sm text-accent hover:underline underline-offset-4 transition-colors"
            >
              Read the full guide &rarr;
            </a>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
