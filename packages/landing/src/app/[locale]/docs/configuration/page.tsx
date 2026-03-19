import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Configuration | Vigil Docs",
  description:
    "Complete .vigil.yml reference — notifications, auto-approve, and coverage exclusions.",
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
        Configuration is optional. Vigil works zero-config on any PR. The
        options below let you fine-tune notifications, auto-approval, and
        coverage analysis.
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

notifications:
  on: failure            # failure | always
  urls:
    - "https://hooks.slack.com/services/T.../B.../..."
    - "https://discord.com/api/webhooks/..."

auto_approve:
  enabled: true
  min_score: 90          # minimum confidence score to auto-approve

coverage:
  exclude:
    - "docs/**"
    - "*.config.*"
    - "migrations/**"`}
      />

      {/* Fields Reference */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Fields Reference
      </h2>

      {/* Notifications */}
      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Notifications
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        Send webhook notifications to Slack, Discord, or any HTTPS endpoint
        when Vigil finishes analyzing a PR.
      </p>
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
            </tr>
          </thead>
          <tbody>
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
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  failure
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                When to notify:{" "}
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  failure
                </code>{" "}
                (score below 80) or{" "}
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  always
                </code>
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
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  []
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Webhook URLs (max 5, must be https://)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Auto Approve */}
      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Auto Approve
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        Automatically approve PRs that meet a minimum confidence score. When
        enabled, Vigil submits an approving review on PRs that score at or
        above the threshold.
      </p>
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
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  auto_approve.enabled
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                boolean
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  false
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Enable automatic PR approval
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  auto_approve.min_score
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                number
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  90
                </code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Minimum score to trigger approval (1-100)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Coverage Exclude */}
      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Coverage Exclusions
      </h3>
      <p className="text-text-secondary leading-relaxed mb-4">
        Exclude files from coverage analysis. Files matching these glob
        patterns will not be penalized for missing test coverage.
      </p>
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
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  coverage.exclude
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
                Glob patterns for files to exclude from coverage analysis
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil already excludes common non-code files (config files, lockfiles,
        documentation) by default. Use this option for project-specific
        exclusions like generated code or migration files.
      </p>

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
        malicious configuration.
      </Callout>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
