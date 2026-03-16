import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadConfig } from "../config.js";

const validEnv: Record<string, string> = {
  GITHUB_APP_ID: "123",
  GITHUB_APP_PRIVATE_KEY: "-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----",
  GITHUB_WEBHOOK_SECRET: "webhook-secret",
  REDIS_URL: "redis://localhost:6379",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/vigil",
  GROQ_API_KEY: "gsk_test_key",
};

describe("loadConfig", () => {
  beforeEach(() => {
    // Stub only required vars; PORT and NODE_ENV are intentionally omitted
    // so Zod defaults (3200 and "development") apply unless a test overrides them.
    for (const [k, v] of Object.entries(validEnv)) {
      vi.stubEnv(k, v);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a valid AppConfig when all required vars are present", () => {
    const config = loadConfig();
    expect(config.githubAppId).toBe("123");
    expect(config.githubPrivateKey).toBe(validEnv.GITHUB_APP_PRIVATE_KEY);
    expect(config.githubWebhookSecret).toBe("webhook-secret");
    expect(config.redisUrl).toBe("redis://localhost:6379");
    expect(config.databaseUrl).toBe("postgresql://user:pass@localhost:5432/vigil");
    expect(config.groqApiKey).toBe("gsk_test_key");
  });

  it("defaults port to 3200 when PORT is not set", () => {
    // PORT is not stubbed → process.env.PORT is undefined → Zod default applies
    const config = loadConfig();
    expect(config.port).toBe(3200);
  });

  it("coerces PORT string to number", () => {
    vi.stubEnv("PORT", "8080");
    const config = loadConfig();
    expect(config.port).toBe(8080);
  });

  it("throws when PORT is not a number", () => {
    vi.stubEnv("PORT", "abc");
    expect(() => loadConfig()).toThrow(/Configuration error/);
  });

  it("throws when PORT is out of valid range", () => {
    vi.stubEnv("PORT", "99999");
    expect(() => loadConfig()).toThrow(/Configuration error/);
  });

  it("passes through NODE_ENV=production when set", () => {
    vi.stubEnv("NODE_ENV", "production");
    const config = loadConfig();
    expect(config.nodeEnv).toBe("production");
  });

  it("passes through NODE_ENV=staging when set", () => {
    vi.stubEnv("NODE_ENV", "staging");
    const config = loadConfig();
    expect(config.nodeEnv).toBe("staging");
  });

  it("throws when GITHUB_APP_ID is missing", () => {
    vi.stubEnv("GITHUB_APP_ID", "");
    expect(() => loadConfig()).toThrow(/Configuration error/);
  });

  it("throws when GITHUB_APP_PRIVATE_KEY is missing", () => {
    vi.stubEnv("GITHUB_APP_PRIVATE_KEY", "");
    expect(() => loadConfig()).toThrow(/Configuration error/);
  });

  it("allows empty GROQ_API_KEY (optional)", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const config = loadConfig();
    expect(config.groqApiKey).toBe("");
  });

  it("reports all missing required vars in a single error (not just the first)", () => {
    vi.stubEnv("GITHUB_APP_ID", "");
    vi.stubEnv("GITHUB_WEBHOOK_SECRET", "");

    let errorMessage = "";
    try {
      loadConfig();
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    // Both issues should be reported together
    expect(errorMessage).toMatch(/githubAppId/);
    expect(errorMessage).toMatch(/githubWebhookSecret/);
  });

  it("throws when REDIS_URL is not a valid URL", () => {
    vi.stubEnv("REDIS_URL", "not-a-url");
    expect(() => loadConfig()).toThrow(/Configuration error/);
  });

  it("throws when DATABASE_URL is not a valid URL", () => {
    // "not-a-url" has no scheme — URL constructor rejects it
    vi.stubEnv("DATABASE_URL", "not-a-url");
    expect(() => loadConfig()).toThrow(/Configuration error/);
  });

  it("throws when DATABASE_URL is an empty string", () => {
    vi.stubEnv("DATABASE_URL", "");
    expect(() => loadConfig()).toThrow(/Configuration error/);
  });
});
