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
export type ExecutorType = "shell" | "api" | "browser" | "assertion" | "none";

/** Category label for a classified item */
export type CategoryLabel = "build" | "api" | "ui-flow" | "visual" | "metadata" | "assertion" | "manual" | "vague";

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
  /** LLM client for spec generation */
  llm: LLMClient;
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
  /** Additional command prefixes allowed beyond the built-in allowlist (from .vigil.yml) */
  extraAllowPrefixes?: string[];
}

/**
 * Context provided by the orchestrator to the assertion executor.
 * Reads files from the cloned repo and uses LLM to verify claims.
 */
export interface AssertionExecutionContext {
  /** Absolute path to the cloned repository on the host */
  repoPath: string;
  /** LLM client for assertion verification */
  llm: LLMClient;
  /** Timeout in milliseconds (default: 30_000) */
  timeoutMs?: number;
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
  /** LLM client for spec generation */
  llm: LLMClient;
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

// ---------------------------------------------------------------------------
// LLM client (v2 BYOLLM)
// ---------------------------------------------------------------------------

/** Supported LLM providers */
export type LLMProvider = "openai" | "groq" | "ollama";

/** Reasoning effort levels for models that support chain-of-thought */
export type ReasoningEffort = "none" | "low" | "medium" | "high";

/** Configuration for creating an LLM client */
export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  /** Default reasoning effort for all calls from this client */
  reasoningEffort?: ReasoningEffort;
}

/** Unified LLM client interface — all consumers use this */
export interface LLMClient {
  /** Send a chat completion request and return the response text */
  chat(params: {
    system: string;
    user: string;
    /** Per-request timeout in milliseconds (default: 15_000) */
    timeoutMs?: number;
    /** Override reasoning effort for this specific call */
    reasoningEffort?: ReasoningEffort;
  }): Promise<string>;
  /** The model being used (for logging/debugging) */
  readonly model: string;
  /** The provider being used (for logging/debugging) */
  readonly provider: LLMProvider;
}

// ---------------------------------------------------------------------------
// Confidence score signals (v2)
// ---------------------------------------------------------------------------

/** Identifies which signal produced this result */
export type SignalId =
  | "ci-bridge"
  | "credential-scan"
  | "coverage-mapper"
  | "executor"
  | "diff-analyzer"
  | "gap-analyzer"
  | "plan-augmentor"
  | "contract-checker"
  | "claims-verifier"
  | "undocumented-changes";

/** Pipeline mode — determines which weight profile to use */
export type PipelineMode = "v1+v2" | "v2-only";

/** One detail line within a signal — explains a specific finding */
export interface SignalDetail {
  /** Short label for this detail (e.g., "npm run build", "src/auth.ts") */
  label: string;
  /** Outcome of this detail */
  status: "pass" | "fail" | "warn" | "skip";
  /** Human-readable explanation */
  message: string;
  /** File path in the diff (for inline review comments) */
  file?: string;
  /** Line number in the new file (for inline review comments) */
  line?: number;
}

/** A single signal contributing to the confidence score */
export interface Signal {
  /** Which signal produced this */
  id: SignalId;
  /** Human-readable name (e.g., "CI Bridge", "Credential Scan") */
  name: string;
  /** Score for this signal (0-100) */
  score: number;
  /** Relative importance — used for weighted average */
  weight: number;
  /** Binary: did this signal pass overall? false = found a problem */
  passed: boolean;
  /** Per-item breakdown */
  details: SignalDetail[];
  /** Whether this signal required an LLM to produce */
  requiresLLM: boolean;
}

/** Merge recommendation derived from the confidence score */
export type ScoreRecommendation = "safe" | "review" | "caution";

/** The final computed confidence score for a PR */
export interface ConfidenceScore {
  /** Weighted average of all signals (0-100) */
  score: number;
  /** Human-readable merge recommendation */
  recommendation: ScoreRecommendation;
  /** All signals that contributed to the score */
  signals: Signal[];
  /** Signal IDs that couldn't run (no LLM, no repo, etc.) */
  skippedSignals: SignalId[];
}

// ---------------------------------------------------------------------------
// Per-repo configuration (.vigil.yml)
// ---------------------------------------------------------------------------

/**
 * Parsed and validated contents of a repo's `.vigil.yml` file.
 * All fields are optional — omitted fields use hardcoded defaults.
 */
export interface VigilConfig {
  /** Webhook notification settings */
  notifications?: {
    /** When to send notifications: "failure" (default) or "always" */
    on?: "failure" | "always";
    /** Webhook URLs (Slack, Discord, or generic HTTPS endpoints). Max 5. */
    urls?: string[];
  };
  /** Auto-approve PRs when score exceeds threshold (Pro/Team only) */
  autoApprove?: {
    /** Minimum score to auto-approve (80-100). */
    threshold: number;
  };
  /** Coverage mapper settings */
  coverage?: {
    /** Path prefixes to exclude from coverage analysis (e.g., "packages/landing/") */
    exclude?: string[];
  };
}
