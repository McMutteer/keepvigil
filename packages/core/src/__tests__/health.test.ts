import { describe, it, expect } from "vitest";
import type { HealthCheck } from "@vigil/core";

describe("HealthCheck type", () => {
  it("should accept a valid health check object", () => {
    const health: HealthCheck = {
      status: "ok",
      service: "vigil",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
    };

    expect(health.status).toBe("ok");
    expect(health.service).toBe("vigil");
  });
});
