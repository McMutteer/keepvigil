import type { Metadata } from "next";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Assertion Verifier | Vigil Docs",
  description:
    "Reads actual source files and verifies test plan claims using LLM analysis.",
};

export default function AssertionVerifierPage() {
  const { prev, next } = getPrevNext("/docs/signals/assertion-verifier");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Assertion Verifier
      </h1>
      <p className="text-text-secondary mb-8">
        Free tier &middot; Uses executor weight
      </p>

      <p className="text-text-secondary leading-relaxed mb-4">
        The Assertion Verifier reads actual source files from your repository
        and verifies claims made in the test plan. When your test plan says
        &ldquo;Dockerfile uses non-root USER directive&rdquo; or
        &ldquo;auth.ts validates JWT tokens,&rdquo; Vigil opens the file, reads
        the content, and sends it to an LLM along with the claim to verify
        whether it holds true.
      </p>

      <Callout variant="info" title="The most-used executor">
        72% of AI-generated test plan items are file assertions. This signal is
        what makes Vigil unique — no competitor verifies code claims by actually
        reading the files.
      </Callout>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        How It Works
      </h2>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">Step 1:</strong> Extracts the
          file path from the test plan item&apos;s code block (e.g.,{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            src/auth.ts
          </code>
          ).
        </li>
        <li>
          <strong className="text-text-primary">Step 2:</strong> Reads the file
          from the cloned repository.
        </li>
        <li>
          <strong className="text-text-primary">Step 3:</strong> Sends the file
          content along with the assertion to the LLM.
        </li>
        <li>
          <strong className="text-text-primary">Step 4:</strong> Parses the LLM
          response using a 3-strategy approach: JSON parsing, fenced code block
          extraction, then text analysis as a fallback.
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Smart File Search
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        When no explicit file path is given in the test plan item, Vigil
        infers the file from keywords. For example:
      </p>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Keyword
              </th>
              <th className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted border-b border-white/[0.06]">
                Resolved file
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                &ldquo;Prisma schema&rdquo;
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  schema.prisma
                </code>
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                &ldquo;Dockerfile&rdquo;
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  Dockerfile
                </code>
              </td>
            </tr>
            <tr>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                &ldquo;Docker Compose&rdquo;
              </td>
              <td className="py-2 px-3 text-text-secondary border-b border-white/[0.04]">
                <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
                  docker-compose.yml
                </code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Security
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The Assertion Verifier rejects path traversal attempts (
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          ../
        </code>
        ) and absolute paths. It can only read files within the cloned
        repository directory, preventing access to system files or other
        repositories.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Edge Cases
      </h2>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">File not found:</strong>{" "}
          Returns a failed result with &ldquo;File not found&rdquo; as
          evidence. The item is marked as failed, not skipped.
        </li>
        <li>
          <strong className="text-text-primary">LLM error:</strong> Returns an
          infrastructure skip. If the LLM is unreachable or returns an
          unparseable response, the item does not penalize the score.
        </li>
      </ul>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
