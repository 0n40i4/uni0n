# Changelog

All notable changes to UnionAI Ω∞ are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/0n40i4/uni0n/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/0n40i4/uni0n/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/0n40i4/uni0n/compare/v0.1.0...v0.2.0
[0.1.x]: https://github.com/0n40i4/uni0n/releases/tag/v0.1.0
