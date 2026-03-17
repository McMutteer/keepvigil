# Legal Documents + i18n Plan

## Context

Vigil's current terms and privacy pages are basic placeholders (~6 sections each). MIIA (mi-ia.ai) has production-grade legal documents (20 sections terms, 16 sections privacy) written for Nqual5 S. de R.L. de C.V. Since the company is the same, we adapt the MIIA legal framework for Vigil — same legal armor, different product inside.

The legals need to be in Spanish (versión vinculante) with English translation. This requires i18n for the entire landing, which is GTM S9.

## Source Files

- **MIIA Terms (reference):** `/Users/sotero/keepvigil/terms.md` (299 lines, 20 sections)
- **MIIA Privacy (reference):** `/Users/sotero/keepvigil/privacy.md` (208 lines, 16 sections)
- **Current Vigil Terms:** `packages/landing/src/app/terms/page.tsx` (basic)
- **Current Vigil Privacy:** `packages/landing/src/app/privacy/page.tsx` (basic)

## What Stays the Same (from MIIA)

These sections transfer directly — same company, same jurisdiction:
- S1: Definiciones y aceptación (adjust definitions for Vigil)
- S2: Información de la empresa (Nqual5 S. de R.L., Jesús María, Ags)
- S3: Registro y acceso (age 13+, account rules)
- S11: Terminación y suspensión
- S12: Garantías y renuncias ("tal cual")
- S13: Limitación de responsabilidad (monto del último mes)
- S14: Indemnización
- S15: Resolución de conflictos (arbitraje Aguascalientes)
- S16: Derechos de autor
- S17: Comercio internacional
- S18: Idiomas y prevalencia (español vinculante)
- S19: Modificación de términos
- S20: Disposiciones finales

Privacy sections that transfer:
- S5: Conservación (24 meses max, anonimización)
- S6: Transferencia (sub-procesadores, cláusulas tipo)
- S7: Derechos ARCO + portabilidad + revocación
- S10: Seguridad (cifrado, control de acceso, breach notification 72hrs)
- S11: Uso permitido
- S12: Alcance internacional (GDPR, CCPA)
- S13: Cambios al aviso
- S14: Contacto (privacidad@nqual5.com)
- S15: Menores (include — coverage legal)
- S16: Vigencia

## What Needs Rewriting

### Terms

**Generalidades:** GitHub App que analiza PRs y genera confidence scores. 8 signals independientes. Open source bajo MIT License + hosted SaaS.

**S4 - Alcance del Servicio:**
- Vigil es una GitHub App que se instala en repos
- Analiza PRs: parsea test plans, ejecuta assertions, verifica contratos, escanea credenciales
- 8 signals: CI Bridge, Credential Scan, Test Execution, Plan Augmentor, Contract Checker, Coverage Mapper, Diff vs Claims, Gap Analysis
- Free tier: 6 signals, unlimited PRs/repos
- Pro tier: 8 signals + BYOLLM + webhooks ($19/mo)
- Team tier: dashboard + SSO + org config ($49/mo)

**S5 - Uso permitido:** Adaptar prohibiciones al contexto de code review (no usar para evaluar personas, no enviar código malicioso intencionalmente, no abusar del API de GitHub)

**S6 - Contenido y derechos:**
- Input: el código del usuario sigue siendo 100% suyo. Vigil NO almacena código.
- Output: los scores y reports son del usuario
- Licencia limitada: Vigil accede al código solo para análisis in-memory
- Código de Vigil: MIT License (self-hosting libre)
- Servicio hosted: propiedad de Nqual5

**S8 - Exactitud y limitaciones de IA:**
- Vigil usa LLM para clasificación, diff analysis, gap detection, plan augmentation, contract checking
- Los scores son advisory — la decisión de merge es del usuario
- El LLM puede dar false positives o false negatives
- BYOLLM: cuando el usuario configura su propio LLM, fragmentos de código van al provider del usuario

**S9 - Propiedad intelectual:** Dual license — MIT para el código fuente, propietario para el servicio hosted, marca "Vigil" y "The Sentinel" logo

**S10 - Pagos:** Suscripciones mensuales via Stripe (no tokens). Free forever para tier básico. No reembolsos por períodos parciales. 30 días de aviso para cambios de precio.

### Privacy

**S1 - Introducción:** Adaptar para Vigil — análisis de código, no chatbot

**S2 - Responsable:** Nqual5, mismos datos. Correo: privacidad@nqual5.com

**S3 - Datos que recabamos:**
- 3.1 Cuenta: GitHub user ID, email (from GitHub OAuth), installation ID
- 3.2 Datos de PRs: PR body (test plan), PR diff, file tree — procesados in-memory, NO almacenados
- 3.3 Metadata almacenada: confidence scores, signal results, timestamps, repo/PR identifiers
- 3.4 Datos técnicos: IP (logs), webhook payloads
- 3.5 Datos de pago: via Stripe (Vigil no almacena tarjetas)
- NO recabamos: código fuente (in-memory only), datos personales de terceros, datos sensibles

**S4 - Finalidades:**
- Prestación del servicio (analizar PRs, generar scores)
- Mejora del producto (métricas agregadas y anonimizadas)
- Seguridad (detección de abuso, rate limiting)
- Comunicación (notificaciones de servicio)

**S8 - Cookies:** Vigil landing no usa cookies ni tracking (ya lo dice el privacy actual). Mantener.

**S9 - Propiedad:** El código del usuario es suyo. Vigil accede temporalmente via GitHub API. No almacena.

## Decisions

- **Correo contacto:** privacidad@nqual5.com (empresa), soporte: hello@keepvigil.dev
- **Idioma vinculante:** Español. Traducción al inglés cuando se implemente i18n.
- **Menores:** Incluir sección por cobertura legal (age 13+ como MIIA)
- **BYOLLM:** Mantener disclaimer — fragmentos de código van al LLM provider del usuario
- **Sub-procesadores:** GitHub (API), Groq (LLM default), Contabo/Dokploy (hosting EU), Stripe (pagos)

## i18n (companion task — GTM S9)

When implementing i18n for the full landing:
- Use next-intl or similar for Next.js App Router
- Default language from browser Accept-Language header
- Manual toggle in navbar (ES/EN)
- Legal pages: Spanish = canonical, English = translation
- URL structure: `/es/terms`, `/en/terms` or `/terms?lang=es`
- All 18 doc pages + 13 landing sections + legal pages

## Implementation Order

1. ~~Write terms in Spanish (adapt MIIA → Vigil)~~ ✅ Done (PR pending)
2. ~~Write privacy in Spanish (adapt MIIA → Vigil)~~ ✅ Done (PR pending)
3. ~~Create page components~~ ✅ Done — TSX with shared helper components
4. ~~Deploy Spanish versions replacing current basic pages~~ ✅ Merged with PR
5. (Later, with i18n) Add English translations
6. (Later, with i18n) Add language detection + toggle

## Effort

- Legal adaptation: ✅ Completed in 1 session
- i18n implementation: ~2-3 days (separate task)
