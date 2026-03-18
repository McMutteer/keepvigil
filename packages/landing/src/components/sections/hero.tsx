import { ScoreCard } from "../score-card";

export function Hero() {
  return (
    <section className="min-h-[calc(100vh-64px)] flex items-center pt-16">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.05em] text-accent mb-4">
              Every PR gets verified. Every claim gets checked.
            </p>
            <h1 className="text-[32px] sm:text-[44px] lg:text-[56px] font-semibold leading-[1.1] text-text-primary mb-6">
              Verifies that your PR does what it says&nbsp;it&nbsp;does
            </h1>
            <p className="text-[17px] lg:text-xl leading-relaxed text-text-secondary max-w-[540px] mb-8">
              Install the GitHub App. Open a PR. Vigil reads your title and
              description, verifies each claim against the actual diff, and
              surfaces changes you didn&apos;t mention — so reviewers know
              exactly what&apos;s real.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/apps/keepvigil"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[6px] text-[15px] font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150 active:scale-[0.98]"
              >
                Install on GitHub
              </a>
              <a
                href="https://github.com/McMutteer/keepvigil"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[6px] text-[15px] text-text-primary border border-white/[0.06] hover:bg-bg-elevated transition-colors duration-150"
              >
                View on GitHub
              </a>
            </div>

            {/* Zero-friction trust badges */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-5 text-xs text-text-muted">
              <span>✓ Zero config</span>
              <span className="hidden sm:inline">·</span>
              <span>✓ No credit card</span>
              <span className="hidden sm:inline">·</span>
              <span>✓ 30-second install</span>
            </div>

            {/* See it live link */}
            <a
              href="https://github.com/McMutteer/siegekit/pull/5"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-accent hover:text-accent-hover transition-colors border-b border-accent/40 hover:border-accent pb-0.5"
            >
              See how Vigil verifies a real PR →
            </a>
          </div>

          {/* Score card column */}
          <div className="flex justify-center lg:justify-end">
            <ScoreCard />
          </div>
        </div>
      </div>
    </section>
  );
}
