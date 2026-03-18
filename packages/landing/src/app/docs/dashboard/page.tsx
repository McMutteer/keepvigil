import type { Metadata } from "next";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Dashboard | Vigil Docs",
  description:
    "View execution history, stats, and detailed signal breakdowns for your PRs.",
};

export default function DashboardPage() {
  const { prev, next } = getPrevNext("/docs/dashboard");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Dashboard
      </h1>
      <p className="text-text-secondary mb-8">
        Execution history, stats, and signal details for your team.
      </p>

      <Callout variant="info" title="Pro & Team feature">
        The dashboard is available on Pro and Team plans. Free tier users can
        still see Vigil results directly on each PR comment.
      </Callout>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Getting Started
      </h2>
      <ol className="list-decimal ml-6 space-y-2 text-text-secondary mb-6">
        <li>
          Go to{" "}
          <a
            href="https://keepvigil.dev/dashboard"
            className="text-accent hover:underline"
          >
            keepvigil.dev/dashboard
          </a>
        </li>
        <li>Click &ldquo;Login with GitHub&rdquo; to authenticate</li>
        <li>Select the installation you want to view</li>
      </ol>
      <p className="text-text-secondary leading-relaxed mb-4">
        Authentication uses GitHub OAuth. Vigil requests read-only access to your
        profile to verify your identity — no additional permissions are required
        beyond what the GitHub App already has.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Overview
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The overview page shows a summary of your Vigil activity:
      </p>
      <ul className="list-disc ml-6 space-y-2 text-text-secondary mb-6">
        <li>
          <strong className="text-text-primary">Average score</strong> — the
          mean confidence score across all your recent PRs
        </li>
        <li>
          <strong className="text-text-primary">Total executions</strong> — how
          many PRs Vigil has verified
        </li>
        <li>
          <strong className="text-text-primary">Repos</strong> — list of
          repositories with Vigil enabled and their PR counts
        </li>
        <li>
          <strong className="text-text-primary">Recent PRs</strong> — the latest
          verified PRs with scores and status
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Execution History
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The history page shows a paginated list of all PR verifications. Each row
        includes:
      </p>
      <ul className="list-disc ml-6 space-y-2 text-text-secondary mb-6">
        <li>Repository and PR number</li>
        <li>Confidence score with color indicator</li>
        <li>Recommendation (safe / review / caution)</li>
        <li>Timestamp</li>
      </ul>
      <p className="text-text-secondary leading-relaxed mb-4">
        Click any row to see the full signal breakdown for that PR.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        PR Detail View
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The detail view shows the complete verification result for a single PR,
        including:
      </p>
      <ul className="list-disc ml-6 space-y-2 text-text-secondary mb-6">
        <li>Overall confidence score and recommendation</li>
        <li>
          Individual signal scores — each signal&apos;s score, status, and
          detailed findings
        </li>
        <li>Claims verified, undocumented changes found, and impact analysis</li>
        <li>Link to the original PR on GitHub</li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Session & Security
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Sessions are managed via a secure HTTP-only cookie (
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          vigil_session
        </code>
        ) with a 7-day expiry. Sessions are signed with HS256. Logging out
        clears the cookie immediately.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
