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

/** A test plan item after classification */
export interface ClassifiedItem {
  /** The original parsed item */
  item: TestPlanItem;
  /** Confidence tier determining execution strategy */
  confidence: ConfidenceTier;
  /** Which executor should handle this item */
  executorType: ExecutorType;
  /** Category label: build, api, ui-flow, visual, metadata, manual, vague */
  category: string;
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
