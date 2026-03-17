import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ClassifiedItem, TestPlanHints, LLMClient, AssertionExecutionContext } from "@vigil/core";

// Mock fs/promises
const mockReadFile = vi.hoisted(() => vi.fn());
vi.mock("node:fs/promises", () => ({ readFile: mockReadFile }));

import { executeAssertionItem } from "../assertion.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHints(overrides: Partial<TestPlanHints> = {}): TestPlanHints {
  return { isManual: false, codeBlocks: [], urls: [], ...overrides };
}

function makeClassified(
  text: string,
  codeBlocks: string[] = [],
  id = "tp-0",
): ClassifiedItem {
  return {
    item: {
      id,
      text,
      checked: false,
      raw: `- [ ] ${text}`,
      indent: 0,
      hints: makeHints({ codeBlocks }),
    },
    confidence: "HIGH",
    executorType: "assertion",
    category: "assertion",
    reasoning: "Test helper",
  };
}

const mockLLM: LLMClient = {
  model: "test-model",
  provider: "groq",
  chat: vi.fn(),
};

const baseContext: AssertionExecutionContext = {
  repoPath: "/tmp/repo",
  llm: mockLLM,
  timeoutMs: 5_000,
};

beforeEach(() => {
  vi.mocked(mockLLM.chat).mockReset();
  mockReadFile.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("executeAssertionItem", () => {
  it("passes when file exists and LLM verifies the assertion", async () => {
    mockReadFile.mockResolvedValue("FROM node:22\nUSER node\nCMD [\"node\", \"index.js\"]");
    vi.mocked(mockLLM.chat).mockResolvedValue(JSON.stringify({
      verified: true,
      reasoning: "The Dockerfile contains a USER node directive on line 2",
      relevantLines: "USER node",
    }));

    const item = makeClassified(
      "`Dockerfile` uses non-root USER directive",
      ["Dockerfile"],
    );
    const result = await executeAssertionItem(item, baseContext);

    expect(result.passed).toBe(true);
    expect(result.evidence).toMatchObject({
      file: "Dockerfile",
      exists: true,
      verified: true,
      reasoning: expect.stringContaining("USER node"),
      relevantLines: "USER node",
    });
  });

  it("fails when file exists but LLM rejects the assertion", async () => {
    mockReadFile.mockResolvedValue("FROM node:22\nCMD [\"node\", \"index.js\"]");
    vi.mocked(mockLLM.chat).mockResolvedValue(JSON.stringify({
      verified: false,
      reasoning: "No USER directive found in the Dockerfile",
      relevantLines: "",
    }));

    const item = makeClassified(
      "`Dockerfile` uses non-root USER directive",
      ["Dockerfile"],
    );
    const result = await executeAssertionItem(item, baseContext);

    expect(result.passed).toBe(false);
    expect(result.evidence).toMatchObject({
      file: "Dockerfile",
      exists: true,
      verified: false,
    });
  });

  it("fails when file is not found", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT: no such file"));

    const item = makeClassified(
      "`missing.ts` exports a function",
      ["missing.ts"],
    );
    const result = await executeAssertionItem(item, baseContext);

    expect(result.passed).toBe(false);
    expect(result.evidence).toMatchObject({
      file: "missing.ts",
      exists: false,
      reason: "File not found",
    });
  });

  it("returns infrastructure skip when no code blocks present", async () => {
    const item = makeClassified("Some assertion without a file path", []);
    const result = await executeAssertionItem(item, baseContext);

    expect(result.passed).toBe(true);
    expect(result.evidence).toMatchObject({
      skipped: true,
      infrastructureSkip: true,
    });
  });

  it("rejects path traversal attempts", async () => {
    const item = makeClassified(
      "`../../../etc/passwd` contains root user",
      ["../../../etc/passwd"],
    );
    const result = await executeAssertionItem(item, baseContext);

    expect(result.passed).toBe(false);
    expect(result.evidence).toMatchObject({
      file: "../../../etc/passwd",
      error: expect.stringContaining("Path traversal"),
    });
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("fails when LLM throws an error", async () => {
    mockReadFile.mockResolvedValue("const x = 1;");
    vi.mocked(mockLLM.chat).mockRejectedValue(new Error("API timeout"));

    const item = makeClassified(
      "`src/index.ts` exports default",
      ["src/index.ts"],
    );
    const result = await executeAssertionItem(item, baseContext);

    expect(result.passed).toBe(false);
    expect(result.evidence).toMatchObject({
      file: "src/index.ts",
      exists: true,
      error: expect.stringContaining("LLM verification failed"),
    });
  });

  it("extracts verification from natural language when JSON fails", async () => {
    mockReadFile.mockResolvedValue("const x = 1;");
    vi.mocked(mockLLM.chat).mockResolvedValue("I think the assertion is true based on the file content");

    const item = makeClassified("`src/index.ts` exports default", ["src/index.ts"]);
    const result = await executeAssertionItem(item, baseContext);

    expect(result.passed).toBe(true);
    expect((result.evidence as Record<string, unknown>).verified).toBe(true);
  });

  it("fails when LLM returns completely unparseable response", async () => {
    mockReadFile.mockResolvedValue("const x = 1;");
    vi.mocked(mockLLM.chat).mockResolvedValue("---");

    const item = makeClassified("`src/index.ts` exports default", ["src/index.ts"]);
    const result = await executeAssertionItem(item, baseContext);

    expect(result.passed).toBe(false);
    expect(result.evidence).toMatchObject({
      file: "src/index.ts",
      exists: true,
      error: "Could not parse LLM response",
    });
  });

  it("handles LLM response wrapped in fenced code block", async () => {
    mockReadFile.mockResolvedValue("USER node");
    vi.mocked(mockLLM.chat).mockResolvedValue('```json\n{"verified": true, "reasoning": "found it", "relevantLines": "USER node"}\n```');

    const item = makeClassified(
      "`Dockerfile` uses non-root USER directive",
      ["Dockerfile"],
    );
    const result = await executeAssertionItem(item, baseContext);

    expect(result.passed).toBe(true);
    expect(result.evidence).toMatchObject({ verified: true });
  });

  it("rejects absolute paths", async () => {
    const item = makeClassified(
      "`/etc/passwd` contains root user",
      ["/etc/passwd"],
    );
    const result = await executeAssertionItem(item, baseContext);

    expect(result.passed).toBe(false);
    expect(result.evidence).toMatchObject({
      error: expect.stringContaining("Absolute paths are not allowed"),
    });
    expect(mockReadFile).not.toHaveBeenCalled();
  });
});
