import type { Metadata } from "next";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "CI Bridge | Vigil Docs",
  description:
    "Maps test plan items to GitHub Actions check runs using fuzzy token matching.",
};

export default function CiBridgePage() {
  const { prev, next } = getPrevNext("/docs/signals/ci-bridge");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        CI Bridge
      </h1>
      <p className="text-text-secondary mb-8">
        Weight: 25 &middot; Free tier
      </p>

      <p className="text-text-secondary leading-relaxed mb-4">
        The CI Bridge signal connects your test plan items to GitHub Actions
        check runs. When your test plan says &ldquo;unit tests pass,&rdquo;
        Vigil finds the corresponding CI job and checks whether it actually
        passed. This is the highest-weighted signal because CI results are the
        most reliable indicator of code quality.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        How Matching Works
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil tokenizes both the test plan item text and each GitHub Actions
        check run name, then looks for overlapping tokens using naive stemming.
        For example, a test plan item that says{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          unit tests pass
        </code>{" "}
        would match a check run named{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          Run Unit Tests
        </code>{" "}
        because the tokens &ldquo;unit&rdquo; and &ldquo;test&rdquo; overlap.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        The matching algorithm is intentionally fuzzy — it handles variations in
        naming, capitalization, and phrasing. This means you do not need to name
        your CI jobs to match your test plan exactly.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Self-Exclusion
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil&apos;s own check run is automatically excluded from matching. This
        prevents circular references where Vigil&apos;s status check would be
        compared against the test plan items it is evaluating.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        When No CI Is Configured
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        If no GitHub Actions check runs are found for the PR, the CI Bridge
        signal returns a score of 100 with a{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          skip
        </code>{" "}
        status. This ensures that repositories without GitHub Actions are not
        penalized. The signal simply does not participate in the scoring
        calculation.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Scoring
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        When CI runs exist, the score is based on how many test plan items
        successfully map to passing check runs. Items that match a failing check
        run reduce the score proportionally. Items that do not match any check
        run are treated as unverified and do not contribute positively.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
