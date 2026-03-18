import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Vigil",
  description: "Vigil verifies that pull requests do what they claim. The silent verifier for any PR.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold text-text-primary mb-8">
        About Vigil
      </h1>

      <p className="text-text-secondary leading-relaxed mb-4">
        AI agents and developers write PRs with confident descriptions. But
        nobody checks if the description matches the code. Vigil does. We read
        the PR description, extract every claim, verify each one against the
        actual diff, and surface changes the author didn&apos;t mention.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        What we do
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil gives every pull request a verification report &mdash; claims
        checked against the diff, undocumented changes surfaced, and impact
        analyzed. Three layers of verification: Claims Verification confirms the
        PR does what it says. Undocumented Change Detection finds what the
        description missed. Impact Analysis catches breaking changes, coverage
        gaps, and contract violations. Results appear directly on the PR.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        How we&apos;re different
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        We don&apos;t review code (that&apos;s CodeRabbit). We don&apos;t run CI
        (that&apos;s GitHub Actions). We don&apos;t measure coverage
        (that&apos;s Codecov). We verify that what your PR claims matches what
        the code actually does. When your PR says &quot;adds rate
        limiting&quot; &mdash; we check the diff. When it doesn&apos;t mention a
        new Redis dependency &mdash; we flag it.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Open source
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil is open source under the MIT License. The entire codebase &mdash;
        990+ tests, 9 signals, the score engine &mdash; is public on GitHub.
        You can self-host, audit, contribute, or fork it.
      </p>

      <div className="mt-12 flex flex-wrap items-center gap-4">
        <a
          href="https://github.com/apps/keepvigil"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[6px] text-sm font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150 active:scale-[0.98]"
        >
          Install on GitHub
        </a>
        <a
          href="https://github.com/McMutteer/keepvigil"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[6px] text-sm text-text-primary border border-white/[0.06] hover:bg-bg-elevated transition-colors duration-150"
        >
          View on GitHub
        </a>
      </div>
    </div>
  );
}
