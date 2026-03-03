/**
 * Viewport constants and responsive-testing utilities for the browser executor.
 */

import type { Page } from "playwright-core";
import type { ViewportSpec } from "@vigil/core/types";

/** Default viewports for responsive testing (mobile, tablet, desktop) */
export const DEFAULT_VIEWPORTS: ViewportSpec[] = [
  { width: 320, height: 568, label: "mobile" },
  { width: 768, height: 1024, label: "tablet" },
  { width: 1024, height: 768, label: "desktop" },
];

/**
 * Check if a page has horizontal overflow at its current viewport.
 * Returns true if `document.documentElement.scrollWidth` exceeds the viewport width.
 */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
}

export interface ConsoleCollector {
  flush(): string[];
}

/**
 * Create a console error collector for a Playwright page.
 * Listens for `console` events with level "error" and accumulates messages.
 * Call `flush()` to retrieve collected errors and clear the buffer.
 */
export function createConsoleCollector(page: Page): ConsoleCollector {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  return {
    flush() {
      return errors.splice(0);
    },
  };
}
