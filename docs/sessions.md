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
