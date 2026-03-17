import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "BYOLLM | Vigil Docs",
  description:
    "Use your own API key for Pro-tier signals. Zero variable cost for Vigil.",
};

export default function ByollmPage() {
  const { prev, next } = getPrevNext("/docs/byollm");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Bring Your Own LLM
      </h1>
      <p className="text-text-secondary mb-8">
        Use your own API key for Pro-tier signals. Zero variable cost for Vigil.
      </p>

      <Callout variant="pro" title="Pro Tier Signals">
        BYOLLM unlocks Diff vs Claims and Gap Analysis signals. Without it,
        Vigil runs Free tier signals only.
      </Callout>

      {/* Supported Providers */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Supported Providers
      </h2>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Provider
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Base URL
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Example Model
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">OpenAI</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">https://api.openai.com/v1</code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">gpt-4o-mini</code>
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Groq</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">https://api.groq.com/openai/v1</code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">llama-3.3-70b-versatile</code>
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Ollama</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">http://localhost:11434/v1</code>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">llama3</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-text-secondary leading-relaxed mb-4">
        Any provider that exposes an OpenAI-compatible chat completions endpoint
        will work. Vigil uses the standard{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          /chat/completions
        </code>{" "}
        API format.
      </p>

      {/* Setup */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Setup
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Add an{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          llm
        </code>{" "}
        section to your{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          .vigil.yml
        </code>{" "}
        in the repository root:
      </p>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        OpenAI
      </h3>
      <CodeBlock
        filename=".vigil.yml"
        code={`llm:
  provider: openai
  model: gpt-4o-mini
  api_key: sk-proj-...`}
      />

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Groq
      </h3>
      <CodeBlock
        filename=".vigil.yml"
        code={`llm:
  provider: groq
  model: llama-3.3-70b-versatile
  api_key: gsk_...`}
      />

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Ollama (self-hosted)
      </h3>
      <CodeBlock
        filename=".vigil.yml"
        code={`llm:
  provider: ollama
  model: llama3
  base_url: http://localhost:11434/v1`}
      />
      <p className="text-text-secondary leading-relaxed mb-4">
        Ollama does not require an API key. Make sure the Ollama server is
        accessible from the network where Vigil runs.
      </p>

      {/* Cost Estimate */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Cost Estimate
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Pro-tier signals make 2-4 LLM calls per Vigil run:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>Item classification (fallback for ambiguous items)</li>
        <li>Diff vs Claims analysis</li>
        <li>Gap analysis</li>
        <li>Assertion verification (for file-based checks)</li>
      </ul>
      <p className="text-text-secondary leading-relaxed mb-4">
        With a fast model like Groq&apos;s{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          llama-3.3-70b-versatile
        </code>
        , this typically costs less than $0.01 per PR. Even with OpenAI&apos;s{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          gpt-4o-mini
        </code>
        , costs stay well under a cent per run. You pay your LLM provider
        directly — Vigil adds no markup.
      </p>

      {/* Which Signals Use LLM */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Which Signals Use LLM
      </h2>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Signal
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                LLM Usage
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Diff vs Claims</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Always — compares the PR diff against test plan claims</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Gap Analysis</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Always — identifies untested changes in the diff</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Assertion Verifier</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">For file verification — reads source files and validates claims</td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Classifier</td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">Fallback only — used when rule-based matching is ambiguous</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Without BYOLLM */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Without BYOLLM
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Without a configured LLM, Vigil runs all Free tier signals:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">CI Bridge</strong> — monitors your CI pipeline status
        </li>
        <li>
          <strong className="text-text-primary">Credential Scan</strong> — scans the diff for leaked secrets
        </li>
        <li>
          <strong className="text-text-primary">Test Execution</strong> — runs shell commands in a sandboxed container
        </li>
        <li>
          <strong className="text-text-primary">Coverage Mapper</strong> — checks if changed files are covered by the test plan
        </li>
      </ul>
      <p className="text-text-secondary leading-relaxed mb-4">
        The Free tier is fully functional and provides significant value with
        zero LLM cost. Adding BYOLLM unlocks deeper analysis but is entirely
        optional.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
