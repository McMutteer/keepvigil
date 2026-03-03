/**
 * Screenshot capture utilities for the browser executor.
 * Returns base64-encoded image data — no file I/O, no persistent storage.
 */

import type { Page } from "playwright-core";
import type { ViewportSpec } from "@vigil/core/types";

/** Max screenshot size in bytes before JPEG fallback (200 KB) */
const MAX_PNG_BYTES = 200 * 1024;

/** JPEG quality for fallback compression */
const JPEG_QUALITY = 75;

export interface ScreenshotResult {
  /** Base64-encoded image data (PNG or JPEG) */
  base64: string;
  /** Image format */
  format: "png" | "jpeg";
  /** Label for this screenshot (e.g., "before-click", "failure") */
  label: string;
  /** Viewport at time of capture */
  viewport: { width: number; height: number };
  /** ISO timestamp */
  timestamp: string;
}

/**
 * Take a full-page screenshot of the current page state.
 * If the PNG exceeds MAX_PNG_BYTES, falls back to compressed JPEG.
 */
export async function takeScreenshot(
  page: Page,
  label: string,
): Promise<ScreenshotResult> {
  const viewport = page.viewportSize() ?? { width: 1024, height: 768 };

  // Try PNG first
  const pngBuffer = await page.screenshot({ type: "png", fullPage: false });

  if (pngBuffer.byteLength <= MAX_PNG_BYTES) {
    return {
      base64: Buffer.from(pngBuffer).toString("base64"),
      format: "png",
      label,
      viewport,
      timestamp: new Date().toISOString(),
    };
  }

  // PNG too large — fall back to JPEG
  const jpegBuffer = await page.screenshot({
    type: "jpeg",
    quality: JPEG_QUALITY,
    fullPage: false,
  });

  return {
    base64: Buffer.from(jpegBuffer).toString("base64"),
    format: "jpeg",
    label,
    viewport,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Take screenshots at multiple viewports.
 * Resizes the page for each viewport, captures, then restores the original size.
 */
export async function takeViewportScreenshots(
  page: Page,
  viewports: ViewportSpec[],
): Promise<ScreenshotResult[]> {
  const original = page.viewportSize() ?? { width: 1024, height: 768 };
  const results: ScreenshotResult[] = [];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const shot = await takeScreenshot(page, `viewport-${vp.label}`);
    results.push(shot);
  }

  // Restore original viewport
  await page.setViewportSize(original);

  return results;
}
