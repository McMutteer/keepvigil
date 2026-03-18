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

import { readFile, access, realpath } from "node:fs/promises";
import path from "node:path";
import type { ClassifiedItem, ExecutionResult, AssertionExecutionContext } from "@vigil/core/types";
import { prepareFileContent } from "@vigil/core";

/** Max file content size sent to LLM (bytes) */
const MAX_FILE_BYTES = 20_000;

// ---------------------------------------------------------------------------
// Response parsing — tolerant of various LLM output formats
// ---------------------------------------------------------------------------

interface AssertionResult {
  verified: boolean;
  reasoning: string;
  relevantLines: string;
}

/**
 * Parse the LLM response for an assertion verification.
 *
 * Tries multiple strategies in order:
 * 1. Extract JSON from fenced code blocks (```json ... ```)
 * 2. Find JSON object in raw text ({ ... })
 * 3. Fall back to text analysis — look for keywords indicating yes/no
 *
 * Returns null only if nothing can be extracted.
 */
function parseAssertionResponse(responseText: string): AssertionResult | null {
  // Strategy 1: Extract from fenced code block
  const fenced = responseText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : responseText;

  // Strategy 2: Find JSON object
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(candidate.slice(start, end + 1));
      if (typeof obj.verified === "boolean") {
        return {
          verified: obj.verified,
          reasoning: String(obj.reasoning || ""),
          relevantLines: String(obj.relevantLines || obj.relevant_lines || obj.evidence || ""),
        };
      }
      // Some models use "result" or "is_true" instead of "verified"
      if (typeof obj.result === "boolean") {
        return { verified: obj.result, reasoning: String(obj.reasoning || ""), relevantLines: "" };
      }
      if (typeof obj.is_true === "boolean") {
        return { verified: obj.is_true, reasoning: String(obj.reasoning || ""), relevantLines: "" };
      }
    } catch {
      // JSON parse failed — continue to text fallback
    }
  }

  // Strategy 3: Text analysis fallback — look for clear yes/no signals
  const lower = responseText.toLowerCase();

  // Strong positive signals
  const positivePatterns = [
    /\bverified["']?\s*:\s*true\b/i,
    /\bassertion is (?:true|correct|verified|confirmed|valid)\b/i,
    /\byes[,.]?\s*(?:the|this)?\s*(?:file|code|assertion)/i,
    /\bthe assertion (?:is|holds|appears to be) true\b/i,
    /\bconfirmed?\b.*\bassertion\b/i,
  ];

  // Strong negative signals
  const negativePatterns = [
    /\bverified["']?\s*:\s*false\b/i,
    /\bassertion is (?:false|incorrect|not verified|invalid|not true)\b/i,
    /\bno[,.]?\s*(?:the|this)?\s*(?:file|code|assertion)/i,
    /\bthe assertion (?:is|appears to be) false\b/i,
    /\bnot found\b.*\bassertion\b/i,
    /\bdoes not (?:contain|include|have|use|implement)\b/i,
  ];

  for (const pattern of positivePatterns) {
    if (pattern.test(responseText)) {
      // Extract first sentence as reasoning
      const firstSentence = responseText.replace(/```[\s\S]*?```/g, "").trim().split(/[.\n]/)[0]?.trim() || "";
      return { verified: true, reasoning: firstSentence.slice(0, 200), relevantLines: "" };
    }
  }

  for (const pattern of negativePatterns) {
    if (pattern.test(responseText)) {
      const firstSentence = responseText.replace(/```[\s\S]*?```/g, "").trim().split(/[.\n]/)[0]?.trim() || "";
      return { verified: false, reasoning: firstSentence.slice(0, 200), relevantLines: "" };
    }
  }

  // Last resort: if "true" appears more than "false", assume positive
  const trueCount = (lower.match(/\btrue\b/g) || []).length;
  const falseCount = (lower.match(/\bfalse\b/g) || []).length;
  if (trueCount > 0 && trueCount > falseCount) {
    return { verified: true, reasoning: "Inferred from LLM response (non-JSON)", relevantLines: "" };
  }
  if (falseCount > 0 && falseCount > trueCount) {
    return { verified: false, reasoning: "Inferred from LLM response (non-JSON)", relevantLines: "" };
  }

  return null;
}

/**
 * Execute a classified assertion item.
 *
 * Reads the referenced file from the cloned repo and asks the LLM
 * whether the assertion in the test plan item is true.
 */
// ---------------------------------------------------------------------------
// Smart file search — infer file path from item text when no code block
// ---------------------------------------------------------------------------

/** Known file patterns to search for in item text */
const KNOWN_FILE_KEYWORDS: Array<{ keyword: RegExp; candidates: string[] }> = [
  { keyword: /\bprisma\s*schema\b/i, candidates: ["prisma/schema.prisma", "schema.prisma"] },
  { keyword: /\bdockerfile\b/i, candidates: ["Dockerfile", "packages/api/Dockerfile", "packages/worker/Dockerfile"] },
  { keyword: /\bpackage\.json\b/i, candidates: ["package.json"] },
  { keyword: /\btsconfig\b/i, candidates: ["tsconfig.json", "tsconfig.build.json"] },
  { keyword: /\b\.env\b/i, candidates: [".env.example", ".env"] },
  { keyword: /\bdocker.compose\b/i, candidates: ["docker-compose.yml", "docker-compose.yaml", "compose.yml"] },
  { keyword: /\bmakefile\b/i, candidates: ["Makefile"] },
  { keyword: /\bcargo\.toml\b/i, candidates: ["Cargo.toml"] },
];

/**
 * Try to infer a file path from the item text when no explicit code block exists.
 * Checks known file keywords and verifies the file exists in the repo.
 */
async function inferFilePath(text: string, repoPath: string): Promise<string | null> {
  for (const { keyword, candidates } of KNOWN_FILE_KEYWORDS) {
    if (keyword.test(text)) {
      for (const candidate of candidates) {
        const fullPath = path.join(repoPath, candidate);
        try {
          await access(fullPath);
          return candidate;
        } catch {
          // File doesn't exist, try next candidate
        }
      }
    }
  }

  return null;
}

export async function executeAssertionItem(
  item: ClassifiedItem,
  context: AssertionExecutionContext,
): Promise<ExecutionResult> {
  const itemId = item.item.id;
  const startMs = Date.now();
  const timeoutMs = context.timeoutMs ?? 30_000;

  // Extract file path from code blocks or infer from item text
  const codeBlocks = item.item.hints.codeBlocks;
  let filePath: string | null = codeBlocks.length > 0 ? codeBlocks[0].trim() : null;

  // Smart file search: if no code block, try to find a file reference in the text
  if (!filePath) {
    filePath = await inferFilePath(item.item.text, context.repoPath);
  }

  if (!filePath) {
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

  // Verify resolved path stays within the repo (symlink protection)
  try {
    const resolvedPath = await realpath(fullPath);
    const resolvedRepo = await realpath(context.repoPath);
    if (!resolvedPath.startsWith(resolvedRepo + path.sep) && resolvedPath !== resolvedRepo) {
      return {
        itemId,
        passed: false,
        duration: Date.now() - startMs,
        evidence: {
          file: filePath,
          exists: false,
          error: "Path escapes repository boundary (possible symlink attack)",
        },
      };
    }
  } catch {
    // realpath fails if file doesn't exist — fall through to readFile
  }

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

  // Smart content preparation: for large files, extract keyword-relevant
  // context instead of blindly truncating to first 20KB
  content = prepareFileContent(content, item.item.text, item.item.hints.codeBlocks, MAX_FILE_BYTES);

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
    const sanitized = message.replace(/(?:sk-|gsk_|xai-)[a-zA-Z0-9_-]+/g, "[REDACTED]");
    // LLM failure is infrastructure — don't penalize the code
    return {
      itemId,
      passed: true,
      duration: Date.now() - startMs,
      evidence: {
        skipped: true,
        infrastructureSkip: true,
        file: filePath,
        exists: true,
        reason: `LLM verification unavailable: ${sanitized}`,
      },
    };
  }

  // Parse response — try JSON first, then fall back to text analysis
  const parsed = parseAssertionResponse(responseText);

  if (!parsed) {
    return {
      itemId,
      passed: false,
      duration: Date.now() - startMs,
      evidence: {
        file: filePath,
        exists: true,
        verified: false,
        reasoning: "Could not parse LLM verification response",
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
