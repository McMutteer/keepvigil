# Session Cards

Zettelkasten-style memory triggers. Each card captures the narrative of a work session —
the obstacles, decisions, and discoveries that commits don't preserve.

---

---
id: 2026-03-17-full-codebase-audit
type: fix
project: vigil
branch: main
pr: 52, 56, 57, 58, 59, 60
date: 2026-03-17
tags: [audit, security, testing, coderabbit-benchmark, legal, self-evaluation, rate-limiter]
summary: "Full codebase audit: legal docs, 5 security fixes, 150 new tests (841→991), self-evaluation feedback loop, Pro subscription activated."
related: [2026-03-17-legal-implementation-and-coderabbit-benchmark]
---

### La Radiografia Completa

**Hilo:** Vigil v3 desplegado, GTM S1-S6 listos, landing live. Antes de seguir construyendo, habia que mirar adentro — revisar cada linea de codigo, cada patron, cada gap. Esta sesion fue la pausa para asegurar que los cimientos son solidos antes de abrir al publico.

**Lo que paso:** Arrancamos con los legales — 20 secciones de terms + 16 de privacy adaptados de MIIA, todo en espanol. Luego el usuario pidio benchmarkear contra CodeRabbit: descargamos sus Terms, Privacy y DPA. Tres hallazgos valiosos que adoptamos (no-model-training, garantia 30 dias, indemnificacion bidireccional). Despues lanzamos 5 agentes en paralelo para auditar core, github, executors, landing y arquitectura. Volvieron con 4 critical, 9 major, 20+ minor. Los critical eran reales: assertion executor trataba LLM unparseable como PASS (deberia ser FAIL), `response.body?.cancel()` no existe en el Fetch API, `cd "/etc"` bypasseaba la validacion de paths, y TypeScript/tsup con version drift entre paquetes. Los security tambien: race condition en rate limiter (read→check→increment no atomico), `customer_id` sin validar en billing, floating promise en checkout. CodeRabbit encontro que `cd "/etc"` (entre comillas) tambien bypasseaba — fix extra. Escribimos 150 tests nuevos para 8 modulos que no tenian (incluyendo el Stripe webhook handler que maneja dinero). El momento sorpresa: Vigil dio rate limit en PR #59 porque McMutteer no tenia suscripcion Pro — la tabla estaba vacia. Insert fallo por `stripe_customer_id NOT NULL`. Placeholders resolvieron, pero revelo que el schema no soporta suscripciones internas.

**Resultado:** 6 PRs mergeados (#52, #56-#60). 841→991 tests (+18%). 4 security fixes, 5 a11y/SEO fixes, allowlist expandido, 404 page, legal helpers refactorizados. `docs/vigil-self-evaluation.md` creado con 9 failure patterns y backlog priorizado. McMutteer activado como Pro.

**Aprendido:** (1) Benchmarkear contra competidores antes de publicar legales descubre clausulas que nunca habrias pensado (no-model-training). (2) "Proveedores de LLM" es overbroad cuando el usuario puede traer su propio provider via BYOLLM — hay que distinguir "tu default" vs "el del usuario". (3) Un assertion executor que trata respuestas no parseables como PASS es un bug silencioso que infla scores — fail-safe siempre. (4) `response.body?.cancel()` no existe en el Fetch API standard — usar `arrayBuffer()` para drenar streams. (5) Los rate limiters in-memory con read→check→increment tienen race conditions en Node.js aunque sea single-threaded — los callbacks async crean ventanas. (6) El self-evaluation log (`docs/vigil-self-evaluation.md`) es el artefacto mas valioso de esta sesion — convierte cada PR review de Vigil en una mejora futura del producto.

---
id: 2026-03-18-v2-phase1-claims-undocumented
type: feat
project: vigil
branch: main
pr: 66, 67, 68, 69, 70
date: 2026-03-18
tags: [v2, claims-verifier, undocumented-changes, dual-mode, pipeline-restructure, product-pivot]
summary: "Vigil v2 Phase 1: pipeline now processes ALL PRs with claims verification and undocumented change detection — 5 PRs, 42 new tests."
related: [2026-03-17-full-codebase-audit]
---

### El Gran Pivot

**Hilo:** La sesion anterior (audit) dejo el codebase solido — 991 tests, security clean, legal publicado. Pero la pregunta de fondo seguia: "pagaria alguien por esto?" La respuesta honesta fue no — Vigil v1 solo servia a devs que usan AI agents que generan test plans con checkboxes. Demasiado nicho. Esta sesion fue el pivot: de "test plan verifier" a "PR verifier."

**Lo que paso:** Empezamos divagando sobre la realidad del producto — cinco descubrimientos brutales: (1) el sandbox no puede ejecutar comandos reales, (2) un score numerico no cambia comportamiento, (3) BYOLLM es friccion pura, (4) la mayoria de PRs no tienen test plans, (5) la competencia es zero-config. De ahi salio el vision doc (`docs/vision-v2.md`) con tres capas: claims verification, undocumented changes, impact analysis. Lo guardamos local (gitignored). Luego ejecutamos Phase 1 en 5 PRs encadenados. El cambio arquitectonico central: quitar el `hasTestPlan()` gate del webhook handler — Vigil ahora procesa TODO PR. El pipeline se reestructuro con dual-mode (`v1+v2` vs `v2-only`) y perfiles de pesos diferentes por modo. La unica friction real fueron 6 tests que hardcodeaban signal weights — al rebalancear para incluir los 2 nuevos signals, los numeros cambiaron. El pattern de `diff-analyzer.ts` (system prompt + JSON parsing + graceful degradation) se copio perfectamente para ambos nuevos signals.

**Resultado:** 5 PRs mergeados (#66-#70). 2 nuevos signals (claims-verifier, undocumented-changes). Pipeline dual-mode. Formato de comentario v2 con secciones Claims y Undocumented. 1279→1321 tests. Vision doc local como roadmap para fases 2-5.

**Aprendido:** (1) El pattern de signal en Vigil es tan consistente que crear uno nuevo es copiar `diff-analyzer.ts` y cambiar el prompt — 30 min por signal incluyendo tests. (2) Dual-mode weights con `getWeights(mode)` es mas limpio que condicionales en cada signal — el peso 0 hace que `computeScore` ignore el signal automaticamente. (3) Cuando rebalanceas weights, **todos** los tests que hardcodean el numero van a romper — buscar con grep antes de mergear. (4) `hasTestPlan()` no se elimina del codebase, solo se mueve del webhook al pipeline — la decision v1+v2 vs v2-only se toma adentro, no afuera.

---
id: 2026-03-19-full-circle
type: design
project: vigil
branch: main
pr: 94, 95
date: 2026-03-19
tags: [strategic-pivot, ai-first, messaging-rewrite, docs-cleanup, deploy, dogfooding-fixes, coverage-exclude, dedup]
summary: "From audit to identity: deployed PRs #88-#93, fixed last 2 dogfooding bugs, rewrote entire landing+docs for AI-first positioning, and confronted what Vigil actually is."
related: [2026-03-18-v2-phase1-claims-undocumented]
---

### El Espejo

**Hilo:** Todo lo tecnico estaba hecho — dashboard, OAuth, i18n, auto-approve, v1 deprecado, 768 tests. Habiamos construido el motor completo. Pero al pararnos a mirar el producto terminado, la pregunta obvia: "¿y esto quien lo compra?" Esta sesion fue eso — dejar de construir y empezar a entender.

**Lo que paso:** Empezamos con housekeeping: ROADMAP.md estaba 3 fases atras, issues #12 y #13 apuntaban a codigo eliminado, 15 branches zombies en origin. Todo limpio en 15 minutos. Luego el deploy — 6 PRs acumulados (#88-#93) que nunca llegaron al servidor. El deploy revelo que los contenedores cambiaron de nombre (`keepvigil-*` → `code-*`) y Traefik apuntaba al fantasma del contenedor viejo. Port 3200 ocupado, stop containers viejos, update Traefik config, reiniciar — 10 minutos de fricciones de infra que siempre aparecen. Con todo live, atacamos los ultimos 2 bugs de dogfooding: (1) coverage mapper flaggeaba 20+ componentes React como "sin tests" — implementamos `coverage.exclude` en `.vigil.yml` para que repos configuren paths a ignorar, (2) inline comments se duplicaban en re-reviews — agregamos `fetchExistingBotComments()` que checa comments del bot antes de postear. PR #94, 768 tests, deploy.

Pero lo heavy vino despues. El usuario pregunto: "¿alguien pagaria por esto?" Y tuve que ser honesto. Vigil a $19/mo compitiendo genericamente contra CodeRabbit a $24/dev — dificil. El problema que resolvemos es real pero no es lo suficientemente doloroso para la mayoria. La revelacion: **el dolor no esta en "PRs mal documentados" — esta en "PRs que nadie realmente verifico."** Y ese dolor se multiplica exponencialmente con AI agents generando codigo. El pitch cambio de "verifies your PR" a "merge with confidence" — de lo tecnico a lo emocional. De "herramienta de verificacion" a "capa de confianza para la era del AI coding."

Dos agentes en paralelo reescribieron todo el landing (hero, signals, FAQ, pricing — ambos idiomas) y limpiaron 20 paginas de docs (8 eliminadas, 10 reescritas). Build exitoso, deploy, "Merge with confidence" live en keepvigil.dev.

**Resultado:** PRs #94-#95. Deploy completo. 2 bugs de dogfooding cerrados. 29 archivos cambiados en landing/docs (-2727 lineas de features deprecadas). 4 documentos estrategicos nuevos en memory (strategy, plan-landing, plan-docs, plan-content). CLAUDE.md y MEMORY.md actualizados.

**Aprendido:** (1) Construir el producto es la parte facil — entender para quien es, es lo dificil. Puedes tener 768 tests y un deploy limpio y aun asi no saber si alguien pagaria. (2) El angulo de "AI agent verification" no es un pivot — es una lente. El producto no cambia; la forma de contarlo si. El mismo `claims-verifier` que verifica PRs humanos verifica PRs de Devin. (3) "Merge with confidence" transmite urgencia emocional. "Verifies that your PR does what it says it does" transmite precision tecnica. Para vender, la emocion gana. (4) Worktrees aislados para agentes paralelos funcionan perfecto para landing+docs (archivos distintos), pero hay que copiar manualmente los cambios del worktree al repo principal antes de commitear — `git add` no ve archivos de otro worktree. (5) Los contenedores Docker cambian de nombre cuando cambias el `COMPOSE_PROJECT_NAME` (o el directorio). Traefik apunta a nombres de contenedor, no a servicios — siempre verificar despues de un rebuild.
