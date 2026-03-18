"use client";

import { useState } from "react";
import { ScrollReveal } from "../scroll-reveal";

const FAQ_ITEMS = [
  {
    question: "Is Vigil free for open source?",
    answer:
      "Yes. The Free tier includes Claims Verification, Undocumented Change Detection, credential scanning, and coverage mapping \u2014 unlimited PRs, unlimited repos. No credit card required.",
  },
  {
    question: "Does Vigil work with private repos?",
    answer:
      "Yes. Both Free and Pro tiers work with private repositories. Install the GitHub App and select which repos to enable.",
  },
  {
    question: "What data does Vigil access?",
    answer:
      "Vigil reads the PR title, description, and diff. Optionally clones the repo for deeper file analysis. No code is stored after analysis completes.",
  },
  {
    question: "Do I need to configure anything?",
    answer:
      "No. Vigil works out of the box with zero configuration. Optionally add a .vigil.yml file to customize timeouts, shell commands, or enable Pro signals.",
  },
  {
    question: "What does BYOLLM mean?",
    answer:
      "Bring Your Own LLM. Pro signals use AI to analyze your code. You provide your own API key (OpenAI, Groq, or Ollama), so you control the cost and data flow.",
  },
  {
    question: "How much does the LLM cost per PR?",
    answer:
      "Typically less than $0.01 per PR. Vigil makes 2\u20134 LLM calls per analysis using fast models like Groq\u2019s llama-3.3-70b.",
  },
  {
    question: "Can Vigil block merges?",
    answer:
      "Vigil posts a GitHub Check Run. You can configure branch protection rules to require Vigil\u2019s check to pass before merging. Scores below 50 result in a \u2018failure\u2019 check.",
  },
  {
    question: "Is Vigil only for GitHub?",
    answer:
      "Currently GitHub only. GitLab and Bitbucket are being considered for the future.",
  },
];

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

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-[800px] px-6">
        <ScrollReveal>
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary">
              Frequently asked questions
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="divide-y divide-white/[0.06]">
            {FAQ_ITEMS.map((item, i) => {
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
