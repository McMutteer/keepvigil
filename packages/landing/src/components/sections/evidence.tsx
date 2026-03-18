import { ScrollReveal } from "../scroll-reveal";

const CLAIMS = [
  {
    icon: "✅",
    text: '"Add rate limiting to API endpoints"',
    detail: "confirmed, rate-limiter.ts created",
    color: "text-success",
  },
  {
    icon: "✅",
    text: '"Add tests for rate limiter"',
    detail: "confirmed, rate-limiter.test.ts has 12 tests",
    color: "text-success",
  },
  {
    icon: "⚠️",
    text: '"No breaking changes"',
    detail: "GET /api/users response now includes rateLimit field",
    color: "text-warning",
  },
];

const UNDOCUMENTED = [
  {
    icon: "⚠️",
    text: "New dependency: ioredis",
    detail: "not mentioned in PR description",
    color: "text-warning",
  },
  {
    icon: "⚠️",
    text: "Environment variable added: REDIS_URL",
    detail: "not documented",
    color: "text-warning",
  },
];

const IMPACT = [
  {
    icon: "✅",
    text: "Credentials scan clean",
    detail: "",
    color: "text-success",
  },
  {
    icon: "⚠️",
    text: "Coverage gap",
    detail: "src/middleware/auth.ts modified but no test file covers it",
    color: "text-warning",
  },
  {
    icon: "✅",
    text: "No breaking API changes detected",
    detail: "",
    color: "text-success",
  },
];

function ResultRow({
  icon,
  text,
  detail,
  color,
}: {
  icon: string;
  text: string;
  detail: string;
  color: string;
}) {
  return (
    <p className={`text-[13px] ${color}`}>
      {icon} {text}
      {detail && (
        <span className="text-text-muted"> — {detail}</span>
      )}
    </p>
  );
}

export function Evidence() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-[900px] px-6">
        <ScrollReveal>
          <div className="text-center mb-4">
            <p className="text-xs font-medium uppercase tracking-[0.05em] text-accent mb-3">
              Example verification result
            </p>
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-4">
              This appears on every PR.
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-text-secondary max-w-[600px] mx-auto">
              No dashboard. No separate tool. The results live where you already
              work — right on the pull request.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="bg-bg-surface border-subtle rounded-[16px] p-5 sm:p-8 max-w-[800px] mx-auto">
            {/* Comment header */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.06]">
              <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-sm">
                🛡️
              </div>
              <span className="font-medium text-sm text-text-primary">
                vigil
              </span>
              <span className="text-xs text-text-muted">bot</span>
            </div>

            {/* Score header */}
            <div className="mb-6">
              <p className="text-lg sm:text-xl font-semibold text-text-primary">
                🛡️ Vigil — PR Verification:{" "}
                <span className="text-accent">82/100</span>
              </p>
            </div>

            {/* Claims section */}
            <div className="mb-5">
              <p className="text-sm font-semibold text-text-primary mb-2">
                Claims
              </p>
              <div className="space-y-1.5 pl-1">
                {CLAIMS.map((row) => (
                  <ResultRow key={row.text} {...row} />
                ))}
              </div>
            </div>

            {/* Undocumented Changes section */}
            <div className="mb-5">
              <p className="text-sm font-semibold text-text-primary mb-2">
                Undocumented Changes
              </p>
              <div className="space-y-1.5 pl-1">
                {UNDOCUMENTED.map((row) => (
                  <ResultRow key={row.text} {...row} />
                ))}
              </div>
            </div>

            {/* Impact section */}
            <div className="mb-5">
              <p className="text-sm font-semibold text-text-primary mb-2">
                Impact
              </p>
              <div className="space-y-1.5 pl-1">
                {IMPACT.map((row) => (
                  <ResultRow key={row.text} {...row} />
                ))}
              </div>
            </div>

            {/* Score footer */}
            <div className="pt-4 border-t border-white/[0.06]">
              <p className="text-sm font-mono text-text-secondary">
                Score: <span className="text-accent font-semibold">82/100</span>{" "}
                — Review recommended
              </p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={400}>
          <p className="text-center text-sm mt-8">
            <a
              href="https://github.com/McMutteer/keepvigil/pull/47"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover transition-colors"
            >
              See a real result on GitHub →
            </a>
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
