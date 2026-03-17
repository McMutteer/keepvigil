import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist mock so it's available before module import
const mockPino = vi.hoisted(() => {
  const fn = vi.fn();
  return fn;
});

vi.mock("pino", () => {
  return {
    default: mockPino,
  };
});

import {
  createLogger,
  runWithCorrelationId,
  getCorrelationId,
} from "../logger.js";

describe("createLogger", () => {
  const originalEnv = process.env.LOG_LEVEL;

  beforeEach(() => {
    mockPino.mockReset();
    mockPino.mockReturnValue({ info: vi.fn(), error: vi.fn() });
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.LOG_LEVEL = originalEnv;
    } else {
      delete process.env.LOG_LEVEL;
    }
  });

  it("returns a logger object", () => {
    const logger = createLogger("test");
    expect(logger).toBeDefined();
    expect(mockPino).toHaveBeenCalledOnce();
  });

  it("passes the name to pino", () => {
    createLogger("my-service");

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({ name: "my-service" }),
    );
  });

  it("defaults to info level when LOG_LEVEL is not set", () => {
    createLogger("test");

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({ level: "info" }),
    );
  });

  it("respects LOG_LEVEL env var", () => {
    process.env.LOG_LEVEL = "debug";
    createLogger("test");

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({ level: "debug" }),
    );
  });

  it("accepts uppercase LOG_LEVEL", () => {
    process.env.LOG_LEVEL = "WARN";
    createLogger("test");

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({ level: "warn" }),
    );
  });

  it("falls back to info for invalid LOG_LEVEL", () => {
    process.env.LOG_LEVEL = "banana";
    createLogger("test");

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({ level: "info" }),
    );
  });

  it("falls back to info for empty LOG_LEVEL", () => {
    process.env.LOG_LEVEL = "";
    createLogger("test");

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({ level: "info" }),
    );
  });

  it("accepts all valid log levels", () => {
    const levels = ["trace", "debug", "info", "warn", "error", "fatal", "silent"];
    for (const level of levels) {
      mockPino.mockReset();
      mockPino.mockReturnValue({ info: vi.fn() });
      process.env.LOG_LEVEL = level;
      createLogger("test");
      expect(mockPino).toHaveBeenCalledWith(
        expect.objectContaining({ level }),
      );
    }
  });

  it("provides a mixin function", () => {
    createLogger("test");

    const callArgs = mockPino.mock.calls[0][0];
    expect(callArgs.mixin).toBeTypeOf("function");
  });

  it("mixin returns empty object when no correlation ID is set", () => {
    createLogger("test");

    const callArgs = mockPino.mock.calls[0][0];
    const result = callArgs.mixin();
    expect(result).toEqual({});
  });

  it("mixin includes correlationId when inside runWithCorrelationId", () => {
    createLogger("test");

    const callArgs = mockPino.mock.calls[0][0];

    runWithCorrelationId("job-123", () => {
      const result = callArgs.mixin();
      expect(result).toEqual({ correlationId: "job-123" });
    });
  });
});

describe("runWithCorrelationId", () => {
  it("sets the correlation ID within the callback", () => {
    runWithCorrelationId("abc-123", () => {
      expect(getCorrelationId()).toBe("abc-123");
    });
  });

  it("clears the correlation ID after the callback", () => {
    runWithCorrelationId("abc-123", () => {
      // inside: set
    });
    expect(getCorrelationId()).toBeUndefined();
  });

  it("returns the callback return value", () => {
    const result = runWithCorrelationId("id-1", () => 42);
    expect(result).toBe(42);
  });

  it("supports nested correlation IDs (inner wins)", () => {
    runWithCorrelationId("outer", () => {
      expect(getCorrelationId()).toBe("outer");

      runWithCorrelationId("inner", () => {
        expect(getCorrelationId()).toBe("inner");
      });

      // outer is restored after inner exits
      expect(getCorrelationId()).toBe("outer");
    });
  });

  it("propagates errors from the callback", () => {
    expect(() =>
      runWithCorrelationId("err-id", () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
  });

  it("clears correlation ID even when callback throws", () => {
    try {
      runWithCorrelationId("err-id", () => {
        throw new Error("boom");
      });
    } catch {
      // expected
    }
    expect(getCorrelationId()).toBeUndefined();
  });
});

describe("getCorrelationId", () => {
  it("returns undefined when no correlation context is active", () => {
    expect(getCorrelationId()).toBeUndefined();
  });

  it("returns the current correlation ID inside a context", () => {
    runWithCorrelationId("ctx-456", () => {
      expect(getCorrelationId()).toBe("ctx-456");
    });
  });
});
