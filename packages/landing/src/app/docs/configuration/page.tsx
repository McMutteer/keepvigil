import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Configuration | Vigil Docs",
  description:
    "Complete .vigil.yml reference — timeouts, shell allowlist, BYOLLM, notifications.",
};

export default function ConfigurationPage() {
  const { prev, next } = getPrevNext("/docs/configuration");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Configuration
      </h1>
      <p className="text-text-secondary mb-8">
        Complete{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          .vigil.yml
        </code>{" "}
        reference. Drop this file in your repo root to customize Vigil.
      </p>

      <Callout variant="info">
        Configuration is optional. Vigil works zero-config on any PR. Most
        options below apply to test plan mode — if you just want PR
        verification, you don&apos;t need a config file at all.
      </Callout>

      {/* Minimal */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Minimal Configuration
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The simplest valid configuration file just declares the version:
      </p>
      <CodeBlock filename=".vigil.yml" code="version: 1" />

      {/* Full Reference */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Full Reference
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Here is every available option with example values:
      </p>
      <CodeBlock
        filename=".vigil.yml"
        code={`version: 1

timeouts:
  shell: 120      # seconds, max 3600
  api: 30         # seconds, max 300
  browser: 60     # seconds, max 600
  assertion: 30   # seconds, max 300

skip:
  categories:
    - manual
    - vague

shell:
  allow:
    - "make test"
    - "cargo clippy"
    - "python -m pytest"
  image: "node:22-alpine"

llm:
  provider: groq         # openai | groq | ollama
  model: llama-3.3-70b-versatile
  api_key: gsk_...       # or use repo secrets

notifications:
  on: failure            # failure | always
  urls:
    - "https://hooks.slack.com/services/T.../B.../..."
    - "https://discord.com/api/webhooks/..."`}
      />

      {/* Fields Reference */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Fields Reference
      </h2>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Field
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Type
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Default
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Description
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Constraints
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  version
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                number
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  1
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Config version
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Must be 1
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  timeouts.shell
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                number
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  120
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Shell command timeout (seconds)
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Max 3600
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  timeouts.api
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                number
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  30
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                API request timeout (seconds)
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Max 300
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  timeouts.browser
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                number
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  60
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Browser test timeout (seconds)
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Max 600
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  timeouts.assertion
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                number
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  30
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Assertion check timeout (seconds)
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Max 300
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  skip.categories
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                string[]
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  []
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Categories to skip
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                build, api, ui-flow, visual, metadata, assertion, manual, vague
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  shell.allow
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                string[]
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  []
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Custom allowed command prefixes
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Max 20 entries
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  shell.image
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                string
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  node:22-alpine
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Docker image for shell executor
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                &mdash;
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  llm.provider
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                string
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                &mdash;
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                LLM provider
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                openai | groq | ollama
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  llm.model
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                string
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                &mdash;
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Model name
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                &mdash;
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  llm.api_key
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                string
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                &mdash;
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                API key for the provider
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                &mdash;
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  notifications.on
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                string
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                &mdash;
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                When to notify
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                failure | always
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  notifications.urls
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                string[]
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                &mdash;
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Webhook URLs
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Max 5, must be https:// or Slack/Discord
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Validation */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Validation
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil validates your configuration file on every PR run. Invalid or
        out-of-range values are silently dropped and replaced with defaults. The
        configuration file will never cause Vigil to crash or skip a run.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        When values are rejected, Vigil generates warnings that appear in the PR
        comment inside a collapsible &ldquo;Applied Configuration&rdquo;
        section. This lets you know something was off without blocking your
        workflow.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        Examples of values that produce warnings:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            timeouts.shell: 9999
          </code>{" "}
          — exceeds max of 3600, falls back to 120
        </li>
        <li>
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            skip.categories: [&quot;invalid-category&quot;]
          </code>{" "}
          — unknown category, ignored
        </li>
        <li>
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            shell.allow
          </code>{" "}
          with more than 20 entries — extras are dropped
        </li>
      </ul>

      {/* Fork PRs */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Fork PRs
      </h2>
      <Callout variant="security" title="Trust boundary">
        For security, fork PRs read{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          .vigil.yml
        </code>{" "}
        from the repository&apos;s default branch (usually{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          main
        </code>
        ), not from the PR head. This prevents untrusted forks from injecting
        malicious configuration — such as adding dangerous shell commands to the
        allowlist or pointing the LLM provider to an attacker-controlled
        endpoint.
      </Callout>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
