export default function Home() {
  return (
    <main>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-accent focus:text-bg-deep">
        Skip to content
      </a>
      <div id="main-content" />
      {/* Sections will be added here as they are implemented:
          S1: Navbar
          S2: Hero
          S3: Problem
          S4: Signals
          S5: Evidence
          S6: Configuration
          S7: Pricing
          S8: Footer + CTA
      */}
    </main>
  );
}
