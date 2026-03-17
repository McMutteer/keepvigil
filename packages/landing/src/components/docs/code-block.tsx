"use client";

import { useState } from "react";

export function CodeBlock({
  code,
  filename,
  language,
}: {
  code: string;
  filename?: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-[8px] overflow-hidden border border-white/[0.06] my-4">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-bg-elevated">
          <span className="font-mono text-xs text-text-muted">
            {filename}
            {language && (
              <span className="ml-2 text-text-muted/60">{language}</span>
            )}
          </span>
          <button
            onClick={handleCopy}
            className="text-xs text-text-muted hover:text-text-primary transition-colors duration-150"
            aria-label="Copy code to clipboard"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
      <pre className="bg-code-bg p-4 overflow-x-auto">
        <code className="font-mono text-[13px] leading-relaxed text-code-text">
          {code}
        </code>
      </pre>
    </div>
  );
}
