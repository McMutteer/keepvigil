import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Vigil",
  description: "Terms of Service for Vigil.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">
        Terms of Service
      </h1>
      <p className="text-sm text-text-muted mb-12">Last updated: March 2026</p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        License
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil is open source under the MIT License. You can self-host, modify,
        and redistribute the source code freely. The full license is available
        in the{" "}
        <a
          href="https://github.com/McMutteer/keepvigil/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          project repository
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Service Description
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil is a GitHub App that analyzes pull requests and provides a
        confidence score based on 8 independent signals. The service is provided
        &quot;as is&quot; without warranty of any kind, express or implied.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Free Tier
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The Free tier is available indefinitely for public repositories. We
        reserve the right to modify Free tier features with reasonable notice.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Pro &amp; Team Tiers
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Paid tiers are billed via subscription. Cancellation takes effect at
        the end of the current billing period. No refunds are issued for
        partial billing periods.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Acceptable Use
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        You agree not to use Vigil to:
      </p>
      <ul className="list-disc ml-6 text-text-secondary leading-relaxed mb-4 space-y-1">
        <li>Process or distribute malicious content</li>
        <li>Overload or abuse GitHub&apos;s API</li>
        <li>
          Abuse the service in any way that degrades the experience for other
          users
        </li>
      </ul>
      <p className="text-text-secondary leading-relaxed mb-4">
        We may suspend or terminate accounts that violate these terms.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Limitation of Liability
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil provides confidence scores as advisory information only. Merge
        decisions are the sole responsibility of the user. We are not liable
        for bugs that pass through, data loss, service interruptions, or any
        damages arising from the use of the service.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Data &amp; Privacy
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        For information about how we handle your data, see our{" "}
        <a href="/privacy" className="text-accent hover:underline">
          Privacy Policy
        </a>
        .
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Changes
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        We may update these terms as the service evolves. Continued use of
        Vigil after changes are posted constitutes acceptance of the revised
        terms.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Contact
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Questions about these terms? Reach us at{" "}
        <a
          href="mailto:hello@keepvigil.dev"
          className="text-accent hover:underline"
        >
          hello@keepvigil.dev
        </a>
        .
      </p>
    </div>
  );
}
