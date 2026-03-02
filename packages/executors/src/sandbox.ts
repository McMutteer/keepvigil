/**
 * Docker sandbox runner for the shell executor.
 *
 * Wraps `docker run` via `child_process.exec` to execute commands in an
 * isolated container with no network access, memory limits, and CPU limits.
 *
 * Security constraints applied to every sandbox invocation:
 *  - `--network none`  — no outbound or inbound network
 *  - `--memory 512m`   — memory cap to prevent OOM on host
 *  - `--cpus 1`        — single CPU to prevent resource exhaustion
 *  - `--rm`            — container is removed after exit (no state leakage)
 *  - read-write volume — commands may write build artifacts (e.g., dist/)
 */

import { exec, type ExecException } from "node:child_process";

const DEFAULT_SANDBOX_IMAGE = "node:22-alpine";
const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes

/**
 * Docker image name validator.
 * Accepts: [registry/]name[:tag] and name@sha256:<hex>
 * Rejects: values with spaces, leading dashes, or shell metacharacters
 * that could inject flags into the docker run command.
 */
const VALID_IMAGE_NAME = /^(?!-)[\w./-]+(:\w[\w.-]*)?(@sha256:[0-9a-f]{64})?$/;

function validateImageName(image: string): void {
  if (!VALID_IMAGE_NAME.test(image)) {
    throw new Error(`Invalid Docker image name: "${image}"`);
  }
}

export interface SandboxOptions {
  repoPath: string;
  timeoutMs?: number;
  sandboxImage?: string;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  /** Process exit code. -1 indicates a timeout. */
  exitCode: number;
  durationMs: number;
}

/**
 * Run a shell command inside a Docker sandbox.
 *
 * The command is passed to `sh -c` inside a fresh container with the repo
 * mounted at `/workspace`. Returns stdout/stderr/exitCode regardless of
 * whether the command succeeded or failed.
 */
export async function runInSandbox(
  command: string,
  opts: SandboxOptions,
): Promise<SandboxResult> {
  const image = opts.sandboxImage ?? DEFAULT_SANDBOX_IMAGE;
  validateImageName(image);
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid timeoutMs: ${timeoutMs}`);
  }

  // Escape the command for use as a sh -c argument.
  // Single-quote the command and escape any embedded single quotes.
  const escaped = command.replace(/'/g, "'\\''");

  const dockerCmd = [
    "docker run --rm",
    `--volume "${opts.repoPath}:/workspace"`,
    "--workdir /workspace",
    "--network none",
    "--memory 512m",
    "--cpus 1",
    image,
    `sh -c '${escaped}'`,
  ].join(" ");

  const startMs = Date.now();

  return new Promise<SandboxResult>((resolve) => {
    const child = exec(
      dockerCmd,
      { timeout: timeoutMs },
      (error: ExecException | null, stdout: string, stderr: string) => {
      const durationMs = Date.now() - startMs;

      if (error) {
        // child_process.exec sends SIGTERM when the timeout fires.
        // Use signal === 'SIGTERM' (not just error.killed) to distinguish
        // intentional timeout kills from other termination causes (e.g. maxBuffer).
        const isTimeout = error.killed && error.signal === "SIGTERM";
        const exitCode = isTimeout ? -1 : (error.code ?? 1);
        const timeoutStderr = isTimeout
          ? `Command timed out after ${timeoutMs}ms`
          : stderr;

        resolve({
          stdout: stdout ?? "",
          stderr: timeoutStderr ?? "",
          exitCode: typeof exitCode === "number" ? exitCode : 1,
          durationMs,
        });
        return;
      }

      resolve({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode: 0, durationMs });
      },
    );

    // Ensure the child reference is used (prevents lint warnings).
    void child;
  });
}
