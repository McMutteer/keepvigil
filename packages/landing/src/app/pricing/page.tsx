import type { Metadata } from "next";
import { PricingPageClient } from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing | Vigil",
  description:
    "Choose the right Vigil plan for your team. Start free with 6 signals, upgrade to Pro for full confidence scoring, or scale with Team for org-wide control.",
};

export default function PricingPage() {
  return <PricingPageClient />;
}
