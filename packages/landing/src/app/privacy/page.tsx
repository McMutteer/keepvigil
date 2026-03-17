import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Vigil",
  description: "How Vigil handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-text-muted mb-12">Last updated: March 2026</p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        What We Access
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil accesses the following data via GitHub App permissions:
      </p>
      <ul className="list-disc ml-6 text-text-secondary leading-relaxed mb-4 space-y-1">
        <li>PR description (body text)</li>
        <li>PR diff</li>
        <li>Repository file tree (for file assertion verification)</li>
        <li>GitHub check run status</li>
      </ul>
      <p className="text-text-secondary leading-relaxed mb-4">
        All data is accessed exclusively through the GitHub App installation
        and the permissions you grant during installation.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        What We Don&apos;t Store
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        We do not store source code, diffs, PR content, or test results. All
        data is processed in memory and discarded after the analysis completes.
        Only metadata is stored: the confidence score, individual signal
        results, and timestamps.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        GitHub Permissions
      </h2>
      <ul className="list-disc ml-6 text-text-secondary leading-relaxed mb-4 space-y-1">
        <li>
          <strong className="text-text-primary">Read access:</strong> pull
          request content, check runs, repository contents
        </li>
        <li>
          <strong className="text-text-primary">Write access:</strong> check
          runs (to report results), pull request comments (to post the
          confidence score)
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        LLM Data (BYOLLM)
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        When you configure BYOLLM (Bring Your Own LLM) via{" "}
        <code className="font-mono text-sm text-accent">.vigil.yml</code>, code
        snippets from your pull requests are sent to your configured LLM
        provider (e.g., OpenAI, Groq, Ollama) for diff analysis and gap
        detection.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil does not control the LLM provider&apos;s data handling. You
        should review your provider&apos;s privacy policy before configuring
        BYOLLM.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Cookies &amp; Tracking
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        We do not use cookies, analytics, or tracking on the landing page or in
        the GitHub App. There are no third-party scripts, no pixel trackers, no
        session recordings.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Data Location
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil runs on servers in the EU. No data is transferred to third
        parties except the user&apos;s configured LLM provider (when BYOLLM is
        enabled).
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Contact
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Questions about this policy? Reach us at{" "}
        <a
          href="mailto:hello@keepvigil.dev"
          className="text-accent hover:underline"
        >
          hello@keepvigil.dev
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Changes
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        We may update this policy as our service evolves. Check the
        &quot;Last updated&quot; date at the top of this page for the most
        recent revision.
      </p>
    </div>
  );
}
