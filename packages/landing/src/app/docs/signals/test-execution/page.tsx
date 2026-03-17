import type { Metadata } from "next";
import Link from "next/link";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Test Execution | Vigil Docs",
  description:
    "Four executor types run test plan items: shell, API, browser, and assertion.",
};

export default function TestExecutionPage() {
  const { prev, next } = getPrevNext("/docs/signals/test-execution");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Test Execution
      </h1>
      <p className="text-text-secondary mb-8">
        Weight: 15 &middot; Free tier
      </p>

      <p className="text-text-secondary leading-relaxed mb-4">
        The Test Execution signal runs test plan items using one of four
        executor types. Vigil&apos;s classifier analyzes each item and routes it
        to the appropriate executor automatically. The result is evidence-based
        — executors never throw exceptions. Failures become structured evidence
        in the result, ensuring that every item produces a meaningful outcome.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Shell Executor
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Runs shell commands in a sandboxed Docker container using{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          node:22-alpine
        </code>{" "}
        as the default image. The container runs with{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          --network none
        </code>{" "}
        to prevent network access, ensuring commands cannot exfiltrate data or
        reach external services.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        Commands must match the{" "}
        <Link href="/docs/shell-allowlist" className="text-accent hover:underline">
          shell allowlist
        </Link>
        . Any command not on the allowlist is rejected before execution. This
        includes common test runners like{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          npm test
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          pnpm test
        </code>
        ,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          pnpm lint
        </code>
        , and{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          pnpm typecheck
        </code>
        . You can extend the allowlist via{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          .vigil.yml
        </code>
        .
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        API Executor
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Makes HTTP requests to validate API endpoints. The executor sends the
        request as specified in the test plan item and checks the response
        status code and body against expected values.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        SSRF protection is built in — the executor validates base URLs and
        blocks requests to localhost, private IP ranges, and URLs containing
        credentials. See the{" "}
        <Link href="/docs/security" className="text-accent hover:underline">
          Security
        </Link>{" "}
        page for details.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Browser Executor
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Uses Playwright to automate browser interactions — navigate to pages,
        click elements, fill forms, take screenshots, and run assertions. This
        executor requires a deployment preview URL (from Vercel, Netlify, or
        similar services) to function.
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        If no preview URL is available, browser test items receive an
        infrastructure skip status and do not penalize the score.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Assertion Executor
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Reads source files from the cloned repository and verifies claims using
        an LLM. This is the most commonly triggered executor — 72% of
        AI-generated test plan items are file assertions like
        &ldquo;Dockerfile uses non-root USER directive&rdquo; or
        &ldquo;auth.ts validates JWT tokens.&rdquo;
      </p>
      <p className="text-text-secondary leading-relaxed mb-4">
        The assertion executor uses smart file path inference to locate files
        when no explicit path is provided. For example, a claim about
        &ldquo;Prisma schema&rdquo; will find{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          schema.prisma
        </code>{" "}
        automatically. See the{" "}
        <Link
          href="/docs/signals/assertion-verifier"
          className="text-accent hover:underline"
        >
          Assertion Verifier
        </Link>{" "}
        page for the full details.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Error-as-Evidence Model
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Executors are designed to never throw exceptions. When a command fails,
        a request times out, or a file is not found, the failure is captured as
        structured evidence in the execution result. This ensures that every
        test plan item produces a meaningful outcome — either a pass, a fail
        with evidence, or an infrastructure skip.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
