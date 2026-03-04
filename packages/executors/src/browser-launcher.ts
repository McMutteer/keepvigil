/**
 * Thin wrapper around playwright-core to isolate the import.
 *
 * Vitest module resolution breaks when playwright-core is imported
 * alongside sibling modules. This wrapper isolates the import so
 * tests can mock a single file instead of playwright-core itself.
 */

import { chromium } from "playwright-core";
export type { Browser, Page } from "playwright-core";

export async function launchBrowser(): Promise<
  Awaited<ReturnType<typeof chromium.launch>>
> {
  return chromium.launch({
    headless: true,
    // Use system Chromium in Docker (set via PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
}
