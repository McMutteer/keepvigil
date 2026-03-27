import type { Metadata } from "next";
import Link from "next/link";
import { isValidLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "Vigil vs CodeRabbit: Different Jobs, Same PR | Vigil Blog",
  description:
    "CodeRabbit reviews code quality. Vigil verifies truthfulness. They're complementary tools that together give you a complete picture of every pull request.",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-text-secondary leading-relaxed mb-4">{children}</p>;
}

function ComparisonRow({ label, vigil, coderabbit }: { label: string; vigil: string; coderabbit: string }) {
  return (
    <tr className="border-b border-white/[0.06]">
      <td className="py-3 pr-4 text-sm text-text-primary font-medium">{label}</td>
      <td className="py-3 px-4 text-sm text-text-secondary">{vigil}</td>
      <td className="py-3 pl-4 text-sm text-text-secondary">{coderabbit}</td>
    </tr>
  );
}

const content = {
  en: {
    title: "Vigil vs CodeRabbit: Different Jobs, Same PR",
    date: "March 25, 2026",
    readTime: "3 min read",
    backLabel: "← Back to blog",
    intro: "This isn't a \"who's better\" post. Vigil and CodeRabbit do fundamentally different things on the same pull request. Understanding the difference helps you decide if you need one, the other, or both.",
    sections: [
      {
        heading: "What CodeRabbit does",
        paragraphs: [
          "CodeRabbit is an AI code reviewer. It reads your diff and analyzes code quality: style issues, potential bugs, performance problems, security patterns, best practices. It suggests improvements line by line.",
          "Think of it as an automated senior developer reviewing your code. It catches bugs you missed and suggests better patterns.",
        ],
      },
      {
        heading: "What Vigil does",
        paragraphs: [
          "Vigil is a PR verification tool. It reads your PR description, extracts every claim (\"adds auth middleware,\" \"fixes timeout\"), and checks each one against the actual diff. Then it scans for changes the description didn't mention.",
          "Think of it as an auditor who checks if the PR does what it says it does. It doesn't judge code quality — it judges truthfulness.",
        ],
      },
      {
        heading: "Real example: PR #98 in our own repo",
        paragraphs: [
          "When we ran both tools on our codebase, PR #98 was the clearest example of complementarity. CodeRabbit found a test that didn't validate what it claimed — the assertion always passed because the test data made it trivially true. That's a code quality issue.",
          "Vigil, on the same PR, verified that every claim in the description matched the diff and found an undocumented change: a new LLM model configuration that wasn't mentioned. That's a truthfulness issue.",
          "Neither tool caught what the other caught. Together, they covered both dimensions.",
        ],
      },
      {
        heading: "When you need both",
        paragraphs: [
          "If your team uses AI coding agents (Cursor, Claude Code, Devin), you need both. AI agents write code confidently — their descriptions are always polished but not always accurate. CodeRabbit catches quality issues in the code. Vigil catches mismatches between the description and the diff.",
          "If you're a small team reviewing PRs manually, start with whichever gap is bigger. If your code quality is solid but PRs slip through with undocumented changes, Vigil fills that gap. If your descriptions are accurate but code quality varies, CodeRabbit fills that gap.",
        ],
      },
    ],
    comparison: {
      heading: "Side by side",
      headers: ["", "Vigil", "CodeRabbit"],
      rows: [
        { label: "Primary function", vigil: "Verify PR claims", coderabbit: "Review code quality" },
        { label: "Reads", vigil: "PR title + description + diff", coderabbit: "Diff + codebase context" },
        { label: "Output", vigil: "Confidence score (0-100)", coderabbit: "Line-by-line suggestions" },
        { label: "Catches", vigil: "Undocumented changes, false claims", coderabbit: "Bugs, style issues, anti-patterns" },
        { label: "Best for", vigil: "AI-generated PRs, trust verification", coderabbit: "Code quality, best practices" },
      ],
    },
    cta: "Install Vigil alongside CodeRabbit →",
  },
  es: {
    title: "Vigil vs CodeRabbit: Trabajos diferentes, mismo PR",
    date: "25 de marzo, 2026",
    readTime: "3 min de lectura",
    backLabel: "← Volver al blog",
    intro: "Este no es un post de \"quién es mejor\". Vigil y CodeRabbit hacen cosas fundamentalmente diferentes en el mismo pull request. Entender la diferencia te ayuda a decidir si necesitas uno, el otro, o ambos.",
    sections: [
      {
        heading: "Qué hace CodeRabbit",
        paragraphs: [
          "CodeRabbit es un revisor de código con IA. Lee tu diff y analiza la calidad del código: problemas de estilo, bugs potenciales, rendimiento, patrones de seguridad, buenas prácticas. Sugiere mejoras línea por línea.",
          "Piensa en él como un desarrollador senior automatizado revisando tu código. Detecta bugs que pasaste por alto y sugiere mejores patrones.",
        ],
      },
      {
        heading: "Qué hace Vigil",
        paragraphs: [
          "Vigil es una herramienta de verificación de PRs. Lee la descripción de tu PR, extrae cada afirmación (\"agrega middleware de auth,\" \"corrige timeout\"), y verifica cada una contra el diff real. Luego busca cambios que la descripción no mencionó.",
          "Piensa en él como un auditor que verifica si el PR hace lo que dice. No juzga la calidad del código — juzga la veracidad.",
        ],
      },
      {
        heading: "Ejemplo real: PR #98 en nuestro propio repo",
        paragraphs: [
          "Cuando corrimos ambas herramientas en nuestro código, el PR #98 fue el ejemplo más claro de complementariedad. CodeRabbit encontró un test que no validaba lo que afirmaba — la aserción siempre pasaba porque los datos de prueba la hacían trivialmente verdadera. Eso es un problema de calidad.",
          "Vigil, en el mismo PR, verificó que cada claim en la descripción coincidiera con el diff y encontró un cambio no documentado: una nueva configuración de modelo LLM que no se mencionaba. Eso es un problema de veracidad.",
          "Ninguna herramienta detectó lo que la otra detectó. Juntas, cubrieron ambas dimensiones.",
        ],
      },
      {
        heading: "Cuándo necesitas ambas",
        paragraphs: [
          "Si tu equipo usa agentes de IA (Cursor, Claude Code, Devin), necesitas ambas. Los agentes escriben código con confianza — sus descripciones siempre son pulidas pero no siempre precisas. CodeRabbit detecta problemas de calidad. Vigil detecta discrepancias entre la descripción y el diff.",
          "Si eres un equipo pequeño revisando PRs manualmente, empieza con la que cubra tu mayor brecha. Si la calidad de tu código es sólida pero los PRs pasan con cambios no documentados, Vigil llena ese hueco. Si tus descripciones son precisas pero la calidad varía, CodeRabbit llena ese hueco.",
        ],
      },
    ],
    comparison: {
      heading: "Lado a lado",
      headers: ["", "Vigil", "CodeRabbit"],
      rows: [
        { label: "Función principal", vigil: "Verificar claims del PR", coderabbit: "Revisar calidad de código" },
        { label: "Lee", vigil: "Título + descripción + diff", coderabbit: "Diff + contexto del codebase" },
        { label: "Output", vigil: "Score de confianza (0-100)", coderabbit: "Sugerencias línea por línea" },
        { label: "Detecta", vigil: "Cambios no documentados, claims falsos", coderabbit: "Bugs, estilo, anti-patrones" },
        { label: "Ideal para", vigil: "PRs de IA, verificación de confianza", coderabbit: "Calidad de código, buenas prácticas" },
      ],
    },
    cta: "Instala Vigil junto a CodeRabbit →",
  },
};

export default async function VigilVsCodeRabbitPost({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale: Locale = isValidLocale(localeParam) ? localeParam : "en";
  const t = content[locale];

  return (
    <article className="mx-auto max-w-[720px] px-6 py-16 sm:py-24">
      <Link href={`/${locale}/blog`} className="text-sm text-text-muted hover:text-accent transition-colors">
        {t.backLabel}
      </Link>
      <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mt-6 mb-2">{t.title}</h1>
      <div className="flex items-center gap-3 text-xs text-text-muted mb-12">
        <time>{t.date}</time>
        <span>·</span>
        <span>{t.readTime}</span>
      </div>

      <P>{t.intro}</P>

      {t.sections.map((section, i) => (
        <div key={i}>
          <H2>{section.heading}</H2>
          {section.paragraphs.map((p, j) => (
            <P key={j}>{p}</P>
          ))}
        </div>
      ))}

      <H2>{t.comparison.heading}</H2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.1]">
              {t.comparison.headers.map((h, i) => (
                <th key={i} className="py-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.comparison.rows.map((row, i) => (
              <ComparisonRow key={i} {...row} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-12 text-center">
        <a
          href="https://github.com/apps/keepvigil"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-[6px] text-sm font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors"
        >
          {t.cta}
        </a>
      </div>
    </article>
  );
}
