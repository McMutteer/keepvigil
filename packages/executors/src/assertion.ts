/**
 * Assertion executor — verifies code assertions by reading files and checking with LLM.
 *
 * When an AI agent writes "Dockerfile uses non-root USER directive", this executor
 * reads the actual Dockerfile and asks the LLM to verify the claim.
 *
 * Evidence shape:
 * {
 *   file: string,           // file path
 *   exists: boolean,        // whether file was found
 *   verified: boolean,      // LLM's assessment
 *   reasoning: string,      // LLM's explanation
 *   relevantLines: string,  // relevant code snippet
 * }
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ClassifiedItem, ExecutionResult, AssertionExecutionContext } from "@vigil/core/types";

/** Max file content size sent to LLM (bytes) */
const MAX_FILE_BYTES = 20_000;

/**
 * Execute a classified assertion item.
 *
 * Reads the referenced file from the cloned repo and asks the LLM
 * whether the assertion in the test plan item is true.
 */
export async function executeAssertionItem(
  item: ClassifiedItem,
  context: AssertionExecutionContext,
): Promise<ExecutionResult> {
  const itemId = item.item.id;
  const startMs = Date.now();
  const timeoutMs = context.timeoutMs ?? 30_000;

  // Extract file path from first code block
  const codeBlocks = item.item.hints.codeBlocks;
  if (codeBlocks.length === 0) {
    return {
      itemId,
      passed: true,
      duration: Date.now() - startMs,
      evidence: {
        skipped: true,
        infrastructureSkip: true,
        reason: "No file path found in test plan item",
      },
    };
  }

  const filePath = codeBlocks[0].trim();

  // Sanitize: reject path traversal
  if (filePath.includes("..")) {
    return {
      itemId,
      passed: false,
      duration: Date.now() - startMs,
      evidence: {
        file: filePath,
        exists: false,
        error: "Path traversal detected — rejected for security",
      },
    };
  }

  // Ensure path is relative (not absolute)
  if (path.isAbsolute(filePath)) {
    return {
      itemId,
      passed: false,
      duration: Date.now() - startMs,
      evidence: {
        file: filePath,
        exists: false,
        error: "Absolute paths are not allowed — must be relative to repository root",
      },
    };
  }

  const fullPath = path.join(context.repoPath, filePath);

  // Read the file
  let content: string;
  try {
    content = await readFile(fullPath, "utf-8");
  } catch {
    return {
      itemId,
      passed: false,
      duration: Date.now() - startMs,
      evidence: {
        file: filePath,
        exists: false,
        reason: "File not found",
      },
    };
  }

  // Truncate large files
  if (Buffer.byteLength(content, "utf-8") > MAX_FILE_BYTES) {
    // Byte-safe truncation: encode, slice bytes, decode back
    const truncated = Buffer.from(content, "utf-8").subarray(0, MAX_FILE_BYTES).toString("utf-8");
    // Remove potential partial multi-byte char at the end
    content = truncated.replace(/[\uFFFD]$/, "") + "\n\n...(truncated)";
  }

  // Ask LLM to verify the assertion
  const systemPrompt =
    "You verify assertions about source code files. Given a file's content and an assertion about it, determine if the assertion is true. Return ONLY valid JSON: { \"verified\": true/false, \"reasoning\": \"brief explanation\", \"relevantLines\": \"the line(s) that prove/disprove the assertion\" }";

  const userPrompt = `File: \`${filePath}\`\n\nContent:\n\`\`\`\n${content}\n\`\`\`\n\nAssertion: ${item.item.text}`;

  let responseText: string;
  try {
    responseText = await context.llm.chat({
      system: systemPrompt,
      user: userPrompt,
      timeoutMs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Scrub potential tokens from error messages
    const sanitized = message.replace(/(?:sk-|gsk_|xai-)[a-zA-Z0-9_-]+/g, "[REDACTED]");
    return {
      itemId,
      passed: false,
      duration: Date.now() - startMs,
      evidence: {
        file: filePath,
        exists: true,
        error: `LLM verification failed: ${sanitized}`,
      },
    };
  }

  // Parse JSON response from LLM
  let parsed: { verified: boolean; reasoning: string; relevantLines: string };
  try {
    // Try to extract JSON from fenced code block first
    const fenced = responseText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : responseText;

    // Find JSON object boundaries
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON object found in response");
    }

    parsed = JSON.parse(candidate.slice(start, end + 1));

    if (typeof parsed.verified !== "boolean") {
      throw new Error("Missing 'verified' boolean field");
    }
  } catch {
    return {
      itemId,
      passed: false,
      duration: Date.now() - startMs,
      evidence: {
        file: filePath,
        exists: true,
        error: "LLM returned invalid JSON response",
      },
    };
  }

  return {
    itemId,
    passed: parsed.verified,
    duration: Date.now() - startMs,
    evidence: {
      file: filePath,
      exists: true,
      verified: parsed.verified,
      reasoning: parsed.reasoning || "No reasoning provided",
      relevantLines: parsed.relevantLines || "",
    },
  };
}
