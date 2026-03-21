import type { Dictionary } from "./en";

const es: Dictionary = {
  nav: {
    product: "Producto",
    docs: "Docs",
    about: "Nosotros",
    blog: "Blog",
    dashboard: "Dashboard",
    installOnGithub: "Instalar en GitHub",
    documentation: "Documentaci\u00f3n",
    productLinks: {
      signalsOverview: "Se\u00f1ales",
      howItWorks: "C\u00f3mo funciona",
      pricing: "Precios",
      changelog: "Changelog",
    },
    docsLinks: {
      gettingStarted: "Empezar",
      configuration: "Configuración",
      security: "Seguridad",
    },
  },
  hero: {
    badge: "Dise\u00f1ado para la era del desarrollo asistido por IA",
    title: "Mergea con confianza.",
    description:
      "Los agentes de IA y tus compa\u00f1eros escriben PRs r\u00e1pido. Vigil lee cada afirmaci\u00f3n, la verifica contra el diff real, y detecta cambios que nadie mencion\u00f3. Para que sepas exactamente qu\u00e9 est\u00e1s mergeando.",
    installOnGithub: "Instalar en GitHub",
    viewOnGithub: "Ver en GitHub",
    zeroConfig: "\u2713 Cero configuraci\u00f3n",
    noCreditCard: "\u2713 Sin tarjeta de cr\u00e9dito",
    thirtySecondInstall: "\u2713 Instalaci\u00f3n en 30 segundos",
    seeRealPr: "Mira c\u00f3mo Vigil verifica un PR real \u2192",
    skipToContent: "Ir al contenido",
  },
  scoreCard: {
    confidenceScore: "Puntuaci\u00f3n de Confianza Vigil",
    safeToMerge: "Seguro para mergear",
  },
  statsBar: {
    verificationLayers: "Capas de Verificaci\u00f3n",
    signalsPerPr: "Se\u00f1ales por PR",
    setupTime: "Tiempo de Setup",
    configRequired: "Config Requerida",
  },
  socialProof: {
    cards: [
      {
        title: "Mira cada l\u00ednea de c\u00f3digo",
        description:
          "Vigil es open source. Lee el c\u00f3digo, audita la l\u00f3gica, verifica las afirmaciones.",
        link: "Explorar en GitHub \u2192",
      },
      {
        title: "Lee una review real de PR",
        description:
          "Mira exactamente lo que Vigil publica en un pull request. Sin maquetas, sin demos.",
        link: "Ver PR #7 \u2192",
      },
      {
        title: "Revisa nuestro uptime",
        description:
          "Vigil corre en infraestructura dedicada. Revisa el endpoint de salud cuando quieras.",
        link: "Ver estado \u2192",
      },
    ],
    tagline:
      "A\u00fan no tenemos un muro de logos. Tenemos algo mejor: transparencia radical.",
  },
  problem: {
    title1: "Tu PR dice una cosa.",
    title2: "El c\u00f3digo dice otra.",
    description:
      "Tu equipo mergea 50 PRs por semana. \u00bfCu\u00e1ntos alguien realmente ley\u00f3 l\u00ednea por l\u00ednea? Los agentes de IA escriben c\u00f3digo en minutos \u2014 con descripciones confiadas. \u201CAgrega auth middleware.\u201D \u201CCorrige el bug de timeout.\u201D \u201CSin breaking changes.\u201D Pero \u00bfqui\u00e9n lo verifica? No CI \u2014 testea si el c\u00f3digo corre, no si el PR es veraz. No code review \u2014 tu reviewer oje\u00f3 el diff en 30 segundos. La brecha entre lo que un PR afirma y lo que el c\u00f3digo hace es la brecha donde los bugs llegan a producci\u00f3n.",
  },
  howItWorks: {
    title: "C\u00f3mo funciona",
    steps: [
      {
        title: "Instala",
        description:
          "Agrega Vigil a tus repos de GitHub en un clic. Sin cambios de c\u00f3digo, sin config de CI, sin setup.",
      },
      {
        title: "Abre un PR",
        description:
          "Abre un pull request. Cualquier PR \u2014 de agentes de IA, compa\u00f1eros, o t\u00fa mismo. Sin test plan necesario.",
      },
      {
        title: "Obt\u00e9n tu score",
        description:
          "Vigil verifica afirmaciones, detecta cambios no documentados, y analiza impacto. Los resultados aparecen directamente en el PR.",
      },
    ],
  },
  signals: {
    title: "Tres capas. Verificaci\u00f3n completa.",
    subtitle:
      "Vigil lee la descripci\u00f3n de tu PR, verifica cada afirmaci\u00f3n contra el diff real, y detecta lo que olvidaste.",
    scoreNote:
      "8 se\u00f1ales en tres capas. 6 contribuyen al score de confianza. 2 proveen contexto adicional \u2014 evaluaci\u00f3n de riesgo y sugerencias de descripci\u00f3n.",
    layers: {
      trustVerification: {
        name: "Verificaci\u00f3n de Confianza",
        tier: "Incluido",
        description:
          "Lee el t\u00edtulo y descripci\u00f3n de tu PR. Extrae cada afirmaci\u00f3n \u2014 \u2018agrega auth middleware,\u2019 \u2018corrige timeout,\u2019 \u2018sin breaking changes.\u2019 Verifica cada una contra el diff real. Luego escanea todo lo que la descripci\u00f3n no mencion\u00f3: nuevas dependencias, credenciales, archivos sin tests.",
        signals: [
          {
            name: "Claims Verifier",
            description:
              "El LLM extrae y verifica cada afirmaci\u00f3n del cuerpo de tu PR contra el diff real. Confirmada, no verificada, o contradicha.",
          },
          {
            name: "Undocumented Changes",
            description:
              "El LLM escanea el diff completo buscando cambios significativos no mencionados en la descripci\u00f3n del PR. Nuevas deps, env vars, cambios de schema.",
          },
          {
            name: "Credential Scan",
            description:
              "Escanea el diff buscando secrets hardcodeados, API keys y contrase\u00f1as. Detecta lo que la revisi\u00f3n de c\u00f3digo no ve.",
          },
          {
            name: "Coverage Mapper",
            description:
              "Verifica si los archivos modificados tienen archivos de test correspondientes. Detecta c\u00f3digo sin testear antes de que llegue a producci\u00f3n.",
          },
        ],
      },
      deepAnalysis: {
        name: "An\u00e1lisis Profundo",
        tier: "Incluido",
        description:
          "Va m\u00e1s profundo en el impacto estructural. Detecta cuando un PR toca tanto API como frontend, compara las formas de respuesta para asegurar que los contratos sigan coincidiendo, y realiza an\u00e1lisis granular del diff para encontrar las brechas entre lo que cambi\u00f3 y lo que se document\u00f3.",
        signals: [
          {
            name: "Contract Checker",
            description:
              "Detecta cuando un PR toca tanto API como frontend. Compara las formas de respuesta para asegurar que sigan coincidiendo.",
          },
          {
            name: "Diff Analyzer",
            description:
              "An\u00e1lisis granular del diff comparando lo que el PR realmente cambi\u00f3 contra lo que se document\u00f3. Encuentra las brechas entre palabras y c\u00f3digo.",
          },
        ],
      },
      developerAssist: {
        name: "Asistencia al Desarrollador",
        tier: "Incluido",
        description:
          "Provee contexto adicional m\u00e1s all\u00e1 del score de confianza. Eval\u00faa patrones de riesgo en el PR y genera una descripci\u00f3n cuando el autor no escribi\u00f3 una. Se\u00f1ales informativas que te ayudan a entender el PR m\u00e1s r\u00e1pido.",
        signals: [
          {
            name: "Risk Assessment",
            description:
              "Eval\u00faa el riesgo del PR basado en patrones de archivos, tama\u00f1o de cambios e indicadores estructurales. Se\u00f1ala cambios de alto riesgo como auth, pagos e infraestructura.",
          },
          {
            name: "Description Generator",
            description:
              "Cuando un PR no tiene descripci\u00f3n, Vigil genera una desde el diff. Asegura que cada PR tenga contexto antes de que comience la revisi\u00f3n.",
          },
        ],
      },
    },
  },
  evidence: {
    badge: "Ejemplo de resultado de verificaci\u00f3n",
    title: "Esto aparece en cada PR.",
    subtitle:
      "Sin dashboard. Sin herramienta separada. Los resultados viven donde ya trabajas \u2014 directamente en el pull request.",
    tabs: {
      reviewNeeded: "Revisi\u00f3n necesaria",
      credentialLeak: "Fuga de credenciales",
    },
    reviewRecommended: "Se recomienda revisi\u00f3n",
    doNotMerge: "No mergear",
    claims: "Afirmaciones",
    undocumentedChanges: "Cambios No Documentados",
    impact: "Impacto",
    seeRealResult: "Ver un resultado real en GitHub \u2192",
  },
  securityTrust: {
    title: "Tu c\u00f3digo est\u00e1 seguro.",
    subtitle:
      "La seguridad no es una ocurrencia tard\u00eda. Vigil fue construido desde cero para mantener tu c\u00f3digo y secretos protegidos.",
    cards: [
      {
        icon: "\ud83d\udd12",
        title: "An\u00e1lisis de Solo Lectura",
        description:
          "Vigil lee tu diff y la descripci\u00f3n del PR. Nunca modifica tu c\u00f3digo, nunca clona tu repo a disco, nunca ejecuta comandos.",
      },
      {
        icon: "\ud83d\udee1\ufe0f",
        title: "Sin Retenci\u00f3n de Datos",
        description:
          "Vigil lee tu PR, ejecuta el an\u00e1lisis, publica los resultados, y olvida. No se almacena c\u00f3digo en nuestros servidores.",
      },
      {
        icon: "\ud83d\udd10",
        title: "Protecci\u00f3n de PRs Fork",
        description:
          "Los PRs de forks leen la configuraci\u00f3n de tu rama por defecto, no del fork. Contribuidores no confiables no pueden inyectar config maliciosa.",
      },
    ],
    badges: {
      dockerSandbox: "Solo Lectura",
      noDataRetention: "Sin Retenci\u00f3n de Datos",
      mitLicensed: "Licencia MIT",
      euServers: "Servidores UE",
    },
    securityDocsLink: "Lee nuestros docs de seguridad \u2192",
    openSourceMit: "Open source bajo MIT",
  },
  faq: {
    title: "Preguntas frecuentes",
    items: [
      {
        question: "\u00bfVigil es gratis?",
        answer:
          "S\u00ed. El tier Free incluye las 8 se\u00f1ales \u2014 Claims Verifier, Undocumented Changes, Credential Scan, Coverage Mapper, Contract Checker, Diff Analyzer, Risk Assessment y Description Generator. Repos ilimitados. Sin tarjeta de cr\u00e9dito.",
      },
      {
        question: "\u00bfVigil funciona con PRs generados por IA?",
        answer:
          "Exactamente para eso fue dise\u00f1ado. Ya sea que el PR venga de Claude Code, Cursor, Devin, o un compa\u00f1ero \u2014 Vigil verifica las afirmaciones contra el diff real. Mientras m\u00e1s r\u00e1pido se escribe c\u00f3digo, m\u00e1s necesitas un verificador independiente.",
      },
      {
        question: "\u00bfEn qu\u00e9 se diferencia Vigil de CodeRabbit?",
        answer:
          "CodeRabbit revisa calidad de c\u00f3digo \u2014 estilo, bugs, mejores pr\u00e1cticas. Vigil verifica veracidad \u2014 \u00bfel PR realmente hace lo que dice? Son complementarios. Muchos equipos usan ambos.",
      },
      {
        question: "\u00bfQu\u00e9 es el resumen de una l\u00ednea en cada PR?",
        answer:
          "Cada comentario de Vigil comienza con una l\u00ednea PR at a Glance \u2014 un resumen compacto mostrando archivos modificados, categor\u00edas clave, cobertura de tests y tiempo estimado de revisi\u00f3n. Est\u00e1 dise\u00f1ado para darte contexto instant\u00e1neo antes de leer el reporte completo.",
      },
      {
        question: "\u00bfVigil puede escribir la descripci\u00f3n de mi PR?",
        answer:
          "Cuando un PR tiene una descripci\u00f3n vac\u00eda o ausente, el Description Generator de Vigil crea una autom\u00e1ticamente desde el diff. Esto asegura que cada PR tenga contexto para los revisores, incluso cuando el autor olvid\u00f3 escribir una.",
      },
      {
        question: "\u00bfVigil funciona con repos privados?",
        answer:
          "S\u00ed. Todos los tiers funcionan con repositorios privados. Instala la GitHub App y selecciona qu\u00e9 repos habilitar.",
      },
      {
        question: "\u00bfA qu\u00e9 datos accede Vigil?",
        answer:
          "Vigil lee el t\u00edtulo, descripci\u00f3n y diff del PR. No se almacena c\u00f3digo despu\u00e9s de completar el an\u00e1lisis. Vigil nunca clona tu repo ni ejecuta c\u00f3digo.",
      },
      {
        question: "\u00bfNecesito configurar algo?",
        answer:
          "No. Vigil funciona de inmediato con cero configuraci\u00f3n. Opcionalmente agrega un archivo .vigil.yml para personalizar pesos de scoring o comportamiento de se\u00f1ales.",
      },
      {
        question: "\u00bfVigil puede bloquear merges?",
        answer:
          "Vigil publica un GitHub Check Run. Puedes configurar reglas de protecci\u00f3n de rama para requerir que el check de Vigil pase antes de mergear. Scores debajo de 50 resultan en un check de \u2018fallo\u2019.",
      },
      {
        question: "\u00bfVigil es solo para GitHub?",
        answer:
          "Actualmente solo GitHub. GitLab y Bitbucket est\u00e1n siendo considerados para el futuro.",
      },
    ],
  },
  ctaFooter: {
    title: "Mergea con confianza.",
    subtitle:
      "Instala Vigil en 30 segundos. Gratis para siempre. Sin tarjeta de cr\u00e9dito.",
    installOnGithub: "Instalar en GitHub",
    footerProduct: "Producto",
    footerResources: "Recursos",
    footerLegal: "Legal",
    signals: "Señales",
    pricing: "Precios",
    dashboard: "Dashboard",
    security: "Seguridad",
    documentation: "Documentación",
    github: "GitHub",
    gettingStarted: "Empezar",
    about: "Nosotros",
    changelog: "Changelog",
    status: "Estado",
    privacyPolicy: "Pol\u00edtica de Privacidad",
    termsOfService: "T\u00e9rminos de Servicio",
    copyright: "\u00a9 2026 Vigil. Open source bajo MIT.",
  },
  pricing: {
    title: "Empieza gratis. Escala cuando est\u00e9s listo.",
    subtitle:
      "Todos los planes incluyen las 8 se\u00f1ales y repos ilimitados. Mejora para comentarios inline, automatizaci\u00f3n y funciones de equipo.",
    monthly: "Mensual",
    annual: "Anual",
    saveUpTo: "Ahorra hasta $48",
    forever: "siempre",
    perMonth: "/dev/mes",
    perYear: "/dev/a\u00f1o",
    comparePlans: "Comparar planes",
    feature: "Caracter\u00edstica",
    billingQuestions: "Preguntas de facturaci\u00f3n",
    alreadyUsingVigil: "\u00bfYa usas Vigil?",
    alreadyUsingVigilDescription:
      "Mira tu historial de verificaci\u00f3n de PRs, scores y m\u00e9tricas de equipo en el dashboard.",
    openDashboard: "Abrir Dashboard",
    allPlansNote:
      "Todos los planes incluyen las 8 se\u00f1ales y repos ilimitados. Tier Free \u2014 sin tarjeta de cr\u00e9dito, sin trampa.",
    plans: {
      free: {
        name: "Free",
        description: "Las 8 se\u00f1ales, cero configuraci\u00f3n.",
        features: [
          "Las 8 se\u00f1ales de verificaci\u00f3n incluidas",
          "PR at a Glance \u2014 resumen instant\u00e1neo del PR",
          "Risk Assessment \u2014 se\u00f1ala cambios de alto riesgo",
          "Description Generator \u2014 genera descripciones faltantes autom\u00e1ticamente",
          "Repos y PRs ilimitados",
        ],
        cta: "Instalar Gratis",
      },
      pro: {
        name: "Pro",
        description: "Comentarios inline y automatizaci\u00f3n.",
        badge: "Recomendado",
        features: [
          "Todo lo de Free, m\u00e1s:",
          "Comentarios inline en l\u00edneas del diff",
          "Auto-approve para PRs de alta confianza",
          "Notificaciones webhook (Slack/Discord)",
          "Soporte prioritario",
        ],
        cta: "Iniciar Prueba Pro",
      },
      team: {
        name: "Team",
        description: "Para equipos manejando agentes a escala.",
        features: [
          "Todo lo de Pro, m\u00e1s:",
          "Dashboard \u2014 historial de PRs, scores, m\u00e9tricas de equipo",
          "@vigil commands \u2014 explain, verify, recheck, ignore",
          "Repo memory \u2014 reglas de ignore persistentes",
          "Reglas de scoring personalizadas",
          "Soporte dedicado",
        ],
        cta: "Iniciar Prueba Team",
      },
    },
    faq: [
      {
        question: "\u00bfC\u00f3mo funciona la facturaci\u00f3n?",
        answer:
          "Se factura por desarrollador al inicio de cada ciclo \u2014 mensual o anual. Todos los cobros van por Stripe. Recibir\u00e1s una factura por email por cada pago.",
      },
      {
        question: "\u00bfQu\u00e9 cuenta como un 'desarrollador'?",
        answer:
          "Un desarrollador es cualquier usuario de GitHub que abre un PR en un repo donde Vigil est\u00e1 instalado. Las cuentas bot y usuarios de CI no cuentan. Solo se te cobra por humanos que usan activamente la herramienta.",
      },
      {
        question: "\u00bfPuedo cancelar en cualquier momento?",
        answer:
          "S\u00ed. Cancela desde tu portal de cliente de Stripe en cualquier momento. Tu plan se mantiene activo hasta el fin del periodo actual \u2014 sin cargos parciales.",
      },
      {
        question: "\u00bfQu\u00e9 pasa cuando cancelo?",
        answer:
          "Tu cuenta vuelve al tier Free al final de tu periodo de facturaci\u00f3n. Las funciones Pro (comentarios inline, auto-approve, webhooks) se desactivan, pero tus repos siguen conectados y las 8 se\u00f1ales contin\u00faan funcionando.",
      },
      {
        question: "\u00bfObtengo un reembolso?",
        answer:
          "No ofrecemos reembolsos prorrateados por tiempo no usado. Si cancelas a mitad de ciclo, mantienes acceso hasta que termine el periodo. Si hay un problema, cont\u00e1ctanos \u2014 buscaremos una soluci\u00f3n.",
      },
      {
        question: "\u00bfPuedo cambiar de plan?",
        answer:
          "S\u00ed. Sube o baja de plan en cualquier momento desde tu portal de Stripe. Los upgrades toman efecto inmediatamente con facturaci\u00f3n prorrateada. Los downgrades aplican en el siguiente ciclo.",
      },
      {
        question: "\u00bfHay descuento anual?",
        answer:
          "S\u00ed. La facturaci\u00f3n anual te ahorra dos meses por desarrollador: Pro es $120/dev/a\u00f1o (vs. $144 mensual) y Team es $240/dev/a\u00f1o (vs. $288 mensual).",
      },
      {
        question: "\u00bfNecesito tarjeta de cr\u00e9dito para Free?",
        answer:
          "No. Instala la GitHub App y empieza a usar Vigil inmediatamente. Sin tarjeta de cr\u00e9dito, sin expiraci\u00f3n de prueba, sin trampa.",
      },
    ],
    comparisonFeatures: [
      "Claims Verifier",
      "Undocumented Changes",
      "Credential Scan",
      "Coverage Mapper",
      "Contract Checker",
      "Diff Analyzer",
      "Risk Assessment",
      "Description Generator",
      "PR at a Glance",
      "Comentarios inline",
      "Auto-approve",
      "Notificaciones webhook",
      "@vigil commands",
      "Repo memory",
      "Reglas de scoring personalizadas",
    ],
  },
  about: {
    title: "Sobre Vigil",
    description:
      "La capa de verificaci\u00f3n para desarrollo asistido por IA. Vigil asegura que cada PR hace lo que afirma.",
    intro:
      "Los agentes de IA escriben c\u00f3digo m\u00e1s r\u00e1pido de lo que cualquier equipo puede revisar. Claude Code, Cursor, Devin \u2014 env\u00edan PRs en minutos, con descripciones confiadas. Pero \u00bfqui\u00e9n verifica que la descripci\u00f3n coincida con el diff? Vigil lo hace. Leemos cada afirmaci\u00f3n, la verificamos contra los cambios reales del c\u00f3digo, y detectamos lo que nadie mencion\u00f3. La capa de verificaci\u00f3n entre c\u00f3digo generado por IA y tu rama principal.",
    whatWeDoTitle: "Qu\u00e9 hacemos",
    whatWeDo:
      "Vigil le da a cada pull request un reporte de verificaci\u00f3n \u2014 afirmaciones verificadas contra el diff, cambios no documentados detectados, e impacto estructural analizado. Tres capas de verificaci\u00f3n: Verificaci\u00f3n de Confianza confirma que el PR hace lo que dice y detecta lo que la descripci\u00f3n omiti\u00f3. An\u00e1lisis Profundo detecta violaciones de contrato y realiza detecci\u00f3n granular de brechas en el diff. Asistencia al Desarrollador eval\u00faa patrones de riesgo y genera descripciones cuando el autor no escribi\u00f3 una. Los resultados aparecen directamente en el PR.",
    howWereDifferentTitle: "C\u00f3mo somos diferentes",
    howWereDifferent:
      "Complementamos las herramientas de code review, no las reemplazamos. CodeRabbit revisa calidad de c\u00f3digo. GitHub Actions corre CI. Codecov mide cobertura. Vigil verifica que lo que tu PR afirma coincida con lo que el c\u00f3digo realmente hace. Cuando tu PR dice \"agrega rate limiting\" \u2014 revisamos el diff. Cuando no menciona una nueva dependencia de Redis \u2014 la se\u00f1alamos. Diferente trabajo, mismo pull request.",
    openSourceTitle: "Open source",
    openSource:
      "Vigil es open source bajo la Licencia MIT. Todo el codebase \u2014 840+ tests, 8 se\u00f1ales, el motor de scoring \u2014 es p\u00fablico en GitHub. Puedes auto-hospedarlo, auditar, contribuir, o hacer fork.",
    installOnGithub: "Instalar en GitHub",
    viewOnGithub: "Ver en GitHub",
  },
};

export default es;
