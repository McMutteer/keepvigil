import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Notifications | Vigil Docs",
  description:
    "Get notified on Slack, Discord, or any HTTPS endpoint when Vigil runs.",
};

export default function NotificationsPage() {
  const { prev, next } = getPrevNext("/docs/notifications");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Webhook Notifications
      </h1>
      <p className="text-text-secondary mb-8">
        Get notified on Slack, Discord, or any HTTPS endpoint when Vigil runs.
      </p>

      {/* Configuration */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Configuration
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Add a{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          notifications
        </code>{" "}
        section to your{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          .vigil.yml
        </code>{" "}
        in the repository root:
      </p>
      <CodeBlock
        filename=".vigil.yml"
        code={`notifications:
  on: failure        # "failure" or "always"
  urls:
    - https://hooks.slack.com/services/T.../B.../xxx
    - https://discord.com/api/webhooks/123/abc`}
      />
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil sends a POST request to each URL with a JSON payload containing
        the repository name, PR number, confidence score, recommendation, and a
        link to the PR.
      </p>

      {/* Trigger Modes */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Trigger Modes
      </h2>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Mode
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                When it fires
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">failure</code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Only when the score indicates &quot;Caution&quot; or &quot;Review needed&quot; (score below 80). This is the default if you configure notifications without specifying a mode.
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">always</code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Sends a notification on every PR analysis, regardless of score.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Slack Setup */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Slack Setup
      </h2>
      <ol className="list-decimal ml-6 space-y-2 text-text-secondary mb-4">
        <li>
          Go to your Slack workspace and create an{" "}
          <strong className="text-text-primary">Incoming Webhook</strong> via the
          Slack API dashboard or by adding the Incoming Webhooks app to your
          workspace.
        </li>
        <li>
          Choose the channel where Vigil should post notifications and authorize
          the webhook.
        </li>
        <li>
          Copy the webhook URL. It will look like:
        </li>
      </ol>
      <CodeBlock
        filename="Slack webhook URL"
        code={`https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`}
      />
      <ol className="list-decimal ml-6 space-y-2 text-text-secondary mb-4" start={4}>
        <li>
          Add the URL to your{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            .vigil.yml
          </code>{" "}
          under{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            notifications.urls
          </code>
          .
        </li>
      </ol>

      {/* Discord Setup */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Discord Setup
      </h2>
      <ol className="list-decimal ml-6 space-y-2 text-text-secondary mb-4">
        <li>
          Open your Discord server and go to{" "}
          <strong className="text-text-primary">
            Server Settings &rarr; Integrations &rarr; Webhooks
          </strong>
          .
        </li>
        <li>
          Click <strong className="text-text-primary">New Webhook</strong>,
          choose a name and channel, then click{" "}
          <strong className="text-text-primary">Copy Webhook URL</strong>.
        </li>
        <li>
          The URL will look like:
        </li>
      </ol>
      <CodeBlock
        filename="Discord webhook URL"
        code={`https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnop...`}
      />
      <ol className="list-decimal ml-6 space-y-2 text-text-secondary mb-4" start={4}>
        <li>
          Add the URL to your{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            .vigil.yml
          </code>{" "}
          under{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            notifications.urls
          </code>
          .
        </li>
      </ol>

      {/* Limits */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Limits
      </h2>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          Maximum <strong className="text-text-primary">5 webhook URLs</strong>{" "}
          per repository.
        </li>
        <li>
          All URLs must start with{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            https://
          </code>
          . Plain HTTP endpoints are rejected to protect your webhook secrets in
          transit.
        </li>
        <li>
          Notifications are sent asynchronously after the PR comment is posted.
          A failed webhook delivery does not affect the Vigil run or the
          confidence score.
        </li>
      </ul>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
