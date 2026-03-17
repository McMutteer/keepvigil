import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mocks so they're available before module import
const mockPoolInstance = vi.hoisted(() => ({ end: vi.fn() }));
const mockPoolConstructor = vi.hoisted(() =>
  vi.fn().mockImplementation(function () {
    return mockPoolInstance;
  }),
);
const mockDrizzle = vi.hoisted(() => vi.fn());

vi.mock("pg", () => {
  return {
    default: {
      Pool: mockPoolConstructor,
    },
  };
});

vi.mock("drizzle-orm/node-postgres", () => {
  return {
    drizzle: mockDrizzle,
  };
});

vi.mock("../db/schema.js", () => ({
  installations: {},
  executions: {},
}));

import { createDb } from "../db/index.js";

describe("createDb", () => {
  beforeEach(() => {
    mockPoolConstructor.mockClear();
    mockPoolConstructor.mockImplementation(function () {
      return mockPoolInstance;
    });
    mockDrizzle.mockReset();
    mockDrizzle.mockReturnValue({ select: vi.fn() });
    mockPoolInstance.end.mockReset();
  });

  it("returns an object with db and pool properties", () => {
    const result = createDb("postgresql://user:pass@localhost:5432/vigil");

    expect(result).toHaveProperty("db");
    expect(result).toHaveProperty("pool");
    expect(result.pool).toBe(mockPoolInstance);
  });

  it("passes connection string and pool options to pg Pool", () => {
    createDb("postgresql://test:secret@db.example.com:5432/mydb");

    expect(mockPoolConstructor).toHaveBeenCalledWith({
      connectionString: "postgresql://test:secret@db.example.com:5432/mydb",
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  });

  it("passes pool instance and schema to drizzle", () => {
    createDb("postgresql://localhost/test");

    expect(mockDrizzle).toHaveBeenCalledWith(mockPoolInstance, {
      schema: expect.objectContaining({}),
    });
  });

  it("propagates Pool constructor errors", () => {
    mockPoolConstructor.mockImplementation(function () {
      throw new Error("Invalid connection string");
    });

    expect(() => createDb("not-a-valid-url")).toThrow("Invalid connection string");
  });

  it("propagates drizzle initialization errors", () => {
    mockDrizzle.mockImplementation(() => {
      throw new TypeError("Cannot read properties of undefined");
    });

    expect(() => createDb("postgresql://localhost/test")).toThrow(
      "Cannot read properties of undefined",
    );
  });

  it("works with empty connection string", () => {
    const result = createDb("");

    expect(mockPoolConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ connectionString: "" }),
    );
    expect(result).toHaveProperty("db");
    expect(result).toHaveProperty("pool");
  });

  it("pool.end() is callable for cleanup", () => {
    mockPoolInstance.end.mockResolvedValue(undefined);

    const { pool } = createDb("postgresql://localhost/test");
    pool.end();

    expect(mockPoolInstance.end).toHaveBeenCalledOnce();
  });

  it("configures max 20 connections", () => {
    createDb("postgresql://localhost/test");

    expect(mockPoolConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ max: 20 }),
    );
  });

  it("sets 5 second connection timeout", () => {
    createDb("postgresql://localhost/test");

    expect(mockPoolConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ connectionTimeoutMillis: 5_000 }),
    );
  });

  it("sets 30 second idle timeout", () => {
    createDb("postgresql://localhost/test");

    expect(mockPoolConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ idleTimeoutMillis: 30_000 }),
    );
  });
});
