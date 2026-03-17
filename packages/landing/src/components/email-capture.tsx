"use client";

import { useState } from "react";

export function EmailCapture() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="mt-10 pt-8 border-t border-white/[0.06]">
      <p className="text-sm text-text-muted mb-3">
        Get updates on new features
      </p>
      {submitted ? (
        <p className="text-sm text-success">Thanks! We&apos;ll keep you posted.</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex gap-2 max-w-[400px] mx-auto"
        >
          <input
            type="email"
            placeholder="you@company.com"
            className="flex-1 px-4 py-2.5 rounded-[6px] text-sm bg-bg-deep border border-white/[0.06] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors"
            required
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-[6px] text-sm font-medium border border-white/[0.06] text-text-primary hover:bg-bg-elevated transition-colors"
          >
            Subscribe
          </button>
        </form>
      )}
    </div>
  );
}
