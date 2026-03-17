import type { Metadata } from "next";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Credential Scan | Vigil Docs",
  description:
    "Scans PR diffs for hardcoded secrets using 10 detection patterns.",
};

export default function CredentialScanPage() {
  const { prev, next } = getPrevNext("/docs/signals/credential-scan");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Credential Scan
      </h1>
      <p className="text-text-secondary mb-8">
        Weight: 25 &middot; Free tier
      </p>

      <p className="text-text-secondary leading-relaxed mb-4">
        The Credential Scan signal analyzes the PR diff for hardcoded secrets,
        API keys, tokens, and other sensitive values. It scans only{" "}
        <strong className="text-text-primary">added lines</strong> in the diff
        — removed lines and context lines are ignored, since removing a secret
        is a good thing.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Detection Patterns
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil uses 10 detection patterns to identify credentials:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">AWS access keys</strong> —
          strings starting with{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            AKIA
          </code>
        </li>
        <li>
          <strong className="text-text-primary">AWS secret keys</strong> —
          40-character base64 strings in AWS contexts
        </li>
        <li>
          <strong className="text-text-primary">GitHub tokens</strong> —
          prefixes{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            ghp_
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            gho_
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            ghs_
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            ghr_
          </code>
        </li>
        <li>
          <strong className="text-text-primary">Generic API keys</strong> —
          common key assignment patterns
        </li>
        <li>
          <strong className="text-text-primary">JWT tokens</strong> — strings
          starting with{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            eyJ
          </code>
        </li>
        <li>
          <strong className="text-text-primary">Private keys</strong> —{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            BEGIN ... PRIVATE KEY
          </code>{" "}
          blocks
        </li>
        <li>
          <strong className="text-text-primary">Connection strings</strong> —{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            postgres://
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            mysql://
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            mongodb://
          </code>
        </li>
        <li>
          <strong className="text-text-primary">Basic auth URLs</strong> —{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            https://user:pass@
          </code>{" "}
          patterns
        </li>
        <li>
          <strong className="text-text-primary">Slack tokens</strong> —
          prefixes{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            xoxb-
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            xoxp-
          </code>
          ,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            xoxs-
          </code>
        </li>
        <li>
          <strong className="text-text-primary">High entropy hex strings</strong>{" "}
          — hexadecimal strings of 64+ characters
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Redaction
      </h2>
      <Callout variant="security" title="Secrets are never logged">
        Matches are redacted in all output. Vigil never logs, displays, or
        stores the actual secret value. The PR comment will indicate that a
        credential was found and its type, but the value itself is replaced with
        a redaction marker.
      </Callout>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Scoring
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        If the diff is clean (no credentials found), the signal scores 100. If{" "}
        <em>any</em> credential is detected, the signal scores 0 — this is a
        binary pass/fail check. Because the Credential Scan is a deterministic
        signal, a failure triggers the{" "}
        <strong className="text-text-primary">failure cap</strong>, limiting the
        total confidence score to a maximum of 70. A PR with leaked credentials
        can never be rated &ldquo;Safe to merge.&rdquo;
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
