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
  /** Anthropic API key for spec generation via Claude */
  anthropicApiKey: string;
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
