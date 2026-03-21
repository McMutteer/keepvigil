import type { Metadata } from "next";
import { DocsLink } from "@/components/docs/docs-link";

export const metadata: Metadata = {
  title: "Shell Allowlist (Removed) | Vigil Docs",
  description: "Shell execution was removed in Vigil v5.0.",
  robots: { index: false, follow: true },
};

export default function ShellAllowlistPage() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Shell Allowlist (Removed)
      </h1>
      <p className="text-text-secondary mb-8">
        Shell execution was removed in Vigil v5.0. Vigil now performs read-only
        static analysis — no code is executed.
      </p>
      <p className="text-text-secondary leading-relaxed">
        See the{" "}
        <DocsLink href="/docs/security" className="text-accent hover:underline">
          Security
        </DocsLink>{" "}
        page for how Vigil protects your code, or the{" "}
        <DocsLink href="/docs/changelog" className="text-accent hover:underline">
          Changelog
        </DocsLink>{" "}
        for details on what changed.
      </p>
    </>
  );
}
