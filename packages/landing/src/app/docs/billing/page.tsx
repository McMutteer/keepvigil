import type { Metadata } from "next";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Billing & Plans | Vigil Docs",
  description:
    "Manage your Vigil subscription, upgrade to Pro or Team, and understand billing.",
};

export default function BillingPage() {
  const { prev, next } = getPrevNext("/docs/billing");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Billing &amp; Plans
      </h1>
      <p className="text-text-secondary mb-8">
        Manage your Vigil subscription
      </p>

      {/* Plan Overview */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Plan Overview
      </h2>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Plan
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Price
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Includes
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <strong className="text-text-primary">Free</strong>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                $0
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                6 signals, unlimited repos
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <strong className="text-text-primary">Pro</strong>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                $19/mo
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                9 signals + BYOLLM + webhooks
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <strong className="text-text-primary">Team</strong>
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                $49/mo
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                Dashboard + SSO + custom rules
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* How to Upgrade */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        How to Upgrade
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        There are two ways to upgrade your plan:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">From a PR:</strong> when Vigil
          detects gated signals, the PR comment includes an upgrade link that
          takes you directly to checkout.
        </li>
        <li>
          <strong className="text-text-primary">From the pricing page:</strong>{" "}
          visit{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            /pricing
          </code>{" "}
          and click &quot;Start Pro Trial&quot; to begin your 14-day trial.
        </li>
      </ul>

      {/* Managing Your Subscription */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Managing Your Subscription
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        After checkout, use the Stripe billing portal to manage your
        subscription. From the portal you can:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>View invoices and payment history</li>
        <li>Update your payment method</li>
        <li>Change plans (upgrade or downgrade)</li>
        <li>Cancel your subscription</li>
      </ul>

      {/* Cancellation */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Cancellation
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Cancel anytime from the billing portal. Your Pro signals remain active
        until the end of the current billing period. After that, gated signals
        stop running and your score reverts to Free-tier signals only.
      </p>
      <Callout variant="info">
        No data is lost when you cancel. All previously analyzed PRs keep their
        scores and reports.
      </Callout>

      {/* BYOLLM Billing */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        BYOLLM Billing
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil doesn&apos;t charge for LLM usage. You provide your own API key
        (OpenAI, Groq, or Ollama) and pay your provider directly. Typical cost
        is less than $0.01 per PR.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        You control the provider, model, and spending. Configure your LLM
        connection in{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          .vigil.yml
        </code>{" "}
        under the{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          llm
        </code>{" "}
        section.
      </p>

      {/* FAQ */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        FAQ
      </h2>

      <p className="text-text-secondary leading-relaxed mb-2">
        <strong className="text-text-primary">
          What happens to my PRs if I cancel?
        </strong>
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        PRs analyzed during your subscription keep their scores and reports.
        Future PRs use Free-tier signals only.
      </p>

      <p className="text-text-secondary leading-relaxed mb-2">
        <strong className="text-text-primary">
          Can I switch between monthly and annual?
        </strong>
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        Yes, you can switch at any time from the Stripe billing portal.
      </p>

      <p className="text-text-secondary leading-relaxed mb-2">
        <strong className="text-text-primary">Is there a free trial?</strong>
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        The Free tier is permanent and requires no credit card. Pro features can
        be tried via the 14-day trial on first signup.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
