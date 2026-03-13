/**
 * Shell executor — runs DETERMINISTIC/shell classified test plan items.
 *
 * Accepts a `ClassifiedItem` with `executorType: "shell"`, extracts shell
 * commands from `hints.codeBlocks`, validates each against the allowlist,
 * and runs them sequentially in a Docker sandbox.
 *
 * Evidence shape (stored in ExecutionResult.evidence):
 *   {
 *     commands: string[];   // all codeBlocks from the item
 *     stdout:   string;     // stdout of last executed command (or failing one)
 *     stderr:   string;     // stderr of last executed command (or failing one)
 *     exitCode: number;     // exit code (-1 = timeout, 0 = success)
 *   }
 */

import type { ClassifiedItem, ExecutionResult, ShellExecutionContext } from "@vigil/core/types";
import { validateCommand } from "./allowlist.js";
import { runInSandbox } from "./sandbox.js";

/**
 * Execute a classified shell item.
 *
 * Runs all code blocks from the item sequentially. Stops on the first
 * failure (non-zero exit code or disallowed command). A passed result
 * requires ALL commands to succeed.
 */
export async function executeShellItem(
  item: ClassifiedItem,
  context: ShellExecutionContext,
): Promise<ExecutionResult> {
  const commands = item.item.hints.codeBlocks;
  const itemId = item.item.id;
  const startMs = Date.now();

  if (commands.length === 0) {
    return {
      itemId,
      passed: false,
      duration: Date.now() - startMs,
      evidence: {
        commands: [],
        stdout: "",
        stderr: "",
        exitCode: -1,
        reason: "No commands found in test plan item",
      },
    };
  }

  let lastStdout = "";
  let lastStderr = "";
  let lastExitCode = 0;

  for (const command of commands) {
    const validation = validateCommand(command, context.extraAllowPrefixes);

    if (!validation.allowed) {
      return {
        itemId,
        passed: false,
        duration: Date.now() - startMs,
        evidence: {
          commands,
          stdout: "",
          stderr: "",
          exitCode: -1,
          reason: validation.reason,
        },
      };
    }

    const result = await runInSandbox(command, context);
    lastStdout = result.stdout;
    lastStderr = result.stderr;
    lastExitCode = result.exitCode;

    if (result.exitCode !== 0) {
      return {
        itemId,
        passed: false,
        duration: Date.now() - startMs,
        evidence: {
          commands,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        },
      };
    }
  }

  return {
    itemId,
    passed: true,
    duration: Date.now() - startMs,
    evidence: {
      commands,
      stdout: lastStdout,
      stderr: lastStderr,
      exitCode: lastExitCode,
    },
  };
}
