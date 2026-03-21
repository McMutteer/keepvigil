import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Commands | Vigil Docs",
  description:
    "Interact with Vigil via PR comments — retry, explain findings, ignore false positives, verify claims.",
};

export default function CommandsPage() {
  const { prev, next } = getPrevNext("/docs/commands");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Commands
      </h1>
      <p className="text-text-secondary mb-8">
        Interact with Vigil via PR comments.
      </p>

      {/* /vigil retry */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        /vigil retry
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Re-run all signals from scratch. Post a comment on the PR with exactly{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          /vigil retry
        </code>{" "}
        and Vigil will create a new check run, re-execute every signal, and
        update the PR comment with fresh results.
      </p>
      <CodeBlock filename="PR comment" code={`/vigil retry`} />
      <p className="text-text-secondary leading-relaxed mb-4">
        This is useful when external conditions have changed since the original
        run — for example, a CI pipeline that was temporarily broken, or a
        preview deployment that was not ready yet.
      </p>

      {/* @vigil recheck */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        @vigil recheck
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Alias for{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          /vigil retry
        </code>{" "}
        &mdash; re-runs all signals from scratch. Useful if you prefer the{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">@</code>{" "}
        mention style.
      </p>
      <CodeBlock filename="PR comment" code={`@vigil recheck`} />

      {/* @vigil explain */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        @vigil explain [finding]
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Ask Vigil to explain a specific finding in more detail. Vigil will use
        the LLM to provide context about why the finding was flagged and what
        you should consider.
      </p>
      <CodeBlock
        filename="PR comment"
        code={`@vigil explain hardcoded redirect URI`}
      />

      {/* @vigil verify */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        @vigil verify [claim]
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Manually verify a specific claim against the diff. Useful when you want
        Vigil to check something specific that wasn&apos;t in the original PR
        description.
      </p>
      <CodeBlock
        filename="PR comment"
        code={`@vigil verify rate limiting is applied to all API endpoints`}
      />

      {/* @vigil ignore */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        @vigil ignore [finding]
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Suppress a finding permanently for this repository. Vigil stores the
        ignore pattern in the database and will skip matching findings in all
        future PRs for this repo.
      </p>
      <CodeBlock
        filename="PR comment"
        code={`# Ignore a specific false positive
@vigil ignore hardcoded redirect URI

# The pattern matches case-insensitively against finding labels and messages`}
      />

      <Callout variant="info" title="Repo Memory">
        Ignore rules are stored per repository and persist across PRs. You can
        review stored rules by checking the repo_rules database table. Rules
        are scoped by owner/repo so they never leak across repositories.
      </Callout>

      {/* Trust Model */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Trust Model
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Only users with one of the following GitHub associations can trigger
        Vigil commands:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">OWNER</strong> — repository
          owner
        </li>
        <li>
          <strong className="text-text-primary">MEMBER</strong> — organization
          member
        </li>
        <li>
          <strong className="text-text-primary">COLLABORATOR</strong> — invited
          collaborator
        </li>
      </ul>
      <p className="text-text-secondary leading-relaxed mb-4">
        This prevents external users from spamming retries on public
        repositories. If an unauthorized user posts a retry command, Vigil
        silently ignores it.
      </p>

      <Callout variant="security" title="Fork PR Trust Boundaries">
        For fork PRs, the retry command respects the same trust boundaries as
        the initial run. Fork PR authors cannot trigger retries unless they are
        collaborators on the upstream repository.
      </Callout>

      {/* What Happens on Retry */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        What Happens on Retry
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        When a retry is triggered, Vigil:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          Creates a new GitHub Check Run (the old one remains for history)
        </li>
        <li>
          Re-executes all six verification signals
        </li>
        <li>Recalculates the confidence score based on the new results</li>
        <li>
          Updates the existing PR comment with a{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            (retry)
          </code>{" "}
          tag in the title
        </li>
      </ul>
      <p className="text-text-secondary leading-relaxed mb-4">
        The PR comment is updated in place — Vigil does not create duplicate
        comments. The retry tag makes it clear that the results reflect a re-run
        rather than the initial analysis.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
