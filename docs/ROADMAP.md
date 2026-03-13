# Vigil Roadmap

Backlog de mejoras priorizadas. Referencia principal para cualquier sesión de trabajo.

---

## P0 — Bugs de produccion (audit MEDIUM, alto impacto)

- [x] **M4**: Parse vacio deja check run en "pending" forever — fixed PR #15
- [x] **M1**: Health endpoint no verifica DB/Redis — fixed PR #15
- [x] **M8**: Regex DoS en metadata checker — fixed PR #15
- [x] **M13**: Queue sin validacion de tamano de payload — fixed PR #15
- [x] **M11**: NPX allowlist acepta flags peligrosos — fixed PR #15

## P1 — Correctness y robustez (audit MEDIUM, menor impacto)

- [x] **M3**: Race condition en inicializacion de queue — fixed PR #15
- [x] **M12**: jobId sin installationId = posible colision — fixed PR #14
- [x] **M14**: Error de parsing genera reporte confuso — fixed PR #15

## P2 — Features de alto valor

- [ ] **Config file** (`.vigil.yml`): timeouts, categorias ignoradas, custom shell allowlist por repo
- [ ] **Retry individual items**: re-ejecutar un solo test item que fallo (flaky)
- [ ] **Webhook notificaciones**: enviar resultado a Slack/Discord cuando un plan falla
- [ ] **GitHub App Marketplace listing**: publicar para que otros instalen

## P3 — Mejoras tecnicas / DX

- [x] **Structured logging**: pino con correlation IDs — done PR #17
- [x] **Metrics/observability**: Prometheus endpoint — done PR #17
- [x] **Test coverage**: 417 tests, coverage thresholds enforced — done PR #19
- [x] **CI pipeline**: GitHub Actions para build/test/lint/typecheck en PRs — done PR #20
- [ ] **Integration tests**: E2E con PR real (mock GitHub o test repo)
- [x] **Graceful degradation**: si Groq esta caido, clasificar todo como "manual" — done PR #21

## P4 — Hardening (audit LOW)

- [x] **L1**: Bold heading regex — documented, edge case tested PR #19
- [x] **L2**: Hints codeBlocks accumulation — fixed PR #14, tested PR #19
- [x] **L3**: Status code rule false positives — negative lookahead added PR #14, tested PR #19
- [x] **L4**: assertText pasa con empty string — already guarded, verified with tests PR #21
- [ ] **L5**: http-client binary response corrupted como text (`packages/executors/src/http-client.ts:78-91`)
- [x] **L6**: Shell metacharacters regex — completed PR #14
- [x] **L7**: Console error collection sin limite — fixed PR #16
- [x] **L8**: Truncation suffix puede exceder limite — byte-safe truncation PR #21
- [x] **L9**: comment-builder usa type assertions inseguros — Array.isArray guards PR #21
- [x] **L10**: Dockerfile Alpine sin SHA pin — pinned via ARG + digest PR #21

---

## Notas

- P0/P1 todos resueltos (PRs #14, #15)
- P3 CI pipeline + graceful degradation completos (PRs #20, #21)
- P4 casi completo — solo L5 pendiente (http-client binary response)
- P2 features requieren product decisions — empezar con `.vigil.yml` config file
- Cuando se complete un item, marcarlo aqui Y en el GitHub Issue correspondiente
