import type { Metadata } from "next";
import Link from "next/link";
import { isValidLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";

export const metadata: Metadata = {
  title: "We ran Vigil on our own AI-generated PRs | Vigil Blog",
  description:
    "What happens when you point a PR verification tool at its own codebase? We found hardcoded URIs, undocumented behavior, and watched scores climb from 59 to 93.",
};

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4">
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-text-secondary leading-relaxed mb-4">{children}</p>
  );
}

function Score({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const color =
    value >= 80 ? "text-success" : value >= 70 ? "text-warning" : "text-failure";
  return (
    <div className="flex items-baseline gap-2">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-sm text-text-muted">{label}</span>
    </div>
  );
}

function Finding({
  signal,
  title,
  description,
}: {
  signal: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-white/[0.06] rounded-lg p-5 mb-4">
      <div className="text-xs text-accent font-medium mb-1">{signal}</div>
      <div className="text-text-primary font-medium mb-2">{title}</div>
      <div className="text-sm text-text-secondary">{description}</div>
    </div>
  );
}

const content = {
  en: {
    back: "\u2190 Back to blog",
    date: "March 21, 2026",
    readTime: "5 min read",
    title: "We ran Vigil on our own AI-generated PRs",
    subtitle:
      "What happens when you point a PR verification tool at its own codebase? Real findings, real scores, real improvements.",
    intro1:
      "Every PR in the Vigil codebase is written by AI agents \u2014 Claude Code, primarily. We use Vigil to verify every single one. Not as a marketing stunt, but because we need to. When your entire codebase is AI-generated, the gap between \u201cwhat the PR says\u201d and \u201cwhat the code does\u201d becomes the most important thing to verify.",
    intro2:
      "Here\u2019s what happened when we pointed Vigil at its own PRs.",
    findingsTitle: "Three real findings",
    finding1Signal: "Undocumented Changes",
    finding1Title: "Hardcoded redirect URI in auth flow",
    finding1Desc:
      "PR #82 added GitHub OAuth. The PR description mentioned \u201cadds auth flow.\u201d What it didn\u2019t mention: the callback URL was hardcoded to https://keepvigil.dev/api/auth/callback. No environment variable, no configuration. Vigil flagged it as an undocumented change. In a multi-environment setup, this would have broken staging and development.",
    finding2Signal: "Claims Verifier",
    finding2Title: "Auto-approve creates undocumented GitHub review",
    finding2Desc:
      "PR #92 implemented auto-approve for high-score PRs. The description said \u201cadds auto-approve when score > threshold.\u201d What it didn\u2019t say: it creates a GitHub review with an APPROVE event \u2014 a side effect that changes the PR\u2019s merge status. Vigil caught the gap between what was claimed and what the code actually did.",
    finding3Signal: "Undocumented Changes",
    finding3Title: "Silent redirect page added without mention",
    finding3Desc:
      "PR #93 added i18n support. Buried in the diff: a new redirect page routing /docs to /docs/getting-started. Not mentioned anywhere in the PR description. Small? Yes. The kind of thing that slips through review? Also yes.",
    scoresTitle: "The score trajectory",
    scoresBefore: "Before fixes (PRs #81\u2013#86)",
    scoresAfter: "After fixes (PRs #91\u2013#93)",
    scoresExplain:
      "Our early PRs scored between 59 and 70. The main culprit: false positives. Template literal confusion was destroying JSX diffs (10+ false positives per PR). Credential scan was flagging test files. Coverage mapper was complaining about Dockerfiles not having tests.",
    scoresFixed:
      "We fixed each issue systematically (PRs #88 and #94). False positive rate dropped from ~10/PR to ~0/PR. Scores climbed from the 60s to the 80s and 90s.",
    lessonsTitle: "What we learned",
    lesson1:
      "AI-generated code is syntactically correct but narratively incomplete. The code compiles. The tests pass. But the PR description doesn\u2019t tell the full story. That\u2019s the gap Vigil fills.",
    lesson2:
      "False positives matter more than false negatives. A tool that cries wolf gets ignored. We spent more time reducing false positives than adding features \u2014 and it was worth it.",
    lesson3:
      "Verification is not review. Code review asks \u201cis this code good?\u201d Verification asks \u201cdoes this PR actually do what it claims?\u201d They\u2019re complementary, not competing.",
    ctaTitle: "Try it on your repos",
    ctaText:
      "Vigil is free for unlimited repos. Install from the GitHub Marketplace, open a PR, and see what it finds.",
    ctaButton: "Install Vigil",
  },
  es: {
    back: "\u2190 Volver al blog",
    date: "21 de marzo de 2026",
    readTime: "5 min de lectura",
    title: "Probamos Vigil en nuestros propios PRs generados por IA",
    subtitle:
      "Qu\u00e9 pasa cuando apuntas una herramienta de verificaci\u00f3n de PRs a su propio c\u00f3digo? Hallazgos reales, scores reales, mejoras reales.",
    intro1:
      "Cada PR en el c\u00f3digo de Vigil est\u00e1 escrito por agentes de IA \u2014 principalmente Claude Code. Usamos Vigil para verificar cada uno. No como truco de marketing, sino porque lo necesitamos. Cuando todo tu c\u00f3digo es generado por IA, la brecha entre \u201clo que dice el PR\u201d y \u201clo que hace el c\u00f3digo\u201d se convierte en lo m\u00e1s importante a verificar.",
    intro2: "Esto es lo que pas\u00f3 cuando apuntamos Vigil a sus propios PRs.",
    findingsTitle: "Tres hallazgos reales",
    finding1Signal: "Undocumented Changes",
    finding1Title: "URI de redirecci\u00f3n hardcodeada en flujo de auth",
    finding1Desc:
      "El PR #82 agreg\u00f3 GitHub OAuth. La descripci\u00f3n mencionaba \u201cagrega flujo de auth.\u201d Lo que no mencion\u00f3: la URL de callback estaba hardcodeada a https://keepvigil.dev/api/auth/callback. Sin variable de entorno, sin configuraci\u00f3n. Vigil lo flag\u00f3 como cambio no documentado. En un setup multi-ambiente, esto habr\u00eda roto staging y desarrollo.",
    finding2Signal: "Claims Verifier",
    finding2Title: "Auto-approve crea review de GitHub no documentado",
    finding2Desc:
      "El PR #92 implement\u00f3 auto-approve para PRs con score alto. La descripci\u00f3n dec\u00eda \u201cagrega auto-approve cuando score > threshold.\u201d Lo que no dec\u00eda: crea un review de GitHub con evento APPROVE \u2014 un efecto secundario que cambia el estado de merge del PR. Vigil captur\u00f3 la brecha entre lo declarado y lo que realmente hac\u00eda el c\u00f3digo.",
    finding3Signal: "Undocumented Changes",
    finding3Title: "P\u00e1gina de redirecci\u00f3n silenciosa agregada sin menci\u00f3n",
    finding3Desc:
      "El PR #93 agreg\u00f3 soporte i18n. Enterrado en el diff: una nueva p\u00e1gina redirect de /docs a /docs/getting-started. No mencionada en ninguna parte de la descripci\u00f3n del PR. \u00bfPeque\u00f1o? S\u00ed. \u00bfEl tipo de cosa que se escapa en review? Tambi\u00e9n.",
    scoresTitle: "La trayectoria de scores",
    scoresBefore: "Antes de fixes (PRs #81\u2013#86)",
    scoresAfter: "Despu\u00e9s de fixes (PRs #91\u2013#93)",
    scoresExplain:
      "Nuestros primeros PRs sacaron entre 59 y 70. El culpable: falsos positivos. La confusi\u00f3n de template literals destru\u00eda diffs de JSX (10+ falsos positivos por PR). El credential scan flaggeaba archivos de test. El coverage mapper se quejaba de que Dockerfiles no ten\u00edan tests.",
    scoresFixed:
      "Arreglamos cada problema sistem\u00e1ticamente (PRs #88 y #94). La tasa de falsos positivos baj\u00f3 de ~10/PR a ~0/PR. Los scores subieron de los 60s a los 80s y 90s.",
    lessonsTitle: "Lo que aprendimos",
    lesson1:
      "El c\u00f3digo generado por IA es sint\u00e1cticamente correcto pero narrativamente incompleto. El c\u00f3digo compila. Los tests pasan. Pero la descripci\u00f3n del PR no cuenta toda la historia. Esa es la brecha que Vigil llena.",
    lesson2:
      "Los falsos positivos importan m\u00e1s que los falsos negativos. Una herramienta que grita lobo se ignora. Dedicamos m\u00e1s tiempo a reducir falsos positivos que a agregar features \u2014 y vali\u00f3 la pena.",
    lesson3:
      "Verificaci\u00f3n no es review. Code review pregunta \u201c\u00bfeste c\u00f3digo es bueno?\u201d Verificaci\u00f3n pregunta \u201c\u00bfeste PR realmente hace lo que dice?\u201d Son complementarios, no competidores.",
    ctaTitle: "Pru\u00e9balo en tus repos",
    ctaText:
      "Vigil es gratis para repos ilimitados. Instala desde el GitHub Marketplace, abre un PR, y ve qu\u00e9 encuentra.",
    ctaButton: "Instalar Vigil",
  },
};

export default async function DogfoodingPost({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale: Locale = isValidLocale(localeParam) ? localeParam : "en";
  const t = content[locale];

  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 sm:py-24">
      <Link
        href={`/${locale}/blog`}
        className="text-sm text-text-muted hover:text-accent transition-colors"
      >
        {t.back}
      </Link>

      <div className="mt-8 mb-12">
        <div className="flex items-center gap-3 text-xs text-text-muted mb-3">
          <time>{t.date}</time>
          <span>&middot;</span>
          <span>{t.readTime}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-3">
          {t.title}
        </h1>
        <p className="text-text-secondary text-lg">{t.subtitle}</p>
      </div>

      <P>{t.intro1}</P>
      <P>{t.intro2}</P>

      <H2>{t.findingsTitle}</H2>

      <Finding
        signal={t.finding1Signal}
        title={t.finding1Title}
        description={t.finding1Desc}
      />
      <Finding
        signal={t.finding2Signal}
        title={t.finding2Title}
        description={t.finding2Desc}
      />
      <Finding
        signal={t.finding3Signal}
        title={t.finding3Title}
        description={t.finding3Desc}
      />

      <H2>{t.scoresTitle}</H2>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="border border-white/[0.06] rounded-lg p-5">
          <div className="text-xs text-text-muted mb-3">{t.scoresBefore}</div>
          <div className="space-y-2">
            <Score value={59} label="PR #81" />
            <Score value={70} label="PR #82" />
            <Score value={66} label="PR #83" />
            <Score value={70} label="PR #84" />
          </div>
        </div>
        <div className="border border-white/[0.06] rounded-lg p-5">
          <div className="text-xs text-text-muted mb-3">{t.scoresAfter}</div>
          <div className="space-y-2">
            <Score value={82} label="PR #91" />
            <Score value={93} label="PR #92" />
            <Score value={100} label="PR #107" />
          </div>
        </div>
      </div>

      <P>{t.scoresExplain}</P>
      <P>{t.scoresFixed}</P>

      <H2>{t.lessonsTitle}</H2>

      <div className="space-y-4 mb-12">
        <div className="border-l-2 border-accent/40 pl-4">
          <P>{t.lesson1}</P>
        </div>
        <div className="border-l-2 border-accent/40 pl-4">
          <P>{t.lesson2}</P>
        </div>
        <div className="border-l-2 border-accent/40 pl-4">
          <P>{t.lesson3}</P>
        </div>
      </div>

      <div className="border border-accent/20 bg-accent/[0.03] rounded-lg p-8 text-center">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {t.ctaTitle}
        </h3>
        <p className="text-sm text-text-secondary mb-4">{t.ctaText}</p>
        <a
          href="https://github.com/marketplace/keepvigil"
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg-deep font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          {t.ctaButton}
        </a>
      </div>
    </div>
  );
}
