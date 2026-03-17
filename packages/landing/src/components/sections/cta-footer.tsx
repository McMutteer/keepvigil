import Image from "next/image";
import { ScrollReveal } from "../scroll-reveal";
import { EmailCapture } from "../email-capture";

export function CtaFooter() {
  return (
    <>
      {/* Final CTA band */}
      <section className="bg-bg-surface py-16 sm:py-20">
        <ScrollReveal>
          <div className="mx-auto max-w-[600px] px-6 text-center">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-4">
              Merge with confidence.
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-text-secondary mb-8">
              Install Vigil in 30 seconds. Free forever. No credit card required.
            </p>
            <a
              href="https://github.com/apps/keepvigil"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-[6px] text-[15px] font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150 active:scale-[0.98]"
            >
              Install on GitHub
            </a>

            {/* Email capture */}
            <EmailCapture />
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-12 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
            {/* Logo column */}
            <div className="col-span-2 sm:col-span-1">
              <a href="/" className="flex items-center gap-2 mb-4">
                <Image
                  src="/brand/icon.svg"
                  alt="Vigil"
                  width={20}
                  height={20}
                  className="w-5 h-5 opacity-60"
                />
                <span className="text-sm text-text-muted">vigil</span>
              </a>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-primary mb-4">
                Product
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="/#signals" className="text-text-muted hover:text-text-secondary transition-colors">
                    Signals
                  </a>
                </li>
                <li>
                  <a href="/#pricing" className="text-text-muted hover:text-text-secondary transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="/docs/byollm" className="text-text-muted hover:text-text-secondary transition-colors">
                    BYOLLM
                  </a>
                </li>
                <li>
                  <a href="/docs/security" className="text-text-muted hover:text-text-secondary transition-colors">
                    Security
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-primary mb-4">
                Resources
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="/docs/getting-started" className="text-text-muted hover:text-text-secondary transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/McMutteer/keepvigil"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted hover:text-text-secondary transition-colors"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="/docs/writing-test-plans" className="text-text-muted hover:text-text-secondary transition-colors">
                    Writing Test Plans
                  </a>
                </li>
                <li>
                  <a href="/about" className="text-text-muted hover:text-text-secondary transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="/docs/changelog" className="text-text-muted hover:text-text-secondary transition-colors">
                    Changelog
                  </a>
                </li>
                <li>
                  <a
                    href="https://keepvigil.dev/health"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted hover:text-text-secondary transition-colors"
                  >
                    Status
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-text-primary mb-4">
                Legal
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="/privacy" className="text-text-muted hover:text-text-secondary transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="text-text-muted hover:text-text-secondary transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/[0.06]">
            <p className="text-xs text-text-muted">
              &copy; 2026 Vigil. Open source under MIT.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
