import Image from "next/image";
import { ScrollReveal } from "../scroll-reveal";

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
              Install Vigil in 30 seconds. Free forever for open source.
            </p>
            <a
              href="https://github.com/apps/keepvigil"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-[6px] text-[15px] font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150 active:scale-[0.98]"
            >
              Install on GitHub
            </a>
          </div>
        </ScrollReveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6">
        <div className="mx-auto max-w-[1200px] px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <a href="#" className="flex items-center gap-2">
            <Image
              src="/brand/icon.svg"
              alt=""
              width={20}
              height={20}
              className="w-5 h-5 opacity-60"
            />
            <span className="text-sm text-text-muted">vigil</span>
          </a>

          <div className="flex items-center gap-6 text-sm text-text-muted">
            <a
              href="https://github.com/McMutteer/keepvigil"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-secondary transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/McMutteer/keepvigil#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-secondary transition-colors"
            >
              Documentation
            </a>
            <a
              href="https://github.com/McMutteer/keepvigil/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-secondary transition-colors"
            >
              MIT License
            </a>
          </div>

          <p className="text-xs text-text-muted">
            © 2026 Vigil. Open source under MIT.
          </p>
        </div>
      </footer>
    </>
  );
}
