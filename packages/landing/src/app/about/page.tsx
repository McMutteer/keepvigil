import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Vigil",
  description: "The silent verifier for AI-generated pull requests.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold text-text-primary mb-8">
        About Vigil
      </h1>

      <p className="text-text-secondary leading-relaxed mb-4">
        AI agents write most of the code now. Claude Code, Cursor, Copilot
        &mdash; they generate pull requests with beautiful test plans, each
        checkbox a promise of quality. But nobody verifies those promises.
        Developers merge on blind trust. Vigil exists to close that gap.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        What we do
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil gives every pull request a confidence score &mdash; a number from
        0 to 100 that tells you how safe it is to merge. We collect 7
        independent signals: CI results, credential scans, test execution,
        coverage mapping, file assertion verification, diff analysis, and gap
        detection. The score appears directly on the PR &mdash; no dashboard, no
        separate tool, no context switching.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        How we&apos;re different
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        We don&apos;t review code (that&apos;s CodeRabbit). We don&apos;t run CI
        (that&apos;s GitHub Actions). We don&apos;t measure coverage
        (that&apos;s Codecov). We verify that the AI agent&apos;s promises match
        reality. When your agent says &quot;the Dockerfile uses a non-root USER
        directive,&quot; we read the Dockerfile and check. No one else does
        this.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Open source
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil is open source under the MIT License. The entire codebase &mdash;
        836+ tests, 8 signals, the score engine &mdash; is public on GitHub.
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
