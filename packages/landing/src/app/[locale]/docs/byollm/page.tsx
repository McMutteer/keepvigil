import type { Metadata } from "next";
import { DocsLink } from "@/components/docs/docs-link";

export const metadata: Metadata = {
  title: "BYOLLM (Removed) | Vigil Docs",
  description: "BYOLLM was removed in Vigil v5.0.",
};

export default function ByollmPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        BYOLLM (Removed)
      </h1>
      <p className="text-text-secondary mb-8">
        BYOLLM (Bring Your Own LLM) was removed in Vigil v5.0. Vigil now uses
        its own hosted LLM for all analysis — no API key configuration needed.
      </p>
      <p className="text-text-secondary leading-relaxed">
        See the{" "}
        <DocsLink href="/docs/configuration" className="text-accent hover:underline">
          Configuration
        </DocsLink>{" "}
        page for current options, or the{" "}
        <DocsLink href="/docs/changelog" className="text-accent hover:underline">
          Changelog
        </DocsLink>{" "}
        for details on what changed.
      </p>
    </>
  );
}
