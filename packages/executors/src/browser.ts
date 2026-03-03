/**
 * Browser executor — runs browser-classified test plan items.
 *
 * Routes items by category and confidence:
 *  - metadata  → fetch + HTML parse (no browser, fast)
 *  - MEDIUM    → visual check: screenshots at viewports, always passes
 *  - HIGH      → UI flow: full Playwright assertions, pass/fail
 *
 * Evidence shape varies per path — see each sub-executor for details.
 */

import { launchBrowser } from "./browser-launcher.js";
import type { Page, Browser } from "./browser-launcher.js";
import type {
  BrowserActionSpec,
  BrowserExecutionContext,
  ClassifiedItem,
  ExecutionResult,
} from "@vigil/core/types";
import { generateBrowserSpec } from "./playwright-generator.js";
import { takeScreenshot, takeViewportScreenshots } from "./screenshot.js";
import type { ScreenshotResult } from "./screenshot.js";
import { DEFAULT_VIEWPORTS, hasHorizontalOverflow, createConsoleCollector } from "./viewport.js";
import { executeMetadataItem } from "./metadata-checker.js";

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 3;

/** Transient errors that warrant a retry */
const RETRYABLE_PATTERNS = [
  "Navigation timeout",
  "net::ERR_",
  "Target closed",
  "Protocol error",
  "Page crashed",
  "browser has been closed",
];

function isRetryable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return RETRYABLE_PATTERNS.some((pattern) => msg.includes(pattern));
}

/** Validate that a URL stays within the allowed base URL origin */
function isWithinDomain(url: string, baseUrl: string): boolean {
  try {
    const base = new URL(baseUrl);
    const target = new URL(url);
    return target.origin === base.origin;
  } catch {
    return false;
  }
}

interface ActionResult {
  spec: BrowserActionSpec;
  durationMs: number;
  passed: boolean;
  failReason?: string;
  screenshot?: ScreenshotResult;
}

/**
 * Execute a single BrowserActionSpec against a Playwright page.
 * Returns the result of the action — never throws.
 */
async function runAction(
  page: Page,
  spec: BrowserActionSpec,
  baseUrl: string,
): Promise<ActionResult> {
  const start = Date.now();

  try {
    switch (spec.action) {
      case "navigate": {
        const url = baseUrl.replace(/\/$/, "") + (spec.path ?? "/");
        if (!isWithinDomain(url, baseUrl)) {
          return {
            spec,
            durationMs: Date.now() - start,
            passed: false,
            failReason: `Navigation outside allowed domain: "${url}"`,
          };
        }
        await page.goto(url, { waitUntil: "domcontentloaded" });
        break;
      }
      case "click": {
        await page.locator(spec.selector!).click();
        break;
      }
      case "fill": {
        await page.locator(spec.selector!).fill(spec.value!);
        break;
      }
      case "select": {
        await page.locator(spec.selector!).selectOption(spec.value!);
        break;
      }
      case "wait": {
        await page.waitForTimeout(Math.min(spec.waitMs ?? 1000, 10_000));
        break;
      }
      case "screenshot": {
        const shot = await takeScreenshot(page, spec.description ?? "screenshot");
        return { spec, durationMs: Date.now() - start, passed: true, screenshot: shot };
      }
      case "assertVisible": {
        const visible = await page.locator(spec.selector!).first().isVisible();
        if (!visible) {
          const shot = await takeScreenshot(page, "assertion-failure");
          return {
            spec,
            durationMs: Date.now() - start,
            passed: false,
            failReason: `Element not visible: "${spec.selector}"`,
            screenshot: shot,
          };
        }
        break;
      }
      case "assertText": {
        const text = await page.locator(spec.selector!).first().textContent();
        if (!text?.includes(spec.expected ?? "")) {
          const shot = await takeScreenshot(page, "assertion-failure");
          return {
            spec,
            durationMs: Date.now() - start,
            passed: false,
            failReason: `Text mismatch: expected "${spec.expected}", got "${text?.substring(0, 200)}"`,
            screenshot: shot,
          };
        }
        break;
      }
      case "assertUrl": {
        const currentUrl = page.url();
        if (!currentUrl.includes(spec.expected ?? "")) {
          const shot = await takeScreenshot(page, "assertion-failure");
          return {
            spec,
            durationMs: Date.now() - start,
            passed: false,
            failReason: `URL mismatch: expected "${spec.expected}" in "${currentUrl}"`,
            screenshot: shot,
          };
        }
        break;
      }
    }

    return { spec, durationMs: Date.now() - start, passed: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    let screenshot: ScreenshotResult | undefined;
    try {
      screenshot = await takeScreenshot(page, "error");
    } catch {
      // Page may be crashed — skip screenshot
    }
    return { spec, durationMs: Date.now() - start, passed: false, failReason: msg, screenshot };
  }
}

/**
 * Execute a HIGH confidence UI flow item.
 * Generates action specs via Claude, executes them sequentially,
 * stops on first failure.
 */
async function executeUiFlowItem(
  item: ClassifiedItem,
  context: BrowserExecutionContext,
): Promise<ExecutionResult> {
  const startMs = Date.now();
  const itemId = item.item.id;
  const maxRetries = context.maxRetries ?? DEFAULT_MAX_RETRIES;

  // Generate specs from NL
  let specs: BrowserActionSpec[];
  try {
    specs = await generateBrowserSpec(item.item.text, context.anthropicApiKey);
  } catch (err) {
    return {
      itemId,
      passed: false,
      duration: Date.now() - startMs,
      evidence: { actions: [], consoleErrors: [], screenshots: [], error: String(err), attempt: 0 },
    };
  }

  if (specs.length === 0) {
    return {
      itemId,
      passed: false,
      duration: Date.now() - startMs,
      evidence: {
        actions: [],
        consoleErrors: [],
        screenshots: [],
        error: "No browser actions generated from test plan item",
        attempt: 0,
      },
    };
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let browser: Browser | undefined;

    try {
      browser = await launchBrowser();
      const page = await browser.newPage();
      page.setDefaultTimeout(context.timeoutMs ?? DEFAULT_TIMEOUT_MS);

      const console = createConsoleCollector(page);
      const actions: ActionResult[] = [];
      const screenshots: ScreenshotResult[] = [];
      let allPassed = true;

      for (const spec of specs) {
        const result = await runAction(page, spec, context.baseUrl);
        actions.push(result);
        if (result.screenshot) screenshots.push(result.screenshot);

        if (!result.passed) {
          allPassed = false;
          // On failure, take a final screenshot if we don't already have one
          if (!result.screenshot) {
            try {
              screenshots.push(await takeScreenshot(page, "failure-state"));
            } catch {
              // Page may be broken
            }
          }
          break; // stop-on-first-failure
        }
      }

      const consoleErrors = console.flush();
      await browser.close();
      browser = undefined;

      if (!allPassed && attempt < maxRetries) {
        // Check if the last failure is retryable
        const lastAction = actions[actions.length - 1];
        if (lastAction && isRetryable(new Error(lastAction.failReason ?? ""))) {
          lastError = lastAction.failReason;
          continue; // retry
        }
      }

      return {
        itemId,
        passed: allPassed,
        duration: Date.now() - startMs,
        evidence: { actions, consoleErrors, screenshots, attempt },
      };
    } catch (err) {
      lastError = err;
      if (browser) {
        try { await browser.close(); } catch { /* ignore cleanup error */ }
      }
      if (attempt < maxRetries && isRetryable(err)) {
        continue;
      }
      return {
        itemId,
        passed: false,
        duration: Date.now() - startMs,
        evidence: {
          actions: [],
          consoleErrors: [],
          screenshots: [],
          error: err instanceof Error ? err.message : String(err),
          attempt,
        },
      };
    }
  }

  // Exhausted all retries
  return {
    itemId,
    passed: false,
    duration: Date.now() - startMs,
    evidence: {
      actions: [],
      consoleErrors: [],
      screenshots: [],
      error: `Failed after ${maxRetries} retries: ${lastError}`,
      attempt: maxRetries,
    },
  };
}

/**
 * Execute a MEDIUM confidence visual item.
 * Takes screenshots at configured viewports, checks overflow.
 * Always returns passed: true — evidence only, no gate.
 */
async function executeVisualItem(
  item: ClassifiedItem,
  context: BrowserExecutionContext,
): Promise<ExecutionResult> {
  const startMs = Date.now();
  const itemId = item.item.id;
  const viewports = context.viewports ?? DEFAULT_VIEWPORTS;

  // Generate specs to find the target path
  let path = "/";
  try {
    const specs = await generateBrowserSpec(item.item.text, context.anthropicApiKey);
    const nav = specs.find((s) => s.action === "navigate");
    if (nav?.path) path = nav.path;
  } catch {
    // Default to "/" if spec generation fails
  }

  let browser: Browser | undefined;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    page.setDefaultTimeout(context.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const consoleCollector = createConsoleCollector(page);

    const url = context.baseUrl.replace(/\/$/, "") + path;
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Take screenshots at each viewport
    const screenshots = await takeViewportScreenshots(page, viewports);

    // Check for horizontal overflow at each viewport
    const overflowDetected: Record<string, boolean> = {};
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      overflowDetected[vp.label] = await hasHorizontalOverflow(page);
    }

    const consoleErrors = consoleCollector.flush();
    await browser.close();

    return {
      itemId,
      passed: true, // MEDIUM confidence = always passes (evidence only)
      duration: Date.now() - startMs,
      evidence: {
        screenshots,
        consoleErrors,
        viewportsTested: viewports,
        overflowDetected,
      },
    };
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }
    return {
      itemId,
      passed: true, // MEDIUM = evidence only, even on error
      duration: Date.now() - startMs,
      evidence: {
        screenshots: [],
        consoleErrors: [],
        viewportsTested: viewports,
        overflowDetected: {},
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

/**
 * Execute a classified browser item.
 *
 * Routes to the appropriate sub-executor based on category and confidence:
 *  - metadata items  → executeMetadataItem (no browser needed)
 *  - MEDIUM items    → executeVisualItem (screenshots, always passes)
 *  - HIGH items      → executeUiFlowItem (assertions, pass/fail)
 */
export async function executeBrowserItem(
  item: ClassifiedItem,
  context: BrowserExecutionContext,
): Promise<ExecutionResult> {
  // Metadata items don't need a browser
  if (item.category === "metadata") {
    return executeMetadataItem(item, {
      baseUrl: context.baseUrl,
      timeoutMs: context.timeoutMs,
    });
  }

  // MEDIUM confidence = visual evidence only
  if (item.confidence === "MEDIUM") {
    return executeVisualItem(item, context);
  }

  // HIGH confidence = full UI flow with assertions
  return executeUiFlowItem(item, context);
}
