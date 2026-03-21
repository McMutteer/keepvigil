import type { Metadata } from "next";
import { DocsLink } from "@/components/docs/docs-link";

export const metadata: Metadata = {
  title: "Test Execution (Removed) | Vigil Docs",
  description: "The Test Execution signal was removed in Vigil v5.0.",
  robots: { index: false, follow: true },
};

export default function TestExecutionPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Test Execution (Removed)
      </h1>
      <p className="text-text-secondary mb-8">
        The Test Execution signal was removed in Vigil v5.0 as part of the v1
        deprecation. Vigil no longer executes code — all analysis is static
        and read-only.
      </p>
      <p className="text-text-secondary leading-relaxed">
        See the{" "}
        <DocsLink href="/docs/signals" className="text-accent hover:underline">
          Signals Overview
        </DocsLink>{" "}
        for the current set of 8 verification signals.
      </p>
    </>
  );
}
