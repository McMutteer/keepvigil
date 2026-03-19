"use client";

import { useState } from "react";
import { ScrollReveal } from "../scroll-reveal";
import type { Dictionary } from "@/i18n/get-dictionary";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`shrink-0 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Faq({ dict }: { dict: Dictionary }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const t = dict.faq;

  function toggle(index: number) {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-[800px] px-6">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary">
              {t.title}
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="divide-y divide-white/[0.06]">
            {t.items.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div key={i}>
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors"
                  >
                    <span className="text-[15px] font-medium text-text-primary">
                      {item.question}
                    </span>
                    <ChevronIcon open={isOpen} />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-5 text-sm leading-relaxed text-text-secondary">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
