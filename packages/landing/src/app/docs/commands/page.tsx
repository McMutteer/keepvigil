import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Commands | Vigil Docs",
  description:
    "Interact with Vigil via PR comments — retry runs, re-run specific items.",
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
      <CodeBlock
        filename="PR comment"
        code={`/vigil retry`}
      />
      <p className="text-text-secondary leading-relaxed mb-4">
        This is useful when external conditions have changed since the original
        run — for example, a CI pipeline that was temporarily broken, or a
        preview deployment that was not ready yet.
      </p>

      {/* /vigil retry with IDs */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        /vigil retry tp-1 tp-3
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Re-run only specific test plan items by their IDs. Item IDs are shown in
        the Vigil report (
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          tp-1
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          tp-2
        </code>
        , etc.). Specify one or more IDs separated by spaces.
      </p>
      <CodeBlock
        filename="PR comment"
        code={`# Re-run only items tp-1 and tp-3
/vigil retry tp-1 tp-3

# Re-run a single item
/vigil retry tp-5`}
      />
      <p className="text-text-secondary leading-relaxed mb-4">
        Items not included in the selective retry will show a status of
        &quot;Not retried&quot; in the updated report. Their previous results are
        preserved — only the specified items are re-executed.
      </p>

      {/* Trust Model */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Trust Model
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Only users with one of the following GitHub associations can trigger
        retry commands:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">OWNER</strong> — repository owner
        </li>
        <li>
          <strong className="text-text-primary">MEMBER</strong> — organization member
        </li>
        <li>
          <strong className="text-text-primary">COLLABORATOR</strong> — invited collaborator
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
        <li>Creates a new GitHub Check Run (the old one remains for history)</li>
        <li>Re-executes the specified items (or all items for a full retry)</li>
        <li>Recalculates the confidence score based on the new results</li>
        <li>
          Updates the existing PR comment with a{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            (retry)
          </code>{" "}
          tag in the title
        </li>
        <li>
          Adds a banner showing which item IDs were re-run (for selective
          retries)
        </li>
      </ul>
      <p className="text-text-secondary leading-relaxed mb-4">
        The PR comment is updated in place — Vigil does not create duplicate
        comments. The retry tag makes it clear that the results reflect a
        re-run rather than the initial analysis.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
