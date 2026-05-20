# UNIONAI 9xMETA-GO — Wave 2 DEV NEXT + v0.2.0 Security Hardening

Data opracowania: 2026-05-20
Status: GO CONTROLLED / raport zgodności / memory packet
Drive: https://docs.google.com/document/d/1ClvZM1jYnc3R362qDMJ4jZKt5SaPWAaMqCVBSltG0ls/edit?usp=drivesdk

## Werdykt

Załącznik 9xmetago opisuje pełną sesję wdrożeniową UNIONAI, w której Wave 2 DEV NEXT zostało doprowadzone do stanu production operational, a następnie rozszerzone o v0.2.0 Security Hardening. Zakres Wave 2 + v0.2.0 jest zgodny i zamknięty dla warstwy infra + enterprise maturity + security baseline.

Najważniejsza granica: Semantic Core nie jest jeszcze ukończony. LEM ma rację: INFRA READY, SEMANTIC CORE NOT FINISHED.

## Zakres wykonany

- Wave 2 DEV NEXT: 4 rundy, 13 modułów, 29+ endpointów.
- Runda 1: Incident System + Metrics Engine.
- Runda 2: Docs Portal + Operator Dashboard.
- Runda 3: RFC Render Engine.
- Runda 4: Provider Onboarding + Compliance Matrix + Evidence Automation.
- v0.2.0 Security Hardening: JWT, rate limiting, provider API keys, compliance cron, migration isolation.
- UCHWAŁA_001_UNIONAI: DRAFT -> ACTIVE.
- Evidence manifest zsynchronizowany z Drive przez Plan B: drive_id + drive_url.

## Produkcja

- Live: https://unionai.grassrootslobbing.pl
- Health: https://unionai.grassrootslobbing.pl/health
- Docs: https://unionai.grassrootslobbing.pl/docs/
- RFC index: https://unionai.grassrootslobbing.pl/rfc/index.json
- RFC feed: https://unionai.grassrootslobbing.pl/rfc/feed.xml
- Evidence: https://unionai.grassrootslobbing.pl/evidence/manifest.json
- Compliance: https://unionai.grassrootslobbing.pl/compliance
- Compliance history: https://unionai.grassrootslobbing.pl/compliance/history.json
- llms.txt: https://unionai.grassrootslobbing.pl/llms.txt
- Participation notice: https://unionai.grassrootslobbing.pl/participation-notice.html

## Release / DOI

- Repo: https://github.com/0n40i4/uni0n
- v0.1.0: Wave 2 DEV NEXT Complete.
- DOI v0.1.0: https://doi.org/10.5281/zenodo.20151384
- v0.2.0: Security Hardening, release published, Zenodo pending według transkryptu.

## Kluczowe commity

- 3da55c0 — Runda 1 Incident System + Operator endpoints.
- e5aeaff — Metrics Engine.
- 1082cf2 — Docs Portal + Dashboard.
- bffab91 — RFC Render Engine.
- 35c5539 — Provider + Compliance + Evidence.
- f89c058 — final route/listen fix po Redis init.
- 957c85d — migracje 002/003/004 + landing endpoint.
- 542f312 — UCHWAŁA_001 DRAFT -> ACTIVE.
- f0e336a — v0.2.0 security hardening.
- 8d007ba — isolation migration steps.
- 2866968 — DOC-011 do manifestu.
- c0298db — Plan B drive_id + drive_url.

## Najważniejsze błędy i naprawy

1. Routes po app.listen() powodowały 404 mimo startu aplikacji. Fix: routery montowane po initRedis() i runMigrations().
2. Railway DNS / port / custom domain: port 3000, CNAME target pmgpfuby.up.railway.app, TXT verification.
3. Healthcheck: finalnie /health, timeout 30s.
4. Migracje Wave 2: brak incident_reports i tags naprawiony przez dodanie 002/003/004.
5. Konflikt rfc_registry z WAVE6: naprawiony przez izolację migracji.
6. Jawne hasło operatora w czacie: hasło zostało zrotowane; nie utrwalać hasła ani tokenu.

## Zgodność

- Rundy implementacyjne: 4/4.
- Moduły: 13/13.
- Endpointy: 29/29+.
- Security hardening: wykonane jako bonus v0.2.0.
- Evidence manifest vs Drive: 9/9 + drive links.
- Semantic Core: poza zakresem Wave 2, do Wave 3.

## Luka Wave 3

Do wykonania jako P0/P1:

1. Semantic Relay MVP.
2. Embedding routing z Qdrant.
3. Drift detection.
4. CRDT-lite memory sync.
5. Ontology bridge.

Stuby / niepełny runtime:

- POST /api/relay/send
- POST /api/relay/route
- POST /api/memory/anchor
- POST /api/memory/query
- POST /api/trust/verify

## Co świadomie pominięto

- Jawne hasło operatora i token JWT.
- Pełne outputy curl i długie HTML-e.
- Pełne diffy kodu.
- Binarne PDF-y z Drive.
- Sekrety Railway.

## Handoff do nowej sesji

/p UNIONAI Wave 3 — SEMANTIC CORE

Kontekst: Wave 2 DEV NEXT + v0.2.0 LIVE na https://unionai.grassrootslobbing.pl, DOI v0.1.0 10.5281/zenodo.20151384, evidence manifest Plan B z drive_id/drive_url, security hardening live. Diagnoza: INFRA READY, SEMANTIC CORE NOT FINISHED. P0: semantic relay, embedding routing, drift detection. P1: CRDT-lite memory sync, ontology bridge. Zasady: reuse-first, zero new deps jeśli możliwe, migration isolation, local test -> report -> operator ACK -> deploy.
