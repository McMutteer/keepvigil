/**
 * @vigil/executors — Test execution engines.
 * Implements shell, API, and browser executors.
 */

export { executeAssertionItem } from "./assertion.js";
export { executeApiItem } from "./api.js";
export { generateApiSpec } from "./api-spec-generator.js";
export { makeRequest, validateBaseUrl } from "./http-client.js";
export type { HttpResponse } from "./http-client.js";

export { executeShellItem } from "./shell.js";
export { validateCommand, SHELL_METACHARACTERS } from "./allowlist.js";
export { runInSandbox } from "./sandbox.js";
export type { ValidationResult } from "./allowlist.js";
export type { SandboxOptions, SandboxResult } from "./sandbox.js";

export { executeBrowserItem } from "./browser.js";
export { generateBrowserSpec } from "./playwright-generator.js";
export { takeScreenshot, takeViewportScreenshots } from "./screenshot.js";
export { checkMetadata, executeMetadataItem } from "./metadata-checker.js";
export {
  DEFAULT_VIEWPORTS,
  hasHorizontalOverflow,
  createConsoleCollector,
} from "./viewport.js";
