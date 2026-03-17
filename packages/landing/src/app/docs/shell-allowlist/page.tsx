import type { Metadata } from "next";
import { CodeBlock } from "@/components/docs/code-block";
import { Callout } from "@/components/docs/callout";
import { PrevNext } from "@/components/docs/prev-next";
import { getPrevNext } from "@/lib/docs-nav";

export const metadata: Metadata = {
  title: "Shell Allowlist | Vigil Docs",
  description:
    "Which commands Vigil can execute in the sandbox and how to add your own.",
};

export default function ShellAllowlistPage() {
  const { prev, next } = getPrevNext("/docs/shell-allowlist");

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-2">
        Shell Allowlist
      </h1>
      <p className="text-text-secondary mb-8">
        Which commands Vigil can execute in the sandbox and how to add your own.
      </p>

      {/* Built-in Allowed Commands */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Built-in Allowed Commands
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil ships with a curated list of safe commands organized by ecosystem.
        Any test plan item containing one of these commands will be executed
        automatically.
      </p>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        npm
      </h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 px-3 text-text-secondary border-b border-white/[0.04] font-mono text-sm">
                npm run, npm test, npm build, npm install, npm ci, npm lint
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        pnpm
      </h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 px-3 text-text-secondary border-b border-white/[0.04] font-mono text-sm">
                pnpm run, pnpm test, pnpm build, pnpm install, pnpm dlx, pnpm lint, pnpm typecheck
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        yarn
      </h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 px-3 text-text-secondary border-b border-white/[0.04] font-mono text-sm">
                yarn run, yarn test, yarn build, yarn install, yarn lint
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        bun
      </h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 px-3 text-text-secondary border-b border-white/[0.04] font-mono text-sm">
                bun run, bun test, bun build, bun install, bun lint
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        npx (restricted tools)
      </h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 px-3 text-text-secondary border-b border-white/[0.04] font-mono text-sm">
                eslint, prettier, tsc, tsup, vitest, jest, playwright, biome, oxlint, svelte-check, astro, next, nuxt, turbo
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-text-secondary leading-relaxed mb-4">
        Only these specific tools are allowed via{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">npx</code>.
        Arbitrary{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">npx</code>{" "}
        commands are blocked to prevent installing and executing unknown packages.
      </p>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Docker
      </h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 px-3 text-text-secondary border-b border-white/[0.04] font-mono text-sm">
                docker build, docker run, docker compose
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Build tools
      </h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 px-3 text-text-secondary border-b border-white/[0.04] font-mono text-sm">
                make (any target)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Rust
      </h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 px-3 text-text-secondary border-b border-white/[0.04] font-mono text-sm">
                cargo test, cargo build, cargo check, cargo clippy
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Go
      </h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 px-3 text-text-secondary border-b border-white/[0.04] font-mono text-sm">
                go test, go build, go vet
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Python
      </h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 px-3 text-text-secondary border-b border-white/[0.04] font-mono text-sm">
                pytest, ruff check, ruff format
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-text-primary mt-8 mb-3">
        Testing frameworks
      </h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-1.5 px-3 text-text-secondary border-b border-white/[0.04] font-mono text-sm">
                jest, vitest
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Custom Commands */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Custom Commands
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        If your project uses commands not on the built-in list, add them via the{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          shell.allow
        </code>{" "}
        section in your{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          .vigil.yml
        </code>
        :
      </p>
      <CodeBlock
        filename=".vigil.yml"
        code={`shell:
  allow:
    - mix test
    - mix format --check-formatted
    - dotnet test
    - gradle test
    - mvn test`}
      />
      <p className="text-text-secondary leading-relaxed mb-4">
        A maximum of 20 custom entries are allowed. Each entry is matched as a
        prefix — for example,{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          mix test
        </code>{" "}
        allows{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          mix test --trace
        </code>{" "}
        and{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          mix test test/my_test.exs
        </code>
        .
      </p>

      {/* Command Chains */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Command Chains (&&)
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        Vigil supports{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          &&
        </code>{" "}
        chains. Each segment of the chain is validated independently against the
        allowlist. For example:
      </p>
      <CodeBlock
        filename="test plan item"
        code={`- [ ] \`cd packages/api && npm test\``}
      />
      <p className="text-text-secondary leading-relaxed mb-4">
        This works because{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          cd
        </code>{" "}
        is always safe (Vigil blocks{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          ../
        </code>{" "}
        path traversal) and{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          npm test
        </code>{" "}
        is on the allowlist. Both segments pass validation, so the full chain
        executes.
      </p>

      {/* Blocked Patterns */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Blocked Patterns
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        The following shell metacharacters are always blocked to prevent command
        injection and arbitrary code execution:
      </p>
      <CodeBlock
        filename="blocked metacharacters"
        code={`;  |  \`  $  <  >  \\n  \\r  (  )  {  }`}
      />
      <p className="text-text-secondary leading-relaxed mb-4">
        Additionally, certain{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          npx
        </code>{" "}
        flags are blocked because they can load arbitrary configurations or
        plugins:
      </p>
      <ul className="list-disc ml-6 space-y-1 text-text-secondary mb-4">
        <li>
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">--config</code>
        </li>
        <li>
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">--resolve-plugins-relative-to</code>
        </li>
        <li>
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">--rulesdir</code>
        </li>
        <li>
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">--plugin</code>
        </li>
        <li>
          <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">-c</code>
        </li>
      </ul>
      <p className="text-text-secondary leading-relaxed mb-4">
        These flags could allow an attacker to craft a test plan item that loads
        a malicious ESLint config or Prettier plugin, effectively achieving
        arbitrary code execution. Blocking them ensures that only the tool
        itself runs, using the project&apos;s own configuration files.
      </p>

      {/* Custom Docker Image */}
      <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
        Custom Docker Image
      </h2>
      <p className="text-text-secondary leading-relaxed mb-4">
        By default, shell commands run in a Node.js-based Docker image. If your
        project needs specific dependencies (Python, Go, Rust, system
        libraries), you can specify a custom image:
      </p>
      <CodeBlock
        filename=".vigil.yml"
        code={`shell:
  image: node:22-slim
  allow:
    - mix test`}
      />
      <p className="text-text-secondary leading-relaxed mb-4">
        The image must be publicly accessible on Docker Hub or a registry that
        the Vigil server can pull from. Your repository is mounted read-only
        inside the container.
      </p>

      <Callout variant="security" title="Sandbox Isolation">
        All shell commands run in a Docker container with{" "}
        <code className="font-mono text-sm bg-code-bg px-1.5 py-0.5 rounded text-code-text">
          --network none
        </code>
        . No internet access, no access to your host machine. The container is
        destroyed after each run.
      </Callout>

      <PrevNext prev={prev} next={next} />
    </>
  );
}
