"use client";

import { useEffect, useRef, useState } from "react";

const SIGNALS = [
  { icon: "✅", name: "Credential Scan", detail: "100", status: "success" },
  { icon: "✅", name: "CI Bridge", detail: "100", status: "success" },
  { icon: "✅", name: "Test Execution", detail: "12/12", status: "success" },
  { icon: "⚠️", name: "Coverage Mapper", detail: "50", status: "warning" },
  { icon: "✅", name: "Diff vs Claims", detail: "Pro", status: "success" },
  { icon: "✅", name: "Gap Analysis", detail: "96", status: "success" },
  { icon: "✅", name: "Plan Augmentor", detail: "5/5", status: "success" },
  { icon: "✅", name: "Contract Checker", detail: "100", status: "success" },
] as const;

const TARGET_SCORE = 95;

function useCountUp(target: number, duration: number) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    const prefersReducedMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setCount(target);
      return;
    }

    const startTime = performance.now();
    let frame: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [started, target, duration]);

  return { count, start: () => setStarted(true) };
}

export function ScoreCard() {
  const { count, start } = useCountUp(TARGET_SCORE, 1500);
  const [visibleSignals, setVisibleSignals] = useState(0);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      start();
      setVisibleSignals(SIGNALS.length);
      setShowRecommendation(true);
      return;
    }

    // Start animation immediately since it's above the fold
    const timer = setTimeout(() => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;
      start();

      // Stagger signals after score starts
      SIGNALS.forEach((_, i) => {
        setTimeout(() => setVisibleSignals((v) => Math.max(v, i + 1)), 800 + i * 100);
      });

      // Show recommendation after all signals
      setTimeout(
        () => setShowRecommendation(true),
        800 + SIGNALS.length * 100 + 200
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [start]);

  return (
    <div ref={cardRef} className="relative">
      {/* Amber glow behind card */}
      <div className="absolute inset-0 accent-glow rounded-[16px] -z-10" />

      <div className="bg-bg-surface border-subtle rounded-[16px] p-6 sm:p-8 w-full max-w-[420px]">
        {/* Score header */}
        <div className="text-center mb-6">
          <div className="text-xs font-medium uppercase tracking-[0.05em] text-text-muted mb-2">
            Vigil Confidence Score
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-6xl sm:text-7xl font-semibold text-accent font-mono tabular-nums">
              {count}
            </span>
            <span className="text-2xl text-text-muted font-mono">/100</span>
          </div>
        </div>

        {/* Recommendation badge */}
        <div
          className={`flex justify-center mb-6 transition-opacity duration-300 ${
            showRecommendation ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
            ✅ Safe to merge
          </span>
        </div>

        {/* Signals list */}
        <div className="space-y-2.5">
          {SIGNALS.map((signal, i) => (
            <div
              key={signal.name}
              className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                i < visibleSignals
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-2"
              }`}
            >
              <span className="text-base w-5 text-center shrink-0">
                {signal.icon}
              </span>
              <span
                className={`font-mono text-[13px] ${
                  signal.status === "warning"
                    ? "text-warning"
                    : "text-text-secondary"
                }`}
              >
                {signal.name}
              </span>
              {signal.detail && (
                <span className="ml-auto text-text-muted font-mono text-xs">
                  {signal.detail}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
