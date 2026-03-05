/**
 * Thin wrapper around playwright-core to isolate the import.
 *
 * Vitest module resolution breaks when playwright-core is imported
 * alongside sibling modules. This wrapper isolates the import so
 * tests can mock a single file instead of playwright-core itself.
 */

import { chromium } from "playwright-core";
export type { Browser, Page } from "playwright-core";

const LAUNCH_TIMEOUT_MS = 30_000;
const CLOSE_TIMEOUT_MS = 5_000;

export async function launchBrowser(): Promise<
  Awaited<ReturnType<typeof chromium.launch>>
> {
  const launch = chromium.launch({
    headless: true,
    // Use system Chromium in Docker (set via PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Browser launch timed out")), LAUNCH_TIMEOUT_MS),
  );

  return Promise.race([launch, timeout]);
}

/**
 * Close a browser with a timeout to avoid hanging on stuck processes.
 * Logs a warning if close times out but does not throw.
 */
export async function closeBrowser(browser: { close: () => Promise<void> }): Promise<void> {
  await Promise.race([
    browser.close(),
    new Promise<void>((resolve) =>
      setTimeout(() => {
        console.warn("[browser] close() timed out, process may be leaked");
        resolve();
      }, CLOSE_TIMEOUT_MS),
    ),
  ]);
}
