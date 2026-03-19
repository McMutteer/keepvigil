import type { Dictionary } from "./en";

const es: Dictionary = {
  nav: {
    product: "Producto",
    docs: "Docs",
    about: "Nosotros",
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
      configuration: "Configuraci\u00f3n",
      byollm: "BYOLLM",
      shellAllowlist: "Shell Allowlist",
      security: "Seguridad",
    },
  },
  hero: {
    badge: "Cada PR se verifica. Cada afirmaci\u00f3n se comprueba.",
    title: "Verifica que tu PR hace lo que dice\u00a0que\u00a0hace",
    description:
      "Instala la GitHub App. Abre un PR. Vigil lee el t\u00edtulo y la descripci\u00f3n, verifica cada afirmaci\u00f3n contra el diff real, y detecta cambios que no mencionaste \u2014 para que los revisores sepan exactamente qu\u00e9 es real.",
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
        link: "Ver PR #47 \u2192",
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
      'Los agentes de IA escriben PRs con descripciones confiadas \u2014 "agrega auth middleware," "corrige el bug de timeout," "sin breaking changes." Pero \u00bfqui\u00e9n realmente lo verifica? El PR dice que agrega auth \u2014 \u00bflo hizo? El PR dice sin breaking changes \u2014 \u00bflos hay? La brecha entre lo que un PR afirma y lo que el c\u00f3digo realmente hace crece con cada merge.',
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
      "10 se\u00f1ales en tres capas contribuyen al score de verificaci\u00f3n. 7 son gratuitas \u2014 el valor core. 3 se desbloquean con Pro para an\u00e1lisis m\u00e1s profundo.",
    layers: {
      claimsVerification: {
        name: "Verificaci\u00f3n de Afirmaciones",
        tier: "Free",
        description:
          "Lee el t\u00edtulo y descripci\u00f3n de tu PR. Extrae cada afirmaci\u00f3n \u2014 'agrega auth middleware,' 'corrige timeout,' 'sin breaking changes.' Verifica cada una contra el diff real. Confirmada, no verificada, o contradicha.",
        signals: [
          {
            name: "Claims Verifier",
            description:
              "El LLM extrae y verifica cada afirmaci\u00f3n del cuerpo de tu PR contra el diff real. Confirmada, no verificada, o contradicha.",
          },
          {
            name: "Plan Augmentor",
            description:
              "Genera autom\u00e1ticamente 3-5 items de verificaci\u00f3n que tu test plan omiti\u00f3 \u2014 chequeos de l\u00f3gica, contratos, casos borde \u2014 y verifica cada uno.",
          },
          {
            name: "CI Bridge",
            description:
              "Mapea items del test plan a los resultados de tus GitHub Actions. Si CI ya lo verific\u00f3, Vigil lo sabe.",
          },
        ],
      },
      undocumentedChanges: {
        name: "Cambios No Documentados",
        tier: "Free",
        description:
          "Lee el diff completo. Encuentra cambios significativos que no mencionaste \u2014 nuevas dependencias, variables de entorno, cambios de schema, modificaciones de API. Lo que los revisores necesitan saber pero la descripci\u00f3n del PR no muestra.",
        signals: [
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
              "Verifica si los archivos modificados tienen archivos de test correspondientes. Los archivos referenciados por el test plan cuentan como cubiertos.",
          },
          {
            name: "Test Execution",
            description:
              "Ejecuta comandos shell del test plan en un contenedor Docker aislado. Verificaci\u00f3n real, no solo an\u00e1lisis est\u00e1tico.",
          },
        ],
      },
      impactAnalysis: {
        name: "An\u00e1lisis de Impacto",
        tier: "Pro",
        description:
          "Va m\u00e1s profundo. An\u00e1lisis profundo con LLM \u2014 comparando cambios reales contra promesas del test plan, encontrando \u00e1reas sin testear, y verificando que los contratos API/frontend sigan coincidiendo.",
        signals: [
          {
            name: "Diff vs Claims",
            description:
              "El LLM compara lo que el PR realmente cambi\u00f3 contra lo que el test plan promete. Encuentra las brechas entre palabras y c\u00f3digo.",
          },
          {
            name: "Gap Analysis",
            description:
              "El LLM identifica \u00e1reas del c\u00f3digo que cambiaron pero no est\u00e1n cubiertas por ning\u00fan item del test plan. Los desconocidos desconocidos.",
          },
          {
            name: "Contract Checker",
            description:
              "Detecta cuando un PR toca tanto API como frontend. Compara las formas de respuesta para asegurar que sigan coincidiendo.",
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
        title: "Ejecuci\u00f3n Aislada",
        description:
          "Todos los comandos corren en contenedores Docker con --network none. Sin acceso a internet, sin acceso al host, sin secretos expuestos.",
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
      dockerSandbox: "Docker Sandbox",
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
        question: "\u00bfVigil es gratis para open source?",
        answer:
          "S\u00ed. El tier Free incluye Verificaci\u00f3n de Afirmaciones, Detecci\u00f3n de Cambios No Documentados, escaneo de credenciales y mapeo de cobertura \u2014 PRs ilimitados, repos ilimitados. Sin tarjeta de cr\u00e9dito.",
      },
      {
        question: "\u00bfVigil funciona con repos privados?",
        answer:
          "S\u00ed. Los tiers Free y Pro funcionan con repositorios privados. Instala la GitHub App y selecciona qu\u00e9 repos habilitar.",
      },
      {
        question: "\u00bfA qu\u00e9 datos accede Vigil?",
        answer:
          "Vigil lee el t\u00edtulo, descripci\u00f3n y diff del PR. Opcionalmente clona el repo para an\u00e1lisis m\u00e1s profundo. No se almacena c\u00f3digo despu\u00e9s de completar el an\u00e1lisis.",
      },
      {
        question: "\u00bfNecesito configurar algo?",
        answer:
          "No. Vigil funciona de inmediato con cero configuraci\u00f3n. Opcionalmente agrega un archivo .vigil.yml para personalizar timeouts, comandos shell, o habilitar se\u00f1ales Pro.",
      },
      {
        question: "\u00bfQu\u00e9 significa BYOLLM?",
        answer:
          "Bring Your Own LLM (Trae Tu Propio LLM). Las se\u00f1ales Pro usan IA para analizar tu c\u00f3digo. T\u00fa provees tu propia API key (OpenAI, Groq, u Ollama), as\u00ed controlas el costo y el flujo de datos.",
      },
      {
        question: "\u00bfCu\u00e1nto cuesta el LLM por PR?",
        answer:
          "T\u00edpicamente menos de $0.01 por PR. Vigil hace 2\u20134 llamadas al LLM por an\u00e1lisis usando modelos r\u00e1pidos como llama-3.3-70b de Groq.",
      },
      {
        question: "\u00bfVigil puede bloquear merges?",
        answer:
          "Vigil publica un GitHub Check Run. Puedes configurar reglas de protecci\u00f3n de rama para requerir que el check de Vigil pase antes de mergear. Scores debajo de 50 resultan en un check de 'fallo'.",
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
    signals: "Se\u00f1ales",
    pricing: "Precios",
    byollm: "BYOLLM",
    security: "Seguridad",
    documentation: "Documentaci\u00f3n",
    github: "GitHub",
    writingTestPlans: "Escribir Test Plans",
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
      "Todos los planes incluyen repos ilimitados y PRs ilimitados. Mejora para an\u00e1lisis m\u00e1s profundo.",
    monthly: "Mensual",
    annual: "Anual",
    saveUpTo: "Ahorra hasta $98",
    forever: "siempre",
    perMonth: "/mes",
    perYear: "/a\u00f1o",
    comparePlans: "Comparar planes",
    feature: "Caracter\u00edstica",
    billingQuestions: "Preguntas de facturaci\u00f3n",
    alreadyUsingVigil: "\u00bfYa usas Vigil?",
    alreadyUsingVigilDescription:
      "Mira tu historial de verificaci\u00f3n de PRs, scores y m\u00e9tricas de equipo en el dashboard.",
    openDashboard: "Abrir Dashboard",
    allPlansNote:
      "Todos los planes incluyen PRs ilimitados. BYOLLM significa que t\u00fa controlas los costos de LLM \u2014 t\u00edpicamente < $0.01 por PR.",
    plans: {
      free: {
        name: "Free",
        description: "Valor inmediato, cero configuraci\u00f3n.",
        features: [
          "CI Bridge \u2014 verifica resultados de GitHub Actions",
          "Credential Scan \u2014 detecta secrets hardcodeados",
          "Coverage Mapper \u2014 encuentra archivos sin tests",
          "Test Execution \u2014 verificaci\u00f3n en sandbox",
          "Assertion Verifier \u2014 chequeos de contenido de archivos",
          "Plan Augmentor \u2014 auto-genera checks faltantes",
          "Repos p\u00fablicos ilimitados",
          "10 PRs/hora, 50 PRs/d\u00eda",
        ],
        cta: "Instalar Gratis",
      },
      pro: {
        name: "Pro",
        description: "Verificaci\u00f3n completa con an\u00e1lisis de impacto.",
        badge: "Recomendado",
        features: [
          "Todo lo de Free, m\u00e1s:",
          "Diff vs Claims \u2014 detecci\u00f3n de brechas con LLM",
          "Gap Analysis \u2014 encuentra cambios sin testear",
          "Contract Checker \u2014 compatibilidad API/frontend",
          "BYOLLM \u2014 usa tu propia API key",
          "Notificaciones webhook (Slack/Discord)",
          "50 PRs/hora, 500 PRs/d\u00eda",
          "Soporte prioritario",
        ],
        cta: "Iniciar Prueba Pro",
      },
      team: {
        name: "Team",
        description: "Para equipos manejando agentes a escala.",
        features: [
          "Todo lo de Pro, m\u00e1s:",
          "Dashboard compartido",
          "Reglas de scoring personalizadas",
          "SSO / SAML",
          "Configuraci\u00f3n org-wide",
          "200 PRs/hora, 2000 PRs/d\u00eda",
          "Soporte dedicado",
        ],
        cta: "Iniciar Prueba Team",
      },
    },
    faq: [
      {
        question: "\u00bfC\u00f3mo funciona la facturaci\u00f3n?",
        answer:
          "Se factura al inicio de cada ciclo \u2014 mensual o anual. Todos los cobros van por Stripe. Recibir\u00e1s una factura por email por cada pago.",
      },
      {
        question: "\u00bfPuedo cancelar en cualquier momento?",
        answer:
          "S\u00ed. Cancela desde tu portal de cliente de Stripe en cualquier momento. Tu plan se mantiene activo hasta el fin del periodo actual \u2014 sin cargos parciales.",
      },
      {
        question: "\u00bfQu\u00e9 pasa cuando cancelo?",
        answer:
          "Tu cuenta vuelve al tier Free al final de tu periodo de facturaci\u00f3n. Las se\u00f1ales Pro-only (Diff, Gap, Contract Checker) dejan de correr, pero tus repos siguen conectados y las se\u00f1ales Free contin\u00faan funcionando.",
      },
      {
        question: "\u00bfObtengo un reembolso?",
        answer:
          "No ofrecemos reembolsos prorrateados por tiempo no usado. Si cancelas a mitad de ciclo, mantienes acceso hasta que termine el periodo. Si hay un problema, cont\u00e1ctanos \u2014 buscaremos una soluci\u00f3n.",
      },
      {
        question: "\u00bfC\u00f3mo funciona la facturaci\u00f3n de BYOLLM?",
        answer:
          "Vigil no cobra por uso de LLM \u2014 t\u00fa traes tu propia API key (OpenAI, Groq, u Ollama). Los costos de LLM son t\u00edpicamente menos de $0.01 por PR usando modelos r\u00e1pidos como llama-3.3-70b de Groq.",
      },
      {
        question: "\u00bfPuedo cambiar de plan?",
        answer:
          "S\u00ed. Sube o baja de plan en cualquier momento desde tu portal de Stripe. Los upgrades toman efecto inmediatamente con facturaci\u00f3n prorrateada. Los downgrades aplican en el siguiente ciclo.",
      },
      {
        question: "\u00bfHay descuento anual?",
        answer:
          "S\u00ed. La facturaci\u00f3n anual te ahorra dos meses: Pro es $190/a\u00f1o (vs. $228 mensual) y Team es $490/a\u00f1o (vs. $588 mensual).",
      },
      {
        question: "\u00bfNecesito tarjeta de cr\u00e9dito para Free?",
        answer:
          "No. Instala la GitHub App y empieza a usar Vigil inmediatamente. Sin tarjeta de cr\u00e9dito, sin expiraci\u00f3n de prueba, sin trampa.",
      },
    ],
    comparisonFeatures: [
      "CI Bridge",
      "Credential Scan",
      "Test Execution",
      "Coverage Mapper",
      "Assertion Verifier",
      "Plan Augmentor",
      "Diff vs Claims",
      "Gap Analysis",
      "Contract Checker",
      "BYOLLM",
      "Notificaciones webhook",
      "Reglas de scoring personalizadas",
      "SSO / SAML",
      "Config org-wide",
      "PRs por hora",
      "PRs por d\u00eda",
    ],
  },
  about: {
    title: "Sobre Vigil",
    description:
      "Vigil verifica que los pull requests hacen lo que afirman. El verificador silencioso para cualquier PR.",
    intro:
      "Los agentes de IA y desarrolladores escriben PRs con descripciones confiadas. Pero nadie verifica si la descripci\u00f3n coincide con el c\u00f3digo. Vigil s\u00ed. Leemos la descripci\u00f3n del PR, extraemos cada afirmaci\u00f3n, verificamos cada una contra el diff real, y detectamos cambios que el autor no mencion\u00f3.",
    whatWeDoTitle: "Qu\u00e9 hacemos",
    whatWeDo:
      "Vigil le da a cada pull request un reporte de verificaci\u00f3n \u2014 afirmaciones verificadas contra el diff, cambios no documentados detectados, e impacto analizado. Tres capas de verificaci\u00f3n: Verificaci\u00f3n de Afirmaciones confirma que el PR hace lo que dice. Detecci\u00f3n de Cambios No Documentados encuentra lo que la descripci\u00f3n omiti\u00f3. An\u00e1lisis de Impacto detecta breaking changes, gaps de cobertura, y violaciones de contrato. Los resultados aparecen directamente en el PR.",
    howWereDifferentTitle: "C\u00f3mo somos diferentes",
    howWereDifferent:
      "No revisamos c\u00f3digo (eso es CodeRabbit). No corremos CI (eso es GitHub Actions). No medimos cobertura (eso es Codecov). Verificamos que lo que tu PR afirma coincida con lo que el c\u00f3digo realmente hace. Cuando tu PR dice \"agrega rate limiting\" \u2014 revisamos el diff. Cuando no menciona una nueva dependencia de Redis \u2014 la se\u00f1alamos.",
    openSourceTitle: "Open source",
    openSource:
      "Vigil es open source bajo la Licencia MIT. Todo el codebase \u2014 990+ tests, 9 se\u00f1ales, el motor de scoring \u2014 es p\u00fablico en GitHub. Puedes auto-hospedarlo, auditar, contribuir, o hacer fork.",
    installOnGithub: "Instalar en GitHub",
    viewOnGithub: "Ver en GitHub",
  },
};

export default es;
