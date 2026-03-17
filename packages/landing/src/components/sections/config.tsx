"use client";

import { useState } from "react";
import { ScrollReveal } from "../scroll-reveal";

const MINIMAL_CONFIG = `version: 1

# That's it. Vigil runs free-tier signals
# on every PR automatically.`;

const FULL_CONFIG = `version: 1

timeouts:
  shell: 300
  api: 30

skip:
  categories:
    - visual

shell:
  allow:
    - "npm test"
    - "pytest"

notifications:
  on: failure
  urls:
    - https://hooks.slack.com/services/T.../B.../xxx

# Pro: bring your own LLM
llm:
  provider: groq
  model: llama-3.3-70b-versatile
  api_key: gsk_your_key_here`;

function CodeBlock({
  code,
  filename,
}: {
  code: string;
  filename: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-[8px] overflow-hidden border-subtle">
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-elevated">
        <span className="font-mono text-xs text-text-muted">{filename}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-text-muted hover:text-text-primary transition-colors duration-150"
          aria-label="Copy configuration to clipboard"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="bg-code-bg p-4 overflow-x-auto">
        <code className="font-mono text-[13px] leading-relaxed text-code-text">
          {code}
        </code>
      </pre>
    </div>
  );
}

export function Config() {
  const [showFull, setShowFull] = useState(false);

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-start">
          {/* Text column */}
          <ScrollReveal>
            <div>
              <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-4">
                Three lines to start.
                <br />
                Infinite control when you need it.
              </h2>
              <p className="text-base sm:text-lg leading-relaxed text-text-secondary mb-6">
                Drop a{" "}
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-accent">
                  .vigil.yml
                </code>{" "}
                in your repo root. That&apos;s it. Vigil works out of the box —
                configure only what you want to customize.
              </p>
              <p className="text-sm text-text-muted">
                Zero config required for Free tier. Add{" "}
                <code className="font-mono text-xs bg-code-bg px-1.5 py-0.5 rounded">
                  llm:
                </code>{" "}
                to unlock Pro signals with your own API key.
              </p>
            </div>
          </ScrollReveal>

          {/* Code column */}
          <ScrollReveal delay={200}>
            <div className="space-y-3">
              <CodeBlock
                code={showFull ? FULL_CONFIG : MINIMAL_CONFIG}
                filename=".vigil.yml"
              />
              <button
                onClick={() => setShowFull(!showFull)}
                className="text-xs text-accent hover:text-accent-hover transition-colors duration-150"
              >
                {showFull ? "← Show minimal" : "See full configuration →"}
              </button>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
