import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/sections/hero";
import { StatsBar } from "@/components/sections/stats-bar";
import { SocialProof } from "@/components/sections/social-proof";
import { Problem } from "@/components/sections/problem";
import { HowItWorksLanding } from "@/components/sections/how-it-works-landing";
import { Signals } from "@/components/sections/signals";
import { Evidence } from "@/components/sections/evidence";
import { TestPlansPreview } from "@/components/sections/test-plans-preview";
import { Config } from "@/components/sections/config";
import { SecurityTrust } from "@/components/sections/security-trust";
import { Pricing } from "@/components/sections/pricing";
import { Faq } from "@/components/sections/faq";
import { CtaFooter } from "@/components/sections/cta-footer";

export default function Home() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:p-4 focus:bg-accent focus:text-[#080d1a] focus:rounded-[6px] focus:m-2"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content">
        <Hero />
        <StatsBar />
        <SocialProof />
        <Problem />
        <HowItWorksLanding />
        <Signals />
        <Evidence />
        <TestPlansPreview />
        <Config />
        <SecurityTrust />
        <Pricing />
        <Faq />
      </main>
      <CtaFooter />
    </>
  );
}
