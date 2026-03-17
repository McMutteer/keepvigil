import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/sections/hero";
import { Problem } from "@/components/sections/problem";
import { Signals } from "@/components/sections/signals";
import { Evidence } from "@/components/sections/evidence";
import { Config } from "@/components/sections/config";
import { Pricing } from "@/components/sections/pricing";
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
        <Problem />
        <Signals />
        <Evidence />
        <Config />
        <Pricing />
      </main>
      <CtaFooter />
    </>
  );
}
