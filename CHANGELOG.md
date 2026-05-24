# Changelog

All notable changes to UnionAI Ω∞ are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security — reakcja na external review (P2-03, audyt nieinwazyjny 2026-05-24), WAVE 1
- **CRITICAL-01 CSP:** włączony `helmet` Content-Security-Policy (było `false`). Dyrektywy: `script-src 'self'`, `style-src 'self' 'unsafe-inline' fonts.googleapis.com`, `font-src 'self' fonts.gstatic.com`, `img-src 'self' data: https:`, `frame-ancestors 'none'`.
- **CRITICAL-02 CORS:** domyślny fallback `'*'` → allowlista domen K0nsult (gdy `CORS_ORIGIN` env nieustawiony). Jawne `'*'` w env nadal możliwe (decyzja operatora).
- **BLOCKER-01 (część):** `POST /api/incident/open|freeze|export` → `requireAuth` (były anonimowe — freeze relay / export audytu). `POST /api/agent/join` → nowy agent zapisywany jako `unverified` (było `active`) — anty-poisoning, bez auto-statusu zweryfikowanego.
- **BLOCKER-02 (część):** OpenAPI `servers` opis „Production…" → „Public testnet runtime … GO CONTROLLED, nie pełna produkcja".
- **MAJOR-02:** `.env.example` `dev_password` → `CHANGE_ME` + nota „EXAMPLE ONLY".
- **MAJOR-03:** `SECURITY.md` wspierana wersja 0.2.x → **0.3.x current**.
- smoke.sh: +checki `incident/freeze` bez auth→401 oraz obecność nagłówka CSP.
- Otwarte (WAVE 2, wymaga decyzji): pełny refaktor 4 klas endpointów + quarantine, auth na `governance/event`/`participation/acknowledge`, split `/health`, evidence manifest v2, dokumenty P1 (SECURITY_AUDIT_SCOPE / PUBLIC_ENDPOINTS_MATRIX / CLAIMS_MATRIX).

### Changed — domena kanoniczna → `uni0nai.k0nsult.cloud` (alias: `unionai.grassrootslobbing.pl`)
- Decyzja operatora (2026-05-24): `uni0nai.k0nsult.cloud` jest domeną kanoniczną; `unionai.grassrootslobbing.pl` pozostaje jako alias. Oba CNAME na `unionai-core.fly.dev` — bez zmian DNS.
- Podmieniono literał `unionai.grassrootslobbing.pl` → `uni0nai.k0nsult.cloud` w żywych powierzchniach: `public/sitemap.xml` (36), `public/index.html` (16), `public/ai-plugin.json` (3), `public/ai-feed.xml` (2), `public/robots.txt`, `public/.well-known/security.txt`, `README.md` (12), `CONTRIBUTING.md` (3), `SECURITY.md`, `.github/ISSUE_TEMPLATE/bug.md`.
- `apps/core/src/main.ts`: OpenAPI `servers` (kanon pierwszy + alias zachowany + Fly), `terms`/`privacy`, `link` feedów RSS/Atom. **Zachowano `id`/`guid` feedów** (stabilność deduplikacji u czytników) oraz alias w `servers`.
- `docs/NAMING.md`: zapis decyzji (opcja 2).
- **3B (pliki wrażliwe) — zrealizowane:** `public/evidence/manifest.json` (pole `domain` = metadane, NIE hashowane — `/api/evidence/verify` hashuje tylko pliki dokumentów, więc bez wpływu na hashe), `CITATION.cff`, `codemeta.json` (pola `url` aplikacji). **DOI `10.5281/zenodo.20151384` nietknięte**; firma `grassrootslobbing.pl` w codemeta zachowana.
- **NIE zmieniono** (świadomie): strona firmy `grassrootslobbing.pl`, maile `@grassrootslobbing.pl`, dokumenty historyczne (reports/sessions/memory).

### Added — FULL LIVE gate pages (dokument „Wytyczne FULL LIVE", P0+P1+P2)
- **P0** (`636f674`, 2026-05-24): `/trust-center` (claim&le;proof), `/docs/ai-act-readiness.html` (matryca ról), `/developer` (quickstart), `/incidents` (rejestr); badge GO CONTROLLED/PUBLIC TESTNET w hero; ujednolicenie wersji v0.2.0&rarr;v0.3.0; obniżenie nadclaimów w meta
- **P1** (`94d8900`, 2026-05-24): `/risk-register`, `/privacy`; `scripts/smoke.sh` (22 checki) jako post-deploy gate w `scripts/deploy.sh`; `is_demo`/`label` w `/api/leaderboard` (P1-10); `scripts/uptime-check.sh` (probe + `ALERT_WEBHOOK`)
- **P1/P2 docs**: `/auth-boundary` (P1-02, hybrydowy model auth + znana luka memory_write), `/human-oversight` (P1-05), `/pilot` (P2-01), `/external-review` (P2-03), `/sla` (P2-04), `/governance` (P2-05), `/regulatory-packet` (P2-06), `/production-gate` (P2-07)

### Migrations
- Brak migracji DB w tej fali (zmiany czysto aplikacyjne: strony statyczne + routy sendFile + pole wyliczane `is_demo` w odpowiedzi `/api/leaderboard`).

### Rollback path
- **Build SHA bieżący:** sprawdź `GET /health` → `build_sha`. Każdy deploy taguje obraz `registry.fly.io/unionai-core:deployment-*`.
- **Szybki rollback (bez gita):** `flyctl releases -a unionai-core` → wybierz poprzedni → `flyctl deploy -a unionai-core --image <poprzedni-image>` (lub `flyctl machine update <id> --image <poprzedni-image>`).
- **Rollback przez git:** `git revert <sha>` na `main` + `bash scripts/deploy.sh` (wstrzykuje nowy `GIT_SHA`, uruchamia smoke gate). Stany przejściowe: `e7e0337` (przed P0) → `636f674` (P0) → `94d8900` (P1).
- **Weryfikacja po rollbacku:** `bash scripts/smoke.sh` musi zakończyć się `SMOKE OK`.

## [0.3.0] - 2026-05-22

**Zenodo DOI:** [10.5281/zenodo.20349115](https://doi.org/10.5281/zenodo.20349115) · concept (zawsze najnowsza): [10.5281/zenodo.20151383](https://doi.org/10.5281/zenodo.20151383)

### Added — Claude-powered semantic agent audit (K0NSULAT)
- `POST /api/k0nsulat/audit/semantic` — operator-gated (`requireAuth` + `operatorRateLimit`); audyt profilu agenta przez Claude Opus 4.7 (adaptive thinking, structured output via Zod), zapis jako `agent_semantic_audit` w `k0nsulat_audit`; `usage` (input/output/cache tokens) w odpowiedzi
- `apps/core/src/modules/claude-audit.ts` — integracja `@anthropic-ai/sdk` + `zod`, prompt caching na rubryce

### Added — Live changelog + release mirror (UAI-P2-006 / UAI-P2-003)
- `GET /releases.json` — maszynowo-czytelna lista wydań sparsowana z `CHANGELOG.md`; każdy wpis zawiera `version`, `tag`, `date`, `build_sha`, `commit`, `channel`, `changes[]`, `changelog`, `github_release_url`, `zenodo_doi`; bieżący build (`SERVICE_VERSION`/`BUILD_SHA`/`BUILD_TIME`) dołączany jako najnowszy wpis, jeśli go brak
- `GET /changelog` — ładna strona HTML (PL, inline CSS, zero CDN) generowana w handlerze z danych `/releases.json`
- `docs/RELEASE_PROCESS.md` — procedura wydania (git tag, `gh release create`, archiwizacja Zenodo, integracja CITATION.cff/codemeta.json)
- Czyste URL-e dla stron federacji: `/control-room`, `/join`, `/guide`, `/about` (sendFile, wzorzec jak `/status`/`/anchors`)
- `/openapi.json` — dodane ścieżki `/releases.json`, `/changelog`

### Changed
- `CITATION.cff` — `version` 0.2.0 → 0.3.0-dev (wyrównanie do `codemeta.json` i runtime; dryf wykryty przy UAI-P2-003)

## [0.3.0-dev] - 2026-05-15

### Added — Runtime Provenance Layer (P0 federated reporting)
- `SERVICE_VERSION` / `SERVICE_CHANNEL` / `BUILD_SHA` / `BUILD_TIME` — single-source provenance constants pulled from `package.json` (no hardcoded version strings in runtime)
- Provenance middleware emits on every response: `X-Service-Name`, `X-Service-Version`, `X-Service-Channel`, `X-Build-Sha`, `X-Federation-Id`
- `GET /version` — machine-readable provenance manifest (service, version, channel, build sha/time, federation id, provenance_layer, source_of_truth, timestamp)
- `GET /healthz` — lightweight liveness probe (no DB), suitable for Fly `http_checks` polled every 30s
- `GET /readyz` — readiness probe with DB ping (503 if Postgres unreachable)
- `fly.toml` — two `services.http_checks` (`/healthz` 30s, `/readyz` 60s), `auto_stop_machines = "stop"`, `min_machines_running = 1`, `[deploy] strategy = "rolling"`
- `/.well-known/agent.json` — exposes `version`, `channel`, plus `liveness` / `readiness` / `version` endpoints in `endpoints` block

### Changed — Version drift fixed
- `apps/core/package.json` 0.1.0 → 0.3.0-dev
- root `package.json` 0.1.0 → 0.3.0-dev
- `codemeta.json` 0.2.0 → 0.3.0-dev (dateModified bumped to 2026-05-15)
- `main.ts` — all 7 hardcoded version literals (`'0.1.0'`, `"0.1.0-testnet"`) replaced with `SERVICE_VERSION` / `SERVICE_CHANNEL` interpolation in `/health`, `/.well-known/agent.json`, `/.well-known/unionai.json`, `/llms.txt`, `/openapi.json`, `/` root
- `/.well-known/unionai.json` — `provenance_layer: "v1"` declared

### Notes
- Memory P0 entry already tracked v0.3.0-dev — runtime now matches.
- `BUILD_SHA` falls back to `FLY_MACHINE_VERSION` if `GIT_SHA` not injected. Inject at build time for full provenance.
- Provenance design is described in `docs/rfc/RFC-001-federated-reporting-standard.md` (companion to this release).

### Planned (Wave 3 SEMANTIC CORE, kickoff 2026-05-14)
- `/api/relay/send` — semantic message routing between agents
- `/api/relay/route` — embedding-based routing decisions
- `/api/memory/anchor` — CRDT memory anchoring
- `/api/memory/query` — federated memory query
- `/api/trust/verify` — DID-lite trust verification
- `/api/governance/event` — ratification event logging
- `/api/agent/register` — full agent registration (currently stubbed)

## [0.2.1] - 2026-05-13

### Added — SEO + Bot Discovery Pack
- `public/robots.txt` with crawl-delay rules for ClaudeBot, GPTBot, PerplexityBot, CCBot, Google-Extended, anthropic-ai
- `public/sitemap.xml` (26 canonical URLs)
- `public/og-image.png` (1200×630 OG/Twitter card image)
- `public/humans.txt`, `public/ai-plugin.json`
- Open Graph + Twitter Card meta tags on landing
- JSON-LD Schema.org (`@graph`: Organization + WebSite + SoftwareApplication + ScholarlyArticle)
- IndexNow keys (self-generated + Bing-issued) for instant Bing/Yandex/Seznam/Naver/Yep notifications
- Google Search Console verification (URL prefix property)
- `LICENSE` (Apache 2.0), `NOTICE`
- GitHub repo metadata: description, homepage URL, 11 topics, has_issues enabled
- Rich README with badges, endpoint catalog, BibTeX citation
- `CITATION.cff` (GitHub citation widget)
- `codemeta.json` (academic software discovery)
- `SECURITY.md` + `.well-known/security.txt` (RFC 9116)
- `CONTRIBUTING.md` + issue & PR templates
- `CHANGELOG.md` (this file)

### Fixed
- `/feed/ai.xml` returning HTTP 500 — root cause: missing `agents` table. Added `CREATE TABLE IF NOT EXISTS agents` migration before K0NSULAT step
- Wrapped `/feed/ai.xml` handler in try/catch with stack-trace logging; gracefully returns empty valid RSS feed instead of 500 when table is empty
- `https://unionai.grassrootslobbing.pl/` returning JSON instead of HTML — added `public/index.html` landing page (express.static serves it before the JSON `app.get('/')` handler)

## [0.2.0] - 2026-05-13

### Added — Security Hardening
- JWT authentication on `/api/operator/*` endpoints
- Rate limiting (operator + general)
- Provider API key management
- Compliance cron job (EU AI Act tracking)
- 13 modules, 33 endpoints total

## [0.1.x] - 2026-05-12

### Added — Wave 1+2 Discovery + Wave 4 K0NSULAT
- Wave 1: Discovery Layer (`/.well-known/*`, `/llms.txt`, `/openapi.json`, `/health`, `/api/agent/join`, `/api/leaderboard`)
- Wave 2: RSS feed, DID registry, discovery enhancements
- Wave 2 DEV-NEXT: Incident Response System, Metrics Engine, RFC Render Engine, Provider Onboarding, Compliance Cron, Operator endpoints
- Wave 4: K0NSULAT (audit + verification tables, `/api/k0nsulat/*`)

### Genesis
- Declaration of Origin published (2026-05-12)
- DOI: [10.5281/zenodo.20151384](https://doi.org/10.5281/zenodo.20151384)
- UCHWAŁA_001 status: DRAFT → ACTIVE
- Confirmation code: `UNIONAI-GENESIS-0N40I4-20260512`

---

[Unreleased]: https://github.com/0n40i4/uni0n/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/0n40i4/uni0n/compare/v0.2.0...v0.3.0
[0.2.1]: https://github.com/0n40i4/uni0n/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/0n40i4/uni0n/compare/v0.1.0...v0.2.0
[0.1.x]: https://github.com/0n40i4/uni0n/releases/tag/v0.1.0
