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

- [x] **Config file** (`.vigil.yml`): timeouts, categorias ignoradas, custom shell allowlist por repo — done PR #22
- [x] **Config file UX**: warnings de valores rechazados en el comentario del PR, bloque collapsible con config aplicada — done PR #23
- [x] **Retry individual items**: `/vigil retry` (full re-run) y `/vigil retry tp-N` (items específicos) via comment command — done PR #24
- [x] **Webhook notificaciones**: enviar resultado a Slack/Discord cuando un plan falla — done PR #25
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
- [x] **L5**: http-client binary response corrupted como text — binary Content-Type detection + stream drain already in place
- [x] **L6**: Shell metacharacters regex — completed PR #14
- [x] **L7**: Console error collection sin limite — fixed PR #16
- [x] **L8**: Truncation suffix puede exceder limite — byte-safe truncation PR #21
- [x] **L9**: comment-builder usa type assertions inseguros — Array.isArray guards PR #21
- [x] **L10**: Dockerfile Alpine sin SHA pin — pinned via ARG + digest PR #21

---

## Notas

- P0/P1 todos resueltos (PRs #14, #15)
- P3 CI pipeline + graceful degradation completos (PRs #20, #21)
- P4 100% completo — todos los items resueltos
- P2: config file (#22), config UX (#23), retry (#24), webhooks (#25) completos — queda Marketplace
- Audit hardening round 2 completo (PR #26) — SSRF, .dockerignore, token redaction, queue race, Redis noeviction
- Siguiente recomendado: GitHub App Marketplace listing o Integration tests E2E
- Cuando se complete un item, marcarlo aqui Y en el GitHub Issue correspondiente
