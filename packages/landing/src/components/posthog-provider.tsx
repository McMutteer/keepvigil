"use client";

declare global {
  interface Window { dataLayer: unknown[]; }
}

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

const POSTHOG_KEY = "phc_pMkToaBDqYRQpgkS1el55R9G53m15IzhYe5iMqyTSuN";
const POSTHOG_HOST = "https://us.i.posthog.com";

const GTAG_ID = "AW-18032447128";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // PostHog
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
    });

    // Google Ads conversion tag
    const gtagScript = document.createElement("script");
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`;
    gtagScript.async = true;
    document.head.appendChild(gtagScript);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) { window.dataLayer.push(args); }
    gtag("js", new Date());
    gtag("config", GTAG_ID);
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
