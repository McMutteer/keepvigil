import { ScrollReveal } from "../scroll-reveal";

export function Problem() {
  return (
    <section className="py-16 sm:py-20">
      <ScrollReveal>
        <div className="mx-auto max-w-[720px] px-6 text-center">
          <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-6">
            Your PR says one thing.
            <br />
            The code says another.
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-text-secondary max-w-[600px] mx-auto">
            AI agents write PRs with confident descriptions — &ldquo;adds auth
            middleware,&rdquo; &ldquo;fixes the timeout bug,&rdquo; &ldquo;no
            breaking changes.&rdquo; But who actually checks? The PR says it
            adds auth — did it? The PR says no breaking changes — are there
            any? The gap between what a PR claims and what the code actually
            does grows with every merge.
          </p>
        </div>
      </ScrollReveal>
    </section>
  );
}
