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
