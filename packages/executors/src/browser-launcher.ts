/**
 * Thin wrapper around playwright-core to isolate the import.
 *
 * Vitest module resolution breaks when playwright-core is imported
 * alongside sibling modules. This wrapper isolates the import so
 * tests can mock a single file instead of playwright-core itself.
 */

import { chromium } from "playwright-core";
export type { Browser, Page } from "playwright-core";
import { createLogger } from "@vigil/core";

const LAUNCH_TIMEOUT_MS = 30_000;
const CLOSE_TIMEOUT_MS = 5_000;
const log = createLogger("browser-launcher");

export async function launchBrowser(): Promise<
  Awaited<ReturnType<typeof chromium.launch>>
> {
  return chromium.launch({
    headless: true,
    timeout: LAUNCH_TIMEOUT_MS,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
}

/**
 * Close a browser with a timeout to avoid hanging on stuck processes.
 * Never throws — logs warnings on failure or timeout.
 */
export async function closeBrowser(browser: { close: () => Promise<void> }): Promise<void> {
  try {
    await Promise.race([
      browser.close(),
      new Promise<void>((resolve) =>
        setTimeout(() => {
          log.warn("close() timed out, process may be leaked");
          resolve();
        }, CLOSE_TIMEOUT_MS),
      ),
    ]);
  } catch (err) {
    log.warn({ err }, "close() failed");
  }
}
