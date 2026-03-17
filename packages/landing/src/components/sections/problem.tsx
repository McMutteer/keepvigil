import { ScrollReveal } from "../scroll-reveal";

export function Problem() {
  return (
    <section className="py-24 sm:py-32">
      <ScrollReveal>
        <div className="mx-auto max-w-[720px] px-6 text-center">
          <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-6">
            Your AI agent writes beautiful test plans.
            <br />
            You never run them.
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-text-secondary max-w-[600px] mx-auto">
            Claude Code, Cursor, Copilot — they generate PRs with twelve-point
            test plans, each checkbox a promise of quality. You skim them. You
            approve. You merge. Not because you&apos;re careless — because
            there&apos;s no easy way to verify. The gap between what your agent
            promised and what actually got tested grows with every PR.
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}
