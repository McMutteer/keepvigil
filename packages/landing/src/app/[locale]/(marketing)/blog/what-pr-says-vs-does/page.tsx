import type { Metadata } from "next";
import Link from "next/link";
import { isValidLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "The Gap Between What a PR Says and What It Does | Vigil Blog",
  description:
    "Every week, PRs ship with undocumented changes. New dependencies nobody mentioned. Schema changes buried in a large diff. Here's how to close the gap.",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-text-secondary leading-relaxed mb-4">{children}</p>;
}

function Example({ title, description, found }: { title: string; description: string; found: string }) {
  return (
    <div className="border border-white/[0.06] rounded-lg p-5 mb-4">
      <div className="text-text-primary font-medium mb-2">{title}</div>
      <div className="text-sm text-text-secondary mb-3">{description}</div>
      <div className="text-xs text-accent font-medium">{found}</div>
    </div>
  );
}

const content = {
  en: {
    title: "The Gap Between What a PR Says and What It Does",
    date: "March 26, 2026",
    readTime: "4 min read",
    backLabel: "← Back to blog",
    intro: "Your team merges 50 PRs a week. How many did someone actually read line by line? The answer is uncomfortable. And the gap between what PRs claim and what the code actually does is where bugs reach production.",
    sections: [
      {
        heading: "The anatomy of a missed change",
        paragraphs: [
          "A PR says \"Fix login timeout.\" The diff shows a timeout change in the auth service. Looks good, approved. But buried on line 247 of a 300-line diff, there's also a change to the session duration from 24 hours to 7 days. Nobody mentioned it. Nobody caught it.",
          "This isn't malicious. The developer fixed the timeout and, while they were in the file, adjusted the session duration too. They forgot to mention it in the description. The reviewer saw \"Fix login timeout\" and focused on the timeout logic. Both humans did their job — and a change shipped undocumented.",
        ],
      },
      {
        heading: "It gets worse with scale",
        paragraphs: [
          "Small teams with 5 PRs a week can catch these manually. At 50 PRs a week, nobody reads every line. At 200 PRs — common for teams using AI coding agents — the math is impossible.",
          "Every PR that ships with undocumented changes is a future debugging session. \"When did the session duration change?\" \"Why is this new dependency in our lock file?\" \"Who added this environment variable?\" The answers are buried in PR #847 from three weeks ago.",
        ],
      },
      {
        heading: "What undocumented changes look like",
        paragraphs: [
          "We've analyzed thousands of PRs. The most common undocumented changes fall into predictable categories:",
        ],
      },
    ],
    examples: [
      {
        title: "New dependencies",
        description: "PR description talks about a feature. The diff adds a new npm package. No mention of why it's needed or what it does.",
        found: "Caught by: Undocumented Changes signal",
      },
      {
        title: "Environment variables",
        description: "A new API_TIMEOUT variable appears in the code. The PR says \"improve API handling\" but doesn't mention the new config requirement.",
        found: "Caught by: Undocumented Changes signal",
      },
      {
        title: "Schema changes",
        description: "A database migration adds a nullable column. The PR is about a UI feature. The schema change enables the feature but isn't documented.",
        found: "Caught by: Undocumented Changes signal",
      },
      {
        title: "Behavioral changes",
        description: "Default values change. Error handling switches from throw to silent return. Retry logic gets removed. All legal code changes, none mentioned.",
        found: "Caught by: Claims Verifier + Undocumented Changes",
      },
    ],
    closingHeading: "Closing the gap",
    closingParagraphs: [
      "The fix isn't \"write better PR descriptions\" — humans will always forget things, and AI agents will always be confidently incomplete. The fix is automated verification.",
      "Vigil reads every PR description, extracts the claims, verifies each against the diff, and surfaces everything the description missed. It runs on every PR automatically — no config, no manual step, no human memory required.",
      "The gap between what a PR says and what it does doesn't have to be a mystery. It can be a report.",
    ],
    cta: "Start closing the gap →",
  },
  es: {
    title: "La brecha entre lo que dice un PR y lo que hace",
    date: "26 de marzo, 2026",
    readTime: "4 min de lectura",
    backLabel: "← Volver al blog",
    intro: "Tu equipo mergea 50 PRs a la semana. ¿Cuántos alguien realmente leyó línea por línea? La respuesta es incómoda. Y la brecha entre lo que los PRs afirman y lo que el código realmente hace es donde los bugs llegan a producción.",
    sections: [
      {
        heading: "La anatomía de un cambio perdido",
        paragraphs: [
          "Un PR dice \"Fix login timeout.\" El diff muestra un cambio de timeout en el servicio de auth. Se ve bien, aprobado. Pero enterrado en la línea 247 de un diff de 300 líneas, también hay un cambio en la duración de sesión de 24 horas a 7 días. Nadie lo mencionó. Nadie lo detectó.",
          "Esto no es malicioso. El desarrollador arregló el timeout y, ya que estaba en el archivo, ajustó la duración de sesión también. Olvidó mencionarlo en la descripción. El reviewer vio \"Fix login timeout\" y se enfocó en la lógica del timeout. Ambos humanos hicieron su trabajo — y un cambio llegó a producción sin documentar.",
        ],
      },
      {
        heading: "Con escala, empeora",
        paragraphs: [
          "Equipos pequeños con 5 PRs a la semana pueden detectar esto manualmente. Con 50 PRs a la semana, nadie lee cada línea. Con 200 PRs — común en equipos usando agentes de IA — la matemática es imposible.",
          "Cada PR que llega a producción con cambios no documentados es una futura sesión de debugging. \"¿Cuándo cambió la duración de sesión?\" \"¿Por qué hay esta nueva dependencia en nuestro lock file?\" \"¿Quién agregó esta variable de entorno?\" Las respuestas están enterradas en el PR #847 de hace tres semanas.",
        ],
      },
      {
        heading: "Cómo se ven los cambios no documentados",
        paragraphs: [
          "Hemos analizado miles de PRs. Los cambios no documentados más comunes caen en categorías predecibles:",
        ],
      },
    ],
    examples: [
      {
        title: "Nuevas dependencias",
        description: "La descripción del PR habla de una feature. El diff agrega un paquete npm nuevo. Sin mención de por qué se necesita o qué hace.",
        found: "Detectado por: signal Undocumented Changes",
      },
      {
        title: "Variables de entorno",
        description: "Una nueva variable API_TIMEOUT aparece en el código. El PR dice \"mejorar manejo de API\" pero no menciona el nuevo requisito de configuración.",
        found: "Detectado por: signal Undocumented Changes",
      },
      {
        title: "Cambios de schema",
        description: "Una migración agrega una columna nullable. El PR es sobre una feature de UI. El cambio de schema habilita la feature pero no se documenta.",
        found: "Detectado por: signal Undocumented Changes",
      },
      {
        title: "Cambios de comportamiento",
        description: "Valores por defecto cambian. El manejo de errores pasa de throw a return silencioso. La lógica de retry se elimina. Todos cambios legales, ninguno mencionado.",
        found: "Detectado por: Claims Verifier + Undocumented Changes",
      },
    ],
    closingHeading: "Cerrando la brecha",
    closingParagraphs: [
      "La solución no es \"escribir mejores descripciones\" — los humanos siempre olvidarán cosas, y los agentes de IA siempre serán confidentemente incompletos. La solución es verificación automatizada.",
      "Vigil lee cada descripción de PR, extrae las afirmaciones, verifica cada una contra el diff, y detecta todo lo que la descripción no mencionó. Se ejecuta en cada PR automáticamente — sin config, sin paso manual, sin memoria humana requerida.",
      "La brecha entre lo que dice un PR y lo que hace no tiene que ser un misterio. Puede ser un reporte.",
    ],
    cta: "Empieza a cerrar la brecha →",
  },
};

export default async function WhatPrSaysVsDoesPost({ params }: { params: Promise<{ locale: string }> }) {
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

      <div className="space-y-4 my-8">
        {t.examples.map((ex, i) => (
          <Example key={i} {...ex} />
        ))}
      </div>

      <H2>{t.closingHeading}</H2>
      {t.closingParagraphs.map((p, i) => (
        <P key={i}>{p}</P>
      ))}

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
