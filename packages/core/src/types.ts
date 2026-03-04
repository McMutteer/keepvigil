/** Health check response shape */
export interface HealthCheck {
  status: "ok" | "degraded" | "error";
  service: string;
  version: string;
  timestamp: string;
}

/** Hints extracted from a test plan item for the classifier (Section 4) */
export interface TestPlanHints {
  /** "Manual:" prefix was detected */
  isManual: boolean;
  /** Inline code blocks extracted (e.g., `npm run build`) */
  codeBlocks: string[];
  /** HTTP/HTTPS URLs found in the item text */
  urls: string[];
}

/** Parsed test plan item from a PR description */
export interface TestPlanItem {
  /** Sequential identifier: "tp-0", "tp-1", ... */
  id: string;
  /** Cleaned text without checkbox syntax or "Manual:" prefix */
  text: string;
  /** Whether the checkbox was checked ([x] or [X]) */
  checked: boolean;
  /** Original markdown line(s) */
  raw: string;
  /** Nesting level (0 = top-level, 1 = one indent, etc.) */
  indent: number;
  /** Extracted hints for the classifier */
  hints: TestPlanHints;
}

/** Result of parsing a full test plan section from a PR description */
export interface ParsedTestPlan {
  /** Extracted test plan items */
  items: TestPlanItem[];
  /** The actual heading text found (e.g., "## Test Plan") */
  sectionTitle: string;
  /** The entire test plan section as raw markdown */
  raw: string;
}

/** Confidence tier for a classified test plan item (ADR 003) */
export type ConfidenceTier = "DETERMINISTIC" | "HIGH" | "MEDIUM" | "LOW" | "SKIP";

/** Which executor handles this item */
export type ExecutorType = "shell" | "api" | "browser" | "none";

/** Category label for a classified item */
export type CategoryLabel = "build" | "api" | "ui-flow" | "visual" | "metadata" | "manual" | "vague";

/** A test plan item after classification */
export interface ClassifiedItem {
  /** The original parsed item */
  item: TestPlanItem;
  /** Confidence tier determining execution strategy */
  confidence: ConfidenceTier;
  /** Which executor should handle this item */
  executorType: ExecutorType;
  /** Category label for this item */
  category: CategoryLabel;
  /** Explanation of why this classification was chosen */
  reasoning: string;
}

/** Result of executing a single test plan item (Section 5+) */
export interface ExecutionResult {
  itemId: string;
  passed: boolean;
  duration: number;
  evidence: Record<string, unknown>;
}

/** HTTP methods supported by the API executor */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

/**
 * A single HTTP request specification generated from a NL test plan item.
 * The `path` is always relative — the base URL is provided by `ApiExecutionContext`.
 */
export interface HttpRequestSpec {
  method: HttpMethod;
  /** Relative path, e.g. "/api/users" or "/health". Never a full URL. */
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** HTTP status code the response must match. */
  expectedStatus: number;
  /** If provided, each key/value must be present in the parsed response body. */
  expectedBodyContains?: Record<string, unknown>;
}

/**
 * Context provided by the orchestrator to the API executor.
 * The `baseUrl` is always a preview deployment URL — never production.
 */
export interface ApiExecutionContext {
  /** Base URL of the preview deployment, e.g. "https://pr-42.keepvigil.dev" */
  baseUrl: string;
  /** Timeout per HTTP request in milliseconds (default: 30_000) */
  timeoutMs?: number;
  /** Groq API key for spec generation via Claude */
  groqApiKey: string;
}

/**
 * Context provided by the orchestrator (Section 9) to the shell executor.
 * Configures the sandboxed Docker environment for command execution.
 */
export interface ShellExecutionContext {
  /** Absolute path to the cloned repository on the host */
  repoPath: string;
  /** Timeout in milliseconds (default: 300_000 = 5 minutes) */
  timeoutMs?: number;
  /** Docker image to use for the sandbox (default: "node:22-alpine") */
  sandboxImage?: string;
}

// ---------------------------------------------------------------------------
// Browser executor types (Section 7)
// ---------------------------------------------------------------------------

/** Actions the browser executor can perform */
export type BrowserActionType =
  | "navigate"
  | "click"
  | "fill"
  | "select"
  | "wait"
  | "screenshot"
  | "assertVisible"
  | "assertText"
  | "assertUrl";

/**
 * A single browser action generated from a NL test plan item.
 * The LLM produces an array of these; the executor runs them sequentially.
 * Designed to be simple and linear — no loops, no conditionals, no code execution.
 */
export interface BrowserActionSpec {
  /** Which action to perform */
  action: BrowserActionType;
  /** CSS selector (required for click, fill, select, assertVisible, assertText) */
  selector?: string;
  /** Value for fill/select actions */
  value?: string;
  /** Relative URL path for navigate action (e.g., "/login"). Never a full URL. */
  path?: string;
  /** Expected text for assertText, or URL substring for assertUrl */
  expected?: string;
  /** Wait duration in ms for wait action (max 10_000) */
  waitMs?: number;
  /** Human-readable description of this step */
  description?: string;
}

/** Viewport preset for responsive testing */
export interface ViewportSpec {
  width: number;
  height: number;
  label: string;
}

/**
 * Context provided by the orchestrator to the browser executor.
 * The `baseUrl` is always a preview deployment URL — never production.
 */
export interface BrowserExecutionContext {
  /** Base URL of the preview deployment, e.g. "https://pr-42.keepvigil.dev" */
  baseUrl: string;
  /** Groq API key for spec generation via Claude */
  groqApiKey: string;
  /** Timeout per test item in milliseconds (default: 60_000) */
  timeoutMs?: number;
  /** Max retry attempts for flaky failures (default: 3) */
  maxRetries?: number;
  /** Viewports to test for visual items (default: mobile/tablet/desktop) */
  viewports?: ViewportSpec[];
}

/**
 * Context for metadata-only checking (OG tags, JSON-LD).
 * Does not require a browser — uses fetch + HTML parsing.
 */
export interface MetadataExecutionContext {
  /** Base URL of the preview deployment */
  baseUrl: string;
  /** Timeout per HTTP request in milliseconds (default: 15_000) */
  timeoutMs?: number;
}
