import type { Metadata } from "next";
import { DocsLink } from "@/components/docs/docs-link";

export const metadata: Metadata = {
  title: "Writing Test Plans (Removed) | Vigil Docs",
  description:
    "Test plans are no longer required. Vigil verifies any PR automatically.",
};

export default function WritingTestPlansPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Writing Test Plans (Removed)
      </h1>
      <p className="text-text-secondary mb-8">
        Test plans are no longer required. Since Vigil v5.0, every PR is
        verified automatically based on its title, description, and diff — no
        test plan needed.
      </p>
      <p className="text-text-secondary leading-relaxed">
        See the{" "}
        <DocsLink href="/docs/getting-started" className="text-accent hover:underline">
          Getting Started
        </DocsLink>{" "}
        guide to learn how Vigil works with any PR.
      </p>
    </>
  );
}
