import type { Metadata } from "next";
import { PricingPageClient } from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing | Vigil",
  description:
    "Choose the right Vigil plan. Start free with claims verification and undocumented change detection. Upgrade to Pro for full impact analysis.",
  openGraph: {
    title: "Pricing | Vigil",
    description: "Choose the right Vigil plan. Start free with claims verification and undocumented change detection. Upgrade to Pro for full impact analysis.",
    url: "https://keepvigil.dev/pricing",
    siteName: "Vigil",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Pricing | Vigil",
    description: "Choose the right Vigil plan. Start free with claims verification and undocumented change detection. Upgrade to Pro for full impact analysis.",
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
