/** Health check response shape */
export interface HealthCheck {
  status: "ok" | "degraded" | "error";
  service: string;
  version: string;
  timestamp: string;
}

/** Parsed test plan item from a PR description (Section 3) */
export interface TestPlanItem {
  id: string;
  text: string;
  checked: boolean;
  raw: string;
}

/** Result of executing a single test plan item (Section 5+) */
export interface ExecutionResult {
  itemId: string;
  passed: boolean;
  duration: number;
  evidence: Record<string, unknown>;
}
