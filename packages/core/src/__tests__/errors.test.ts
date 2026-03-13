import { describe, it, expect } from "vitest";
import {
  VigilTransientError,
  VigilPermanentError,
  VigilSecurityError,
  isTransientError,
  isPermanentError,
} from "../errors.js";

describe("VigilTransientError", () => {
  it("has correct name", () => {
    expect(new VigilTransientError("msg").name).toBe("VigilTransientError");
  });

  it("has correct message", () => {
    expect(new VigilTransientError("network timeout").message).toBe("network timeout");
  });

  it("stores cause", () => {
    const cause = new Error("root");
    const err = new VigilTransientError("wrapper", cause);
    expect(err.cause).toBe(cause);
  });

  it("works without cause", () => {
    const err = new VigilTransientError("msg");
    expect(err.cause).toBeUndefined();
  });

  it("isTransient flag is true", () => {
    expect(new VigilTransientError("msg").isTransient).toBe(true);
  });

  it("is an instance of Error", () => {
    expect(new VigilTransientError("msg")).toBeInstanceOf(Error);
  });
});

describe("VigilPermanentError", () => {
  it("has correct name", () => {
    expect(new VigilPermanentError("msg").name).toBe("VigilPermanentError");
  });

  it("has correct message", () => {
    expect(new VigilPermanentError("invalid input").message).toBe("invalid input");
  });

  it("stores cause", () => {
    const cause = { code: 400 };
    const err = new VigilPermanentError("bad request", cause);
    expect(err.cause).toBe(cause);
  });

  it("isPermanent flag is true", () => {
    expect(new VigilPermanentError("msg").isPermanent).toBe(true);
  });

  it("is an instance of Error", () => {
    expect(new VigilPermanentError("msg")).toBeInstanceOf(Error);
  });
});

describe("VigilSecurityError", () => {
  it("has correct name", () => {
    expect(new VigilSecurityError("path traversal").name).toBe("VigilSecurityError");
  });

  it("has correct message", () => {
    expect(new VigilSecurityError("injection attempt").message).toBe("injection attempt");
  });

  it("is an instance of VigilPermanentError", () => {
    expect(new VigilSecurityError("msg")).toBeInstanceOf(VigilPermanentError);
  });

  it("is an instance of Error", () => {
    expect(new VigilSecurityError("msg")).toBeInstanceOf(Error);
  });

  it("isSecurity flag is true", () => {
    expect(new VigilSecurityError("msg").isSecurity).toBe(true);
  });

  it("stores cause", () => {
    const cause = "bad segment";
    const err = new VigilSecurityError("msg", cause);
    expect(err.cause).toBe(cause);
  });
});

describe("isTransientError", () => {
  it("returns true for VigilTransientError", () => {
    expect(isTransientError(new VigilTransientError("msg"))).toBe(true);
  });

  it("returns false for VigilPermanentError", () => {
    expect(isTransientError(new VigilPermanentError("msg"))).toBe(false);
  });

  it("returns false for plain Error", () => {
    expect(isTransientError(new Error("msg"))).toBe(false);
  });

  it("returns false for string", () => {
    expect(isTransientError("error")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isTransientError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isTransientError(undefined)).toBe(false);
  });
});

describe("isPermanentError", () => {
  it("returns true for VigilPermanentError", () => {
    expect(isPermanentError(new VigilPermanentError("msg"))).toBe(true);
  });

  it("returns true for VigilSecurityError (extends permanent)", () => {
    expect(isPermanentError(new VigilSecurityError("msg"))).toBe(true);
  });

  it("returns false for VigilTransientError", () => {
    expect(isPermanentError(new VigilTransientError("msg"))).toBe(false);
  });

  it("returns false for plain Error", () => {
    expect(isPermanentError(new Error("msg"))).toBe(false);
  });

  it("returns false for null", () => {
    expect(isPermanentError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isPermanentError(undefined)).toBe(false);
  });
});
