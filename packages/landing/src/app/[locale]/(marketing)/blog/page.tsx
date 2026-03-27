import type { Metadata } from "next";
import Link from "next/link";
import { isValidLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";

const POSTS = [
  {
    slug: "what-pr-says-vs-does",
    date: "2026-03-26",
    title: {
      en: "The Gap Between What a PR Says and What It Does",
      es: "La brecha entre lo que dice un PR y lo que hace",
    },
    excerpt: {
      en: "Every week, PRs ship with undocumented changes. New dependencies nobody mentioned. Schema changes buried in a large diff. Here's how to close the gap.",
      es: "Cada semana, PRs llegan a producción con cambios no documentados. Dependencias nuevas que nadie mencionó. Cambios de schema enterrados en diffs grandes.",
    },
    readTime: { en: "4 min read", es: "4 min de lectura" },
  },
  {
    slug: "vigil-vs-coderabbit",
    date: "2026-03-25",
    title: {
      en: "Vigil vs CodeRabbit: Different Jobs, Same PR",
      es: "Vigil vs CodeRabbit: Trabajos diferentes, mismo PR",
    },
    excerpt: {
      en: "CodeRabbit reviews code quality. Vigil verifies truthfulness. They're complementary tools that together give you a complete picture of every pull request.",
      es: "CodeRabbit revisa calidad de código. Vigil verifica veracidad. Son herramientas complementarias que juntas dan una imagen completa de cada pull request.",
    },
    readTime: { en: "3 min read", es: "3 min de lectura" },
  },
  {
    slug: "ai-verification",
    date: "2026-03-24",
    title: {
      en: "AI Agents Write Code — Who Verifies It?",
      es: "Los agentes de IA escriben código — ¿quién lo verifica?",
    },
    excerpt: {
      en: "AI coding agents ship PRs in minutes. But confidence in the description doesn't mean accuracy in the diff. Here's why verification is the missing layer.",
      es: "Los agentes de IA crean PRs en minutos. Pero confianza en la descripción no significa precisión en el diff. Por qué la verificación es la capa que falta.",
    },
    readTime: { en: "4 min read", es: "4 min de lectura" },
  },
  {
    slug: "dogfooding",
    date: "2026-03-21",
    title: {
      en: "We ran Vigil on our own AI-generated PRs",
      es: "Probamos Vigil en nuestros propios PRs generados por IA",
    },
    excerpt: {
      en: "What happens when you point a PR verification tool at its own codebase? We found hardcoded URIs, undocumented behavior, and a score trajectory from 59 to 93.",
      es: "Qué pasa cuando apuntas una herramienta de verificación de PRs a su propio código? Encontramos URIs hardcodeados, comportamiento no documentado, y una trayectoria de score de 59 a 93.",
    },
    readTime: { en: "5 min read", es: "5 min de lectura" },
  },
];

export const metadata: Metadata = {
  title: "Blog | Vigil",
  description: "Insights on PR verification, AI-assisted development, and code trust.",
};

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = isValidLocale(localeParam) ? localeParam : "en";

  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">Blog</h1>
      <p className="text-text-muted mb-12">
        {locale === "en"
          ? "Insights on PR verification and AI-assisted development."
          : "Perspectivas sobre verificaci\u00f3n de PRs y desarrollo asistido por IA."}
      </p>

      <div className="space-y-8">
        {POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/${locale}/blog/${post.slug}`}
            className="block group"
          >
            <article className="border border-white/[0.06] rounded-lg p-6 hover:border-accent/30 transition-colors">
              <time className="text-xs text-text-muted">{post.date}</time>
              <h2 className="text-lg font-medium text-text-primary mt-1 mb-2 group-hover:text-accent transition-colors">
                {post.title[locale]}
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                {post.excerpt[locale]}
              </p>
              <span className="text-xs text-text-muted mt-3 inline-block">
                {post.readTime[locale]}
              </span>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
