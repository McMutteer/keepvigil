import type { Metadata } from "next";
import { DocsLink } from "@/components/docs/docs-link";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Security | Vigil Docs",
  description:
    "How Vigil protects your code — read-only analysis, no code storage, fork trust model, and EU-hosted infrastructure.",
};

export default function SecurityPage() {
  const { prev, next } = getPrevNext("/docs/security");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Security
      </h1>
      <p className="text-text-secondary mb-8">
        How Vigil protects your code and infrastructure.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Read-Only Analysis
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil performs static, read-only analysis of your PR diffs. It does not
        clone your repository, execute any code, or modify any files. The
        analysis pipeline reads the diff provided by the GitHub API and runs
        all verification signals against it without ever touching your
        codebase directly.
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>No code execution — all analysis is static</li>
        <li>No repository cloning — only diff data from the GitHub API</li>
        <li>No access to your environment variables or secrets</li>
        <li>No write access to your repository beyond PR comments and check runs</li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        No Code Storage
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil does not store your source code. Diff data is processed in
        memory during the analysis pipeline and discarded after results are
        posted. Only metadata is persisted: scores, signal results, PR
        numbers, and timestamps. Your code never touches disk on our servers.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Fork PR Trust Model
      </h2>
      <Callout variant="security" title="Fork PRs use default branch config">
        <p>
          When a fork opens a PR against your repository, Vigil reads{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            .vigil.yml
          </code>{" "}
          from your repository&apos;s default branch (usually{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            main
          </code>
          ), not from the fork&apos;s PR head. This prevents untrusted forks
          from injecting malicious configuration.
        </p>
      </Callout>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Command Trust Gate
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil commands (
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          /vigil retry
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          @vigil recheck
        </code>
        , etc.) can only be triggered by users with{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          OWNER
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          MEMBER
        </code>
        , or{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          COLLABORATOR
        </code>{" "}
        association to the repository. This prevents external users from
        spamming re-runs on public repositories.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Credential Handling
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil never stores, logs, or displays actual credential values. When the{" "}
        <DocsLink
          href="/docs/signals/credential-scan"
          className="text-accent hover:underline"
        >
          Credential Scan
        </DocsLink>{" "}
        detects a secret, the match is immediately redacted in all output —
        including PR comments, check run details, and server logs. The only
        information preserved is the type of credential detected and the line
        number.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        LLM Data Boundaries
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil sends PR diffs and metadata to its hosted LLM for analysis.
        This data is used solely for verification and is not stored or used
        for model training. LLM prompts include data boundary markers and
        backtick escaping to prevent prompt injection from PR content.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Infrastructure
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil runs on EU-hosted servers (Germany). All data in transit is
        encrypted via TLS. The database stores only execution metadata (scores,
        signal results, timestamps) — never source code or diff content.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
