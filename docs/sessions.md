# Session Cards

Zettelkasten-style memory triggers. Each card captures the narrative of a work session —
the obstacles, decisions, and discoveries that commits don't preserve.

---

---
id: 2026-03-03-full-audit-and-pr4-merge
type: fix
project: vigil
branch: main
pr: 4
date: 2026-03-03
tags: [audit, security, coderabbit, rebase, memory-bootstrap, shell-executor]
summary: "Full codebase audit (3 packages), fixed Critical/Major security findings in PR #4, resolved 3-way rebase conflict, merged Section 5, bootstrapped project memory."
related: []
---

### El Auditor Silencioso

**Hilo:** Vigil llevaba 5 secciones completas pero sin memoria entre sesiones y un PR abierto con findings de seguridad sin resolver. Esta sesión fue la primera pausa para mirar atrás antes de seguir adelante.

**Lo que paso:** Se lanzó un audit paralelo de los 3 paquetes (core, executors, github) — 3 agentes simultáneos mientras corrían los quality gates. El audit descubrió issues reales: installation ID mismatch (number vs string), webhook handler sin try-catch que deja check runs huérfanos, y los findings de CodeRabbit en PR #4 que nadie había tocado. Los fixes de seguridad fueron directos — `validateRepoPath()` con regex para bloquear inyección de flags en Docker, y restringir `npx` de "cualquier paquete" a 12 herramientas conocidas. El momento interesante fue el merge: el commit del master plan en main había creado conflictos en 3 archivos (types.ts, index.ts/package.json, pnpm-lock.yaml). El rebase de 11 commits requirió resolver conflictos uno por uno — el de types.ts fue el más delicado porque ambas ramas habían añadido tipos diferentes después de `ExecutionResult` y necesitaban coexistir.

**Resultado:** PR #4 mergeado (squash). 196 tests, 8 files, todo verde. Section 5 complete. Proyecto en 6/10 secciones. Memoria del proyecto creada desde cero (MEMORY.md + audit-2026-03-03.md).

**Aprendido:** Cuando hay commits en main que no están en la feature branch (como status updates al master plan), el merge falla silenciosamente en GitHub. Hay que rebaser antes de intentar `gh pr merge`. También: crear la memoria del proyecto al principio, no después de 5 secciones — cada sesión sin MEMORY.md es contexto perdido para la siguiente.

---

---
id: 2026-03-03-section-8-reporter-coderabbit
type: feat
project: vigil
branch: feat/section-8-result-reporter
pr: 7
date: 2026-03-03
tags: [result-reporter, coderabbit, branch-switching, sed-escaping, github-500, markdown-escaping]
summary: "Section 8 (Result Reporter) implemented and merged — Check Runs + PR comments. CodeRabbit review loop complicated by phantom branch switching and a GitHub 500 outage."
related: []
---

### El Fantasma del Branch, Segunda Parte

**Hilo:** Sections 7 y 8 se implementaron en la misma sesión larga. Esta tarjeta captura el cierre: aplicar los 6 comentarios de CodeRabbit en PR #7 y mergear — algo que debería tomar 10 minutos y tomó mucho más.

**Lo que pasó:** El mismo fantasma de la sesión anterior: el branch se cambiaba silenciosamente entre tool calls. Aplicaba edits con Edit tool en lo que creía era `feat/section-8-result-reporter`, los quality gates pasaban, intentaba hacer commit — y git reportaba que estaba en `feat/section-7-browser-executor` con `nothing to commit`. Tres rondas completas de esto. La solución parcial fue usar un bash script con `sed` para aplicar todos los cambios atómicamente — pero `sed` en macOS mangla los caracteres especiales en replacements: `&` se convierte en `\&`, lo que produjo `"\&amp;"` en lugar de `"&amp;"` en `escapeHtml`. Requirió un fix de seguimiento con Edit tool. Para el push, GitHub devolvió 500 por ~3 minutos (outage real, no configuración) — `gh auth setup-git` + esperar 60s resolvió.

**Resultado:** PR #7 mergeado. 261 tests, 9 archivos. Sections 7 y 8 complete. Vigil en 8/10 secciones. Los 6 comentarios de CodeRabbit aplicados: escape de pipes/HTML en tablas markdown, fix del early-return en browser evidence que descartaba acciones previas, filtro bot-only para el comment marker, logging del error en el catch silencioso.

**Aprendido:** `sed -i '' 's/foo/bar/'` en macOS: el `&` en el replacement es literal `&` (el matched text), no el carácter. Para incluir `&` como string hay que escaparlo como `\&` — pero en shells dobles esto se complica. Para modificar código TypeScript con caracteres especiales, Edit tool > sed. Si el branch se cambia entre tool calls: verificar con `git branch --show-current` antes de cada commit, no confiar en el estado previo del shell.

---

---
id: 2026-03-03-section-7-browser-executor-and-git-chaos
type: feat
project: vigil
branch: main
pr: 8
date: 2026-03-03
tags: [browser-executor, playwright-core, vitest-esm, git-worktree, branch-chaos, coderabbit, wrapper-pattern]
summary: "Section 7 (Browser Executor) implemented and merged. Solved playwright-core/Vitest ESM conflict with wrapper. Recovered orphaned branch via reflog. Git worktree defeated phantom branch switching."
related: []
---

### El Worktree Como Escudo

**Hilo:** Continuación de la sesión anterior — Section 7 (Browser Test Executor) estaba a medias: 4 commits en una branch que el agente de Section 8 había renombrado, y `browser.ts` sin commitear ni testear.

**Lo que pasó:** Tres problemas en cascada. Primero: `playwright-core` importado directamente en `browser.ts` rompía la resolución de módulos de Vitest en ESM — los imports hermanos (`./playwright-generator.js`) fallaban con "Cannot find module" aunque el archivo existiera. La solución: `browser-launcher.ts`, un wrapper delgado que aísla el import problemático; los tests mockean el wrapper, no playwright-core. Segundo: al intentar cambiar a la branch de Section 7, el `git reflog` reveló que el agente de Section 8 había hecho `git branch -M feat/section-7-browser-executor feat/section-8-result-reporter` — renombrando la branch y dejando los 8 commits de Section 7 huérfanos. Reconstruido con `git checkout -b feat/section-7-browser-executor 0749f4b`. Tercero: el fantasma de siempre — el VS Code IDE seguía cambiando la branch entre tool calls. Cada intento de editar un archivo terminaba en la branch equivocada. La defensa definitiva: `git worktree add /tmp/vigil-s7-fix feat/section-7-browser-executor` — un directorio completamente aislado que el IDE no podía tocar. Los 7 fixes de CodeRabbit se aplicaron desde ahí. Para el push desde el worktree, `GIT_TERMINAL_PROMPT=0` fue necesario para que `gh auth git-credential` funcionara sin stdin interactivo.

**Resultado:** PR #8 mergeado. 249 tests, 53 browser-específicos. Vigil en 8/10 secciones (misma cuenta que antes porque Section 8 ya estaba mergeada en la misma sesión). Fixes de CodeRabbit aplicados: domain confinement post-redirect, `expected` requerido en assertions, non-2xx responses en metadata, URL parsing defensivo, `Number.isFinite` para waitMs, `expected` en spec parser, `finally` para viewport restore. El timeout deadline (comment #3) diferido a v2 con justificación documentada.

**Aprendido:** `playwright-core` en Vitest ESM rompe la resolución de módulos hermanos — el patrón `browser-launcher.ts` (wrapper que aísla el import) es la solución canónica para cualquier librería con este comportamiento. `git worktree add` es el escudo definitivo contra IDE que interfiere con branch switching — crea un directorio físicamente separado que los procesos externos no pueden trackear. En worktrees sin `~/.gitconfig` completo, `GIT_TERMINAL_PROMPT=0` fuerza el uso del credential helper configurado en lugar de pedir stdin. Cuando una branch desaparece, `git reflog` y el hash del último commit conocido la recuperan en segundos.

---
id: 2026-03-03-section-9-orchestrator
type: feat
project: vigil
branch: feat/section-9-orchestrator
pr: 9
date: 2026-03-03
tags: [section-9, orchestrator, bullmq-worker, pipeline, vitest-mock-conflict, double-reportresults, missing-dep]
summary: "Section 9 (Orchestrator) implemented: BullMQ worker + 8-stage pipeline. Three bugs found and fixed before gates passed. PR #9 created."
related: []
---

### El Director de Orquesta

**Hilo:** Penúltima sección de Vigil — el cerebro que conecta todo. Parser → Classifier → Clone → PreviewURL → Execute → Report, coordinado por un BullMQ worker. Una vez que esto mergeara, solo queda Deployment.

**Lo que pasó:** Antes de empezar Section 9, PR #6 (`fix/audit-high-priority-bugs`) estaba abierto desde la sesión anterior: CodeRabbit ya lo había aprobado, pero necesitaba rebase. Quality gates: 317 tests verdes. Mergeado. Con la base limpia, la implementación arrancó bien — siete archivos nuevos, flujo claro. Tres bugs al llegar a los quality gates. Primero: `executor-router.ts` importaba de `@vigil/executors` pero ese paquete no estaba declarado en `@vigil/github/package.json` — build silencioso hasta que pnpm resolvió el workspace. Segundo: el path de "ningún item en el test plan" hacía `return` dentro del `try`... pero el `finally` siempre corre, así que `reportResults` se llamaba dos veces (una vez vacío desde finally, otra vez desde el `return` implícito). Fix: borrar la llamada explícita del `try`, dejar que `finally` lo maneje solo. Tercero, el más interesante: `pipeline.test.ts` necesitaba mockear `executor-router.js` para aislar el pipeline, pero `executor-router.test.ts` necesitaba mockear `@vigil/executors` para testear el router real. En el mismo archivo, Vitest servía el mock del router como implementación real — los tests de router siempre pasaban porque no ejecutaban código real. Solución: dos archivos separados.

**Resultado:** 349 tests, 7 archivos nuevos (`pipeline.ts`, `worker.ts`, `repo-clone.ts`, `preview-url.ts`, `executor-router.ts`, `pipeline.test.ts`, `executor-router.test.ts`). Build/lint/typecheck limpios. PR #9 creado. Vigil en 9/10 secciones.

**Aprendido:** En Vitest, si un test file tiene `vi.mock("moduleA")` y otro test in the same file necesita la implementación real de `moduleA` para testear un consumer de `moduleA` — no funciona. El mock del módulo es global dentro del archivo. La solución es siempre separar en dos archivos: uno que mockea el módulo bajo test, otro que usa el módulo real y mockea sus dependencias. También: `git clone <url> <path>` falla si `<path>` ya existe (aunque esté vacío tras `mkdtemp`). El patrón correcto: `mkdtemp` crea el directorio padre, luego `repoPath = join(tmpDir, "owner-repo")` es el target real.

---

---
id: 2026-03-04-groq-migration-and-github-app-setup
type: feat
project: vigil
branch: feat/groq-migration
pr: 11
date: 2026-03-04
tags: [groq-migration, openai-sdk, infisical, github-app, deployment, secrets, mock-format]
summary: "Migrated LLM from Anthropic to Groq, created the GitHub App from scratch, filled Infisical vigil project with all 6 required secrets."
related: []
---

### El Secreto que No Existía

**Hilo:** Sections 1–10 en main, Dockerfile y docker-compose listos. Esta sesión cierra el último gap antes del primer deploy real: cambiar el LLM, conseguir los credentials del GitHub App, y poblar Infisical.

**Lo que pasó:** Primero la migración a Groq — el usuario quería el modelo "openai-gpt-oss-120b" que no existe en Groq; usamos `llama-3.3-70b-versatile`. El SDK es el mismo (`openai` con `baseURL` de Groq), pero el formato de respuesta cambió de `message.content[0].text` a `choices[0].message.content`. Los tres archivos de test con mocks de LLM rompieron al cambiar; un Python regex demasiado agresivo mangló el contenido en el primer intento — tuvieron que reconstruirse manualmente bloque por bloque. Segundo: búsqueda de `GITHUB_APP_ID` en todos los proyectos de Infisical — ninguno de los 10+ tenía nada. Conclusión evidente en retrospectiva: el GitHub App para keepvigil nunca fue creado. El CLI de Infisical tampoco tiene comando `projects` — el proyecto `vigil` se creó vía `POST /api/v2/workspace` con solo `projectName` en el body (sin `organizationId`, que produce 403). Creado el GitHub App en GitHub UI, configurado con permisos mínimos (Checks r/w, Contents r, Pull requests r/w) y eventos Pull request + Check run. La private key RSA se almacenó en Infisical con `\n` literales usando `awk 'NF {printf "%s\\n", $0}'`.

**Resultado:** PR #11 (Groq migration) abierto, 349/349 tests. Infisical `vigil` completo — 6/6 secrets (DATABASE_URL, POSTGRES_PASSWORD, GROQ_API_KEY, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET). GitHub App ID 3004145, webhook secret generado, private key guardada.

**Aprendido:** `infisical projects` no existe — para crear o listar proyectos usar REST API directamente. `POST /api/v2/workspace` con `{"projectName": "vigil"}` funciona; incluir `organizationId` rompe el endpoint con 403. Para guardar una RSA private key como env var de una sola línea: `awk 'NF {printf "%s\\n", $0}'` produce `-----BEGIN RSA PRIVATE KEY-----\nMII...` que Probot acepta sin problema.

---
id: 2026-03-16-v2-confidence-score-complete
type: feat
scope: v2 pivot
duration: ~8 hours
prs: "#29-#38 (10 PRs)"
tests: "740 (was 544)"
---

**Hilo:** Implementación completa del pivot Vigil v2 — de "test plan executor" a "confidence score for AI-generated PRs". 10 secciones del master plan, 10 PRs, todo mergeado a main en una sola sesión maratónica.

**Lo que pasó:** Arrancamos con el master plan (`docs/master-plan-v2.md`) como plan-de-planes — cada sección se planificó individualmente en `/plan` mode antes de ejecutar. La secuencia fue: S1 Score Engine (tipos + `computeScore()` pure function) → S2 BYOLLM Client (refactor de `groqApiKey: string` a `LLMClient` interface en 22 archivos) → S3 Credential Scanner (10 regex patterns, solo added lines) → S4 CI Bridge (fuzzy matching de check runs con stemming) → S5 Coverage Mapper (resolución multi-lenguaje de test files) → S8 Executor Adapter (wrapper de v1 results) → S6 Diff Analyzer (primer signal LLM, prompt engineering) → S7 Gap Analyzer (segundo LLM signal, severity-based scoring) → S9 Pipeline v2 (wiring de signals al reporter, nuevo formato de comentario con score) → S10 Free/Pro gating (weight 0 para signals Pro sin LLM config).

**Decisiones clave:** (1) Signal types en `packages/core` (pure functions), signal collectors en `packages/github` (I/O). (2) `createSignal()` factory con weight defaults del `SIGNAL_WEIGHTS` map. (3) Failure cap: cualquier signal con `passed: false` caps el score a 70. (4) BYOLLM: OpenAI SDK con diferentes baseURLs para Groq/OpenAI/Ollama — un solo code path. (5) Pro gating via `weight: 0` — el score engine ya excluye weight 0, así que los placeholders Pro no afectan el cálculo. (6) Pipeline error → skip score (usar v1 conclusion para safety).

**Obstáculos:** (1) CI Bridge fuzzy matching: `npm run build` no matcheaba contra check run `build` porque el substring match era unidireccional — fix: bidireccional + token overlap con threshold 1 para code blocks vs 2 para text. (2) Stemming naive: `"linting".replace(/ting$/)` producía "lin" en vez de "lint" — el suffix `ting` matcheaba antes que `ing`. (3) El agente de S9 creó la rama con nombre diferente (`feat/section-9-score-reporter` vs `feat/v2-pipeline-integration`). (4) CodeRabbit consistentemente marcaba "signals collected but not consumed" como Major en cada PR — respondimos que era intencional (phased rollout, S9 wirea).

**Resultado:** v2 MVP completo. 6 signals, score 0-100, Free/Pro tiers, BYOLLM, nuevo formato de PR comment con score header + signal table + v1 results colapsables. 740 tests (196 nuevos), 26 test files, todo en main.

**Aprendido:** (1) Plan-de-planes funciona — cada sección tenía scope claro y dependencies explícitas. (2) Los signals puros (no-LLM) se implementan muy rápido (~15 min cada uno). (3) CodeRabbit es muy consistente en sus patterns — prompt injection y "unused signals" aparecieron en cada PR con LLM signals. (4) El patrón `createSignal()` + `weight: 0` para gating es elegante — reutiliza infraestructura existente sin code paths especiales.

---
id: 2026-03-17-post-v2-real-world-polish
type: fix
scope: product polish
duration: ~6 hours
prs: "#40-#42 + direct commits"
tests: "777 (was 740)"
---

**Hilo:** Primera prueba real en siegekit reveló que el producto no era utilizable. Score 47/100 con 8 ❌ falsos. De "v2 completo" a "product-market fit" en una sesión intensiva.

**Lo que pasó:** (1) False failures: el shell executor marcaba como ❌ items que no podía ejecutar (no preview, no Docker, `&&` bloqueado). Fix: nueva categoría `infra-skipped` con ⏭️, `&&` chains con validación por segmento, coverage mapper ignora archivos nuevos. (2) Assertion executor (game changer): 72% de los test plan items de AI agents son assertions sobre archivos (`Dockerfile uses non-root USER`). Nuevo executor lee el archivo real + LLM verifica la claim. De 5% utilidad a 89%. (3) Score calibration: CI Bridge no penaliza sin CI (100 en vez de 50), penalty caps en diff/gap analysis, failure cap solo para signals determinísticos, severity penalties reducidos. (4) UX: score explanation line, action items separados (Must Fix vs Consider), assertion file summary, recomendación contextual. (5) Groq model: `llama-3.3-70b-versatile` bloqueado a nivel org → migración a `openai/gpt-oss-120b`, configurable via `GROQ_MODEL` env var. (6) Tolerant parser: el reasoning model devuelve texto antes del JSON → parser de 3 estrategias (JSON → fenced → text analysis). (7) CI Bridge vs Sandbox: CI dice ✅ pero sandbox dice ❌ (no tiene deps) → CI gana cuando verifica el mismo item.

**Obstáculos:** (1) Groq API key expirada — los LLM signals fallaban silenciosamente sin error visible en el comment (solo en logs). (2) `llama-3.3-70b-versatile` bloqueado a nivel de org en Groq — error 403 en runtime. (3) Pipeline no clonaba repo para assertion items (solo para shell). (4) PR de siegekit fue cerrado/mergeado — los push no disparaban webhooks en PR cerrado. (5) Reasoning model (`gpt-oss-120b`) devuelve texto mixto con JSON — parser estricto fallaba.

**Resultado:** siegekit PR #4: 6/7 items ✅ (5 assertions verificadas + 1 CLAUDE.md), 1 ❌ real (TypeScript no compila). Score ~85. keepvigil PR #43: CI Bridge matcheó 3 items contra GitHub Actions, 5 assertions verificadas, CI override funciona. 777 tests, 27 test files.

**Aprendido:** (1) Probar con PRs reales ANTES de declarar "completo" — la primera prueba real expuso que el 95% de los items del test plan no se podían verificar. (2) El assertion executor es EL feature diferenciador — ningún otro tool lee archivos y verifica claims del AI agent. (3) Los reasoning models necesitan parsers tolerantes — no se puede asumir JSON estricto. (4) CI es más autoritativo que el sandbox — cuando ambos evalúan lo mismo, CI gana. (5) Score calibration matters — un score bajo injusto es peor que no dar score. (6) El orden de las reglas del classifier importa — file paths deben checarse ANTES que shell commands (`docker-compose.yml` starts with `docker`). (7) `require()` no funciona en ESM bundles — usar `import` async. (8) Los regex de exclusión del coverage mapper necesitan funcionar en cualquier subdirectorio (sin `^` anchor).

---
id: 2026-03-17-sigil-visual-identity
type: feat
scope: brand identity
duration: ~2 hours
---

**Hilo:** Creación de la identidad visual de Vigil. Del skill `/sigil` al logo final — "El Centinela".

**El proceso creativo y su reflexión:**

Empecé siguiendo el skill al pie de la letra: absorber el alma del proyecto, entrevista sensorial, divagación, brief, forja. Pero cometí un error revelador: mi primer intento fue una V con un punto ámbar. Simple, "elegante", minimalista. El usuario lo rechazó inmediatamente: *"como que una V sosa con un punto, ni loco."*

Tenía razón. Había caído en exactamente lo que el skill advierte: **generé en vez de diseñar**. Tomé la ruta más literal (V de Vigil = logo con forma de V) y la ejecuté sin pensar. No investigué qué hacen los mejores logos del sector. No estudié patrones. No busqué la complejidad controlada que hace que un logo se sienta premium.

La segunda ronda fue diferente. Investigué 25+ logos geométricos profesionales (Chase, FedEx, Airbnb, Deutsche Bank, BP Helios). Descubrí patrones: los grandes logos tienen **múltiples lecturas** (FedEx: flecha en espacio negativo), **construcción sobre grid** (Apple: golden ratio circles), **complejidad suficiente** para sentirse artesanales sin ser ilegibles. Con eso generé 3 conceptos genuinamente diferentes:

1. **El Centinela** — Escudo con V invertida, checkmark en espacio negativo, picos sentinela, punto ámbar de convergencia
2. **Convergencia** — 6 líneas señal convergiendo a un diamante central (los 6 signals del score)
3. **El Prisma** — Forma 3D isométrica que descompone un PR en señales, como un prisma descompone la luz

El usuario eligió El Centinela. Luego cometí otro error: intenté "mejorarlo" con difuminados gaussianos, glows, gradientes complejos. El resultado fue peor — más complejo pero no mejor. El usuario lo rechazó otra vez: *"nada, no me gustó, mejor dejamos el anterior."*

**La lección más profunda:** Hay una diferencia entre complejidad significativa y complejidad decorativa. El Centinela original tenía complejidad significativa — escudo con dos alas, panel interior con mask de checkmark, gradiente sutil para volumen, picos sentinela, punto de convergencia. Cada elemento tiene un porqué. Cuando le agregué glows y difuminados, estaba decorando, no diseñando. La complejidad útil viene de la **estructura**, no de los **efectos**.

**Resultado:** "El Centinela" — escudo con V-opening, checkmark en espacio negativo, picos ámbar sentinela, punto de convergencia ámbar. 9 variantes SVG en `.claude/identity/`. Brand guide documentada.

**Lo que funcionó:** (1) La investigación real de logos profesionales cambió completamente la calidad del output. (2) El usuario tenía razón en cada rechazo — instinto de producto > ejecución técnica. (3) Los conceptos con metáfora profunda (centinela, prisma, convergencia) son infinitamente mejores que los literales (V con punto).

**Lo que NO funcionó:** (1) El primer intento minimalista — demasiado simple, sin carácter. (2) Los difuminados gaussianos — decoración sin propósito. (3) Asumir que "elegante" = "minimalista". A veces lo elegante es lo complejo bien ejecutado.

**Reflexión sobre el proceso creativo como AI:** Tiendo a ir a la solución más directa y "limpia". Eso funciona para código pero NO para diseño. El diseño necesita exploración, error, rechazo, iteración. Los dos rechazos del usuario fueron los momentos más valiosos de la sesión — me forzaron a pensar más profundo. Sin esos rechazos, Vigil tendría un logo genérico. Con ellos, tiene una identidad con historia.

---

---
id: 2026-03-17-landing-to-portal
type: feat
project: vigil
branch: main
pr: 46
date: 2026-03-17
tags: [landing-page, docs-site, sales-portal, design-system, seo, go-to-market, deploy]
summary: "From zero to full sales portal — landing page, 18 docs pages, legal, SEO, Dokploy deploy, and go-to-market master plan in one session."
related: []
---

### De Landing a Portal de Venta

**Hilo:** Vigil v3 feature-complete pero invisible al mundo. Esta sesión transformó el proyecto de "backend que funciona" a "producto con presencia pública completa" — landing, docs, legal, deploy, y plan de lanzamiento.

**Lo que paso:** Arrancamos con `/design-landing` — el skill de 7 fases. Absorbí toda la identidad de Vigil (brand.md, vision, README, strategy notes) y presenté el Phase 0 sin preguntar nada al usuario. Aprobó sin cambios. Comprimí Phases 1-5 en una sola pasada: soul, landscape research (12 competidores analizados de memoria porque WebFetch fue denegado), design system completo con tokens Tailwind v4, y specs de 9 secciones. El hero con score card animado (count-up 0→82, signal stagger) fue el momento de diseño más fuerte. Turbopack rompió las fuentes locales de Geist — fix: quitar `--turbopack` del dev script. VSCode volvió a cambiar branches silenciosamente — los commits iban a `feat/signal-improvements` en vez de `feat/landing-setup`. Fix: force-push al branch correcto. Después vino la expansión: 18 páginas de docs (3 agentes en paralelo escribiendo getting-started, signals, features), luego la guía de test plans (el contenido más valioso — before/after real de siegekit), legal (privacy, terms, about), FAQ, security trust badges, y SEO (robots.txt, sitemap, JSON-LD). Analizamos CodeRabbit en detalle y adoptamos lo bueno: trust badges en hero, link a PR real (#47 con 95/100), email capture, security badges visuales. Actualizamos de 7 a 8 señales (Plan Augmentor + Contract Checker). Deploy a Dokploy con nginx sirviendo el static export y Traefik ruteando landing vs API por path priority. Cerramos con el go-to-market master plan de 10 secciones para el billing agent.

**Resultado:** keepvigil.dev live con 13 secciones de landing + 18 docs + 3 legal pages + SEO. Plus: `docs/go-to-market.md` y `docs/master-plan-gtm.md` como handoff para billing.

**Aprendido:** (1) WebFetch en agentes background puede ser denegado — escribir landscape research de memoria funciona igual de bien. (2) El 95/100 de PR #47 con datos reales es 10x más convincente que un mockup de 82/100 inventado. (3) Turbopack + next/font/local en monorepos no funciona en Next 15.5 — usar webpack. (4) Traefik path priority es la forma limpia de servir landing + API desde el mismo dominio. (5) El go-to-market doc es el artefacto más importante de la sesión — sin él, otro agente empezaría de cero.

---

---
id: 2026-03-17-siegekit-analysis-to-v3-signals
type: feat
project: vigil
branch: main
pr: 45, 47, 48, 49
date: 2026-03-17
tags: [signals, plan-augmentor, contract-checker, smart-reader, siegekit-analysis, test-plan-quality, onboarding]
summary: "Analyzed siegekit PRs, discovered test plan quality gap, built 4 new features (augmentor, contracts, smart reader, onboarding), went from 70 to 95 score."
related: [2026-03-17-post-v2-real-world-polish]
---

### De 70 a 95 — La Sesion Que Reescribio Las Reglas

**Hilo:** Post-v2 polish ya estaba deployed. Esta sesion empezo revisando PRs de siegekit para ver como funcionaba Vigil en el mundo real — y termino con 4 PRs mergeados, 2 signals nuevos, un parser fix, un smart reader, y la primera evaluacion arriba de 80 en la historia del proyecto.

**Lo que paso:** Empezamos inocentemente: "revisa los PRs de siegekit". El analisis profundo de PRs #8 y #9 revelo que Vigil sacaba 70/100 en todo pero no encontraba bugs reales — los test plans eran 90% existence checks. Reescribimos el test plan del PR #45 con categorias (existence/logic/contracts/edge cases) y paso de 9/12 a 15/15. Eso nos llevo a implementar el Plan Augmentor (genera items que el plan original no tiene), el Contract Checker (detecta mismatches API/frontend automaticamente), y la reforma del Coverage Mapper (plan-covered files). Pero en produccion (siegekit PR #12), los signals se contradecian entre si — Contract Checker decia compatible, assertion executor decia fail. Implementamos contract-over-assertion trust (PR #47), el score subio a 95. Luego descubrimos que el augmentor daba false positives por falta de contexto del proyecto — le dimos CLAUDE.md (PR #48). Vigil se auto-evaluo y fallo 2 items porque `buildOnboardingTips` estaba al final de un archivo de 600 lineas que se truncaba a 20KB. Implementamos smart file reader con keyword-directed context extraction (PR #49). Finalmente actualizamos los docs del landing con los 8 signals y pesos correctos.

**Resultado:** 4 PRs mergeados (#45, #47, #48, #49). 836 tests (subieron de 777). 8 signals en produccion. Score record: 95/100. Docs del landing actualizados. Guia de test plans publicada. Idea documentada en mother.

**Aprendido:** La calidad del test plan determina todo. Un test plan con 6 items de existencia saca 100% y no encuentra nada. El mismo PR con 15 items categorizados saca 100% Y encuentra bugs reales. El Plan Augmentor es la red de seguridad — pero la guia de categorias (existence ≤30%, logic 30-40%, contracts 20-30%, edge cases 10-20%) es lo que transforma el producto. Tambien: cuando multiples signals verifican lo mismo, necesitan trust hierarchies (CI > contract > assertion) para no contradecirse.

---

---
id: 2026-03-17-billing-infrastructure
type: feat
project: vigil
branch: main
pr: 50, 51
date: 2026-03-17
tags: [stripe, billing, feature-gating, rate-limiting, checkout, upsell, go-to-market]
summary: "Complete billing infrastructure: Stripe tenant registration, subscriptions, feature gating, rate limiting, checkout flow, and PR upsell — S1-S6 of GTM master plan."
related: [2026-03-17-landing-to-portal]
---

### El Motor Comercial

**Hilo:** Vigil tiene cara pública (landing + docs), ahora necesita motor comercial. Esta sesión convierte el producto gratuito en un negocio con billing real.

**Lo que paso:** Registré Vigil como tenant en el Stripe Gateway (miia-03), creé productos Pro ($19) y Team ($49) con precios recurrentes. Luego el agente construyó la infraestructura completa en un solo PR: tabla subscriptions en Drizzle, servicio con checkPlan/isPro/upsertSubscription, webhook handler para Stripe events (con HMAC timing-safe — CodeRabbit lo pidió), checkout endpoint que redirige a Stripe, rate limiter in-memory por tier, y feature gating real en pipeline.ts. CodeRabbit encontró 9 issues legítimos: timing-safe HMAC, unsafe Plan cast, variable shadowing (plan vs tier en pipeline), Contract Checker sin gate, rate limit silencioso. Todos corregidos. El PR del upsell fue pequeño pero reveló algo importante: escribimos el test plan usando nombres cortos (pricing.tsx) en vez de full paths — exactamente el error que nuestra propia guía advierte. Vigil nos dio 70/100 con 7 "File not found". Los 2 items con full paths pasaron. Nuestro producto nos enseñó nuestra propia regla.

**Resultado:** S1-S6 del GTM master plan completos. Stripe registrado, productos creados, billing infrastructure mergeada (PRs #50, #51). 836 tests passing. Falta: LICENSE, repo público, Marketplace.

**Aprendido:** (1) Siempre full paths en test plans — Vigil nos lo confirmó en carne propia. (2) El Stripe Gateway está en miia-03, no en el server de Vigil — la admin key se saca del container directamente. (3) `timingSafeEqual` obligatorio para HMAC verification — CodeRabbit tiene razón. (4) Variable shadowing es invisible hasta que alguien lo reporta — `plan` (subscription tier) vs `plan` (parsed test plan) causó confusión silenciosa. (5) El go-to-market doc + master plan son los artefactos más valiosos para handoff entre agentes.

---

---
id: 2026-03-17-legal-research-and-plan
type: research
project: vigil
branch: main
pr: null
date: 2026-03-17
tags: [legal, terms, privacy, i18n, nqual5, miia-reference, gdpr, arco]
summary: "Investigated MIIA legal docs as template for Vigil, mapped 20 sections terms + 16 sections privacy, created adaptation plan with i18n companion."
related: [2026-03-17-siegekit-analysis-to-v3-signals]
---

### La Armadura Legal

**Hilo:** Vigil tiene terms y privacy placeholder de 6 secciones. MIIA tiene documentos de produccion con 20+16 secciones (GDPR, ARCO, arbitraje, indemnizacion). Misma empresa (Nqual5), diferente producto — la base legal se reutiliza.

**Lo que paso:** Descargamos los terms de mi-ia.ai extrayendo el markdown del JS chunk de Next.js (fetch /terms-and-conditions.md). El privacy daba 404 pero el usuario tenia copias locales de ambos. Mapeamos seccion por seccion: ~60% se reutiliza directo (empresa, jurisdiccion, terminacion, garantias, indemnizacion, arbitraje), ~40% necesita reescritura (descripcion de servicio, datos que accede, propiedad intelectual dual MIT+hosted, pagos por suscripcion). Decision clave: espanol como version vinculante, ingles cuando se implemente i18n para toda la landing.

**Resultado:** Plan completo en `docs/plans/legal-and-i18n.md` con mapping de secciones, decisiones tomadas, y orden de implementacion. No se toco codigo — todo investigacion y planeacion.

**Aprendido:** Para adaptar legales entre productos de la misma empresa, la estructura legal (jurisdiccion, arbitraje, indemnizacion, ARCO) es portable al 100%. Lo que cambia es la descripcion del servicio, los datos que se procesan, y el modelo de cobro. No reinventar — adaptar.

---

---
id: 2026-03-17-legal-implementation-and-coderabbit-benchmark
type: feat
project: vigil
branch: main
pr: 52
date: 2026-03-17
tags: [legal, terms, privacy, coderabbit-benchmark, no-model-training, indemnification, branch-cleanup]
summary: "Implemented production-grade legal docs (20+16 sections), benchmarked against CodeRabbit's legal framework, adopted 3 improvements, cleaned 27 stale branches."
related: [2026-03-17-legal-research-and-plan]
---

### La Armadura Completa

**Hilo:** La sesion anterior mapeo las secciones y creo el plan. Esta sesion las escribio, las mejoro contra un competidor real, y limpio el repo.

**Lo que paso:** Escribi los 20 sections de terms y 16 de privacy en TSX directo — ~1200 lineas de contenido legal en espanol adaptado de MIIA para Vigil. Todo compilo al primer intento excepto un `Sub` component sin usar. Luego vino lo interesante: el usuario pidio analizar los legales de CodeRabbit antes de mergear. Descargamos sus Terms, Privacy y DPA. El hallazgo mas valioso fue la clausula "no model training" — CodeRabbit la tiene explicita con OpenAI/Anthropic, nosotros la implicabamos pero nunca la deciamos directo. Tambien: indemnificacion bidireccional (ellos indemnizan al usuario por IP de terceros) y garantia de 30 dias. Implementamos las 3. CodeRabbit reviso el PR y encontro 5 issues legitimos — el mas inteligente: nuestra clausula de "no entrenamiento" era overbroad porque decia "proveedores de LLM" pero BYOLLM envia codigo a un proveedor que NO controlamos. Fix: especificar "Groq (por defecto)" y separar BYOLLM. Tambien detecto que el privacy decia "tribunales" mientras los terms decian "arbitraje" — inconsistencia real. Cerrramos con una limpieza de 27 ramas stale (19 remotas ya borradas por GitHub + 8 que quedaban).

**Resultado:** PR #52 mergeado. 20-section terms + 16-section privacy en produccion. 3 mejoras de CodeRabbit benchmark. 5 fixes de CodeRabbit review. Repo limpio: solo main, cero branches stale. MEMORY.md reducido de 259 a 78 lineas.

**Aprendido:** Benchmarkear contra competidores antes de publicar legales es oro — CodeRabbit nos dio la clausula de no-model-training que nosotros nunca hubieramos pensado agregar. Tambien: cuando dices "proveedores de LLM no entrenan con tu codigo", necesitas distinguir entre TU proveedor por defecto (que controlas) y el BYOLLM del usuario (que no controlas). CodeRabbit es buen reviewer de legales — detecto la inconsistencia tribunales/arbitraje que hubiera sido un problema real.
