"use client";

import { useState } from "react";
import { ScrollReveal } from "../scroll-reveal";
import type { Dictionary } from "@/i18n/get-dictionary";

interface ResultItem {
  icon: string;
  text: string;
  detail: string;
  color: string;
}

const TABS_DATA = [
  {
    id: "review",
    score: 82,
    recClass: "bg-warning/10 text-warning border-warning/20",
    claims: [
      {
        icon: "\u2705",
        text: '"Add rate limiting to API endpoints"',
        detail: "confirmed, rate-limiter.ts created",
        color: "text-success",
      },
      {
        icon: "\u2705",
        text: '"Add tests for rate limiter"',
        detail: "confirmed, rate-limiter.test.ts has 12 tests",
        color: "text-success",
      },
      {
        icon: "\u26A0\uFE0F",
        text: '"No breaking changes"',
        detail: "GET /api/users response now includes rateLimit field",
        color: "text-warning",
      },
    ],
    undocumented: [
      {
        icon: "\u26A0\uFE0F",
        text: "New dependency: ioredis",
        detail: "not mentioned in PR description",
        color: "text-warning",
      },
      {
        icon: "\u26A0\uFE0F",
        text: "Environment variable added: REDIS_URL",
        detail: "not documented",
        color: "text-warning",
      },
    ],
    impact: [
      {
        icon: "\u2705",
        text: "Credentials scan clean",
        detail: "",
        color: "text-success",
      },
      {
        icon: "\u26A0\uFE0F",
        text: "Coverage gap",
        detail: "src/middleware/auth.ts modified but no test file covers it",
        color: "text-warning",
      },
      {
        icon: "\u2705",
        text: "No breaking API changes detected",
        detail: "",
        color: "text-success",
      },
    ],
  },
  {
    id: "caution",
    score: 38,
    recClass: "bg-failure/10 text-failure border-failure/20",
    claims: [
      {
        icon: "\u2705",
        text: '"Add Redis caching layer"',
        detail: "confirmed, cache.ts created",
        color: "text-success",
      },
      {
        icon: "\u274C",
        text: '"No secrets in code"',
        detail: "REDIS_PASSWORD found hardcoded in config.ts:14",
        color: "text-failure",
      },
      {
        icon: "\u274C",
        text: '"All endpoints tested"',
        detail: "3 new routes have no corresponding test files",
        color: "text-failure",
      },
    ],
    undocumented: [
      {
        icon: "\uD83D\uDED1",
        text: "Hardcoded credential: REDIS_PASSWORD",
        detail: "secret exposed in config.ts \u2014 credential scan failed",
        color: "text-failure",
      },
      {
        icon: "\u26A0\uFE0F",
        text: "Database schema migration added",
        detail: "not mentioned in PR description",
        color: "text-warning",
      },
    ],
    impact: [
      {
        icon: "\u274C",
        text: "Credential scan: FAILED",
        detail: "1 hardcoded secret detected",
        color: "text-failure",
      },
      {
        icon: "\u274C",
        text: "Coverage mapper: 0%",
        detail: "3 modified files, 0 test files found",
        color: "text-failure",
      },
      {
        icon: "\u26A0\uFE0F",
        text: "Contract mismatch",
        detail: "API response shape changed but frontend types not updated",
        color: "text-warning",
      },
    ],
  },
] as const;

function ResultRow({ icon, text, detail, color }: ResultItem) {
  return (
    <p className={`text-[13px] ${color}`}>
      {icon} {text}
      {detail && <span className="text-text-muted"> &mdash; {detail}</span>}
    </p>
  );
}

export function Evidence({ dict }: { dict: Dictionary }) {
  const [activeTab, setActiveTab] = useState(0);
  const tab = TABS_DATA[activeTab];
  const t = dict.evidence;

  const tabLabels = [t.tabs.reviewNeeded, t.tabs.credentialLeak];
  const recommendations = [t.reviewRecommended, t.doNotMerge];

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-[900px] px-6">
        <ScrollReveal>
          <div className="text-center mb-4">
            <p className="text-xs font-medium uppercase tracking-[0.05em] text-accent mb-3">
              {t.badge}
            </p>
            <h2 className="text-2xl sm:text-4xl font-semibold leading-[1.2] text-text-primary mb-4">
              {t.title}
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-text-secondary max-w-[600px] mx-auto">
              {t.subtitle}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          {/* Tab toggle */}
          <div className="flex justify-center gap-1 mb-6">
            {TABS_DATA.map((td, i) => (
              <button
                key={td.id}
                type="button"
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                  activeTab === i
                    ? "bg-accent text-[#080d1a]"
                    : "text-text-muted hover:text-text-secondary bg-bg-surface"
                }`}
              >
                {tabLabels[i]}
              </button>
            ))}
          </div>

          <div className="bg-bg-surface border-subtle rounded-[16px] p-5 sm:p-8 max-w-[800px] mx-auto">
            {/* Comment header */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.06]">
              <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-sm">
                \ud83d\udee1\ufe0f
              </div>
              <span className="font-medium text-sm text-text-primary">
                vigil
              </span>
              <span className="text-xs text-text-muted">bot</span>
            </div>

            {/* Score header */}
            <div className="mb-4">
              <p className="text-lg sm:text-xl font-semibold text-text-primary">
                \ud83d\udee1\ufe0f Vigil &mdash; PR Verification:{" "}
                <span className={tab.score >= 50 ? "text-accent" : "text-failure"}>
                  {tab.score}/100
                </span>
              </p>
              <span
                className={`inline-flex items-center mt-2 px-2.5 py-1 rounded-full text-[11px] font-medium border ${tab.recClass}`}
              >
                {recommendations[activeTab]}
              </span>
            </div>

            {/* Claims section */}
            <div className="mb-5">
              <p className="text-sm font-semibold text-text-primary mb-2">
                {t.claims}
              </p>
              <div className="space-y-1.5 pl-1">
                {tab.claims.map((row) => (
                  <ResultRow key={row.text} {...row} />
                ))}
              </div>
            </div>

            {/* Undocumented Changes section */}
            <div className="mb-5">
              <p className="text-sm font-semibold text-text-primary mb-2">
                {t.undocumentedChanges}
              </p>
              <div className="space-y-1.5 pl-1">
                {tab.undocumented.map((row) => (
                  <ResultRow key={row.text} {...row} />
                ))}
              </div>
            </div>

            {/* Impact section */}
            <div className="mb-5">
              <p className="text-sm font-semibold text-text-primary mb-2">
                {t.impact}
              </p>
              <div className="space-y-1.5 pl-1">
                {tab.impact.map((row) => (
                  <ResultRow key={row.text} {...row} />
                ))}
              </div>
            </div>

            {/* Score footer */}
            <div className="pt-4 border-t border-white/[0.06]">
              <p className="text-sm font-mono text-text-secondary">
                Score:{" "}
                <span
                  className={`font-semibold ${tab.score >= 50 ? "text-accent" : "text-failure"}`}
                >
                  {tab.score}/100
                </span>{" "}
                &mdash; {recommendations[activeTab]}
              </p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={400}>
          <div className="text-center mt-8">
            <a
              href="https://github.com/McMutteer/keepvigil/pull/47"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[6px] text-sm font-medium text-accent border border-accent/30 hover:bg-accent/10 transition-colors"
            >
              {t.seeRealResult}
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
