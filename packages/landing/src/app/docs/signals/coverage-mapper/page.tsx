import type { Metadata } from "next";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Coverage Mapper | Vigil Docs",
  description:
    "Checks whether changed files in the PR have corresponding test files.",
};

export default function CoverageMapperPage() {
  const { prev, next } = getPrevNext("/docs/signals/coverage-mapper");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Coverage Mapper
      </h1>
      <p className="text-text-secondary mb-8">
        Weight: 10 &middot; Free tier
      </p>

      <p className="text-text-secondary leading-relaxed mb-4">
        The Coverage Mapper signal checks whether each file changed in the PR
        has a corresponding test file. It does not run the tests — it simply
        verifies that test files exist, giving you a structural coverage metric.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Naming Conventions
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil recognizes test files across multiple languages and naming
        patterns:
      </p>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        TypeScript / JavaScript
      </h3>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            *.test.ts
          </code>{" "}
          /{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            *.test.tsx
          </code>
        </li>
        <li>
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            *.spec.ts
          </code>{" "}
          /{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            *.spec.tsx
          </code>
        </li>
        <li>
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            __tests__/*
          </code>{" "}
          directory
        </li>
      </ul>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Python
      </h3>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            test_*.py
          </code>
        </li>
      </ul>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Go
      </h3>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            *_test.go
          </code>
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Exclusions
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Certain files are excluded from coverage analysis because they
        typically do not require dedicated test files:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <strong className="text-text-primary">Dockerfiles</strong> —{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            Dockerfile
          </code>{" "}
          in any subdirectory
        </li>
        <li>
          <strong className="text-text-primary">Docker Compose</strong> —{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            docker-compose*
          </code>{" "}
          files
        </li>
        <li>
          <strong className="text-text-primary">Example files</strong> —{" "}
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
            .example
          </code>{" "}
          extension
        </li>
        <li>
          <strong className="text-text-primary">Config files</strong> — common
          configuration files that are not testable source code
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        New Files
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Files that are <strong className="text-text-primary">added</strong>{" "}
        (not modified) in the PR are skipped from coverage analysis. Newly
        created files may not need tests yet — the developer may be scaffolding
        a feature that will get test coverage in a follow-up PR. Only modified
        files are expected to already have test coverage.
      </p>

      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Scoring
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The score is the percentage of eligible changed files that have a
        corresponding test file. If 8 out of 10 changed files have tests, the
        score is 80. Files that are excluded or newly added do not count toward
        the denominator.
      </p>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
