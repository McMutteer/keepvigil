import type { Metadata } from "next";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Security | Vigil Docs",
  description:
    "How Vigil protects your code — sandbox isolation, SSRF prevention, fork trust model, and shell allowlist.",
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
        Sandbox Isolation
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        All shell commands run inside a Docker container with{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          --network none
        </code>
        . This means:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>No internet access from inside the sandbox</li>
        <li>No access to your host machine or other containers</li>
        <li>No access to environment variables or secrets</li>
        <li>
          Read-only access to the repository code (cloned into the container)
        </li>
        <li>
          Default image:{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            node:22-alpine
          </code>{" "}
          (configurable via{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            shell.image
          </code>
          )
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Shell Allowlist
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil does not execute arbitrary commands. Every command must match the{" "}
        <a href="/docs/shell-allowlist" className="text-accent hover:underline">
          shell allowlist
        </a>{" "}
        — a curated set of safe patterns (npm, pnpm, yarn, pytest, cargo,
        etc.). Dangerous shell metacharacters are blocked:{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          ; | ` $ &lt; &gt; {"{"} {"}"}
        </code>
        .
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        NPX commands are further restricted — flags like{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          --config
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          --plugin
        </code>
        , and{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          --resolve-plugins-relative-to
        </code>{" "}
        are blocked to prevent arbitrary code loading.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        SSRF Protection
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The API executor validates all URLs before making requests. The{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          validateBaseUrl()
        </code>{" "}
        function blocks:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          Localhost and loopback addresses (
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            127.0.0.1
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            ::1
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            localhost
          </code>
          )
        </li>
        <li>Private IP ranges (10.x, 172.16-31.x, 192.168.x)</li>
        <li>URLs with embedded credentials (user:pass@host)</li>
        <li>Non-HTTPS URLs (HTTP is blocked)</li>
      </ul>

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
          from injecting malicious configuration — like adding dangerous
          commands to{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            shell.allow
          </code>{" "}
          or pointing the LLM to a malicious endpoint.
        </p>
      </Callout>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Retry Trust Gate
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          /vigil retry
        </code>{" "}
        command can only be triggered by users with{" "}
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
        Path Validation
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The assertion executor validates all file paths before reading:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          Path traversal (
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            ../
          </code>
          ) is rejected
        </li>
        <li>Absolute paths are rejected</li>
        <li>
          Only files within the cloned repository directory can be accessed
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Credential Handling
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil never stores, logs, or displays actual credential values. When the{" "}
        <a
          href="/docs/signals/credential-scan"
          className="text-accent hover:underline"
        >
          Credential Scan
        </a>{" "}
        detects a secret, the match is immediately redacted in all output —
        including PR comments, check run details, and server logs. The only
        information preserved is the type of credential detected and the line
        number.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        LLM Data Boundaries
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        When using BYOLLM, Vigil sends code diffs and file contents to your
        configured LLM provider. This is your API key, your provider, your data
        policy. Vigil does not send any data to third-party LLMs unless you
        explicitly configure it.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        LLM prompts include data boundary markers and backtick escaping to
        prevent prompt injection from PR content.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
