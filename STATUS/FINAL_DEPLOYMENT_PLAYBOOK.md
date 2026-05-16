# FINAL_DEPLOYMENT_PLAYBOOK — UNIONAI Ω∞

Data: 2026-05-16  
Owner: CORE  
Status dokumentu: EXECUTION READY

## 1) Source of Truth

- Repo: `github.com/0n40i4/uni0n`
- Środowisko produkcyjne: `https://unionai.grassrootslobbing.pl`
- Główne bramki decyzji: smoke + provenance + security retest

## 2) Standard deploy (checklista)

1. Merge/release branch zgodnie z polityką repo.
2. Deploy na środowisko produkcyjne.
3. Potwierdź ustawienia env (minimum):
   - `SERVICE_VERSION` / `APP_VERSION`
   - `BUILD_SHA` / `GIT_SHA`
   - `BUILD_TIME`
   - `RELEASE_CHANNEL`
4. Uruchom smoke:
   - `./STATUS/public-smoke-and-provenance.sh`
5. Zachowaj evidence w `EVIDENCE/smoke-runs/`.
6. Commit + push evidence.
7. Zaktualizuj `STATUS.md` (VERIFIED/SELF-ASSERTED/BLOCKED/ROADMAP).

## 3) Gate krytyczne (must-pass)

### Gate A — Endpoint suite

Wymagane: `PASS 9/9`
- `/health`
- `/healthz`
- `/readyz`
- `/version`
- `/.well-known/agent.json`
- `/openapi.json`
- `/rfc/index.json`
- `/api/k0nsulat/status`
- `/api/leaderboard`

### Gate B — Provenance consistency

Wymagane:
- `x-build-sha` != `unknown`
- `x-service-version` != `unknown`
- `/version.build_sha` zgodne z `/health` header
- `/version.version` zgodne z `/health` header

### Gate C — Security sanity

Wymagane:
- endpointy relay write nie są publicznie otwarte bez auth,
- rate-limit aktywny,
- JWT secret ustawiony,
- CORS/helmet aktywne.

## 4) Decyzja statusowa

- Jeśli Gate A+B+C = PASS → `GO PILOT` (lub FULL LIVE gate review)
- Jeśli którykolwiek gate = FAIL → `GO CONTROLLED` + blocker + owner + ETA

## 5) Rollback

1. Cofnij do ostatniego stabilnego release.
2. Potwierdź `/health` i `/version` po rollbacku.
3. Opublikuj incydent w STATUS/EVIDENCE.
4. Wstrzymaj overclaim i ustaw status `BLOCKED` do czasu zamknięcia przyczyny.

## 6) Artefakty obowiązkowe po każdym deployu

- `EVIDENCE/smoke-runs/smoke-<timestamp>.md`
- wpis w `STATUS.md`
- (opcjonalnie) krótki update do kanału operacyjnego na Discord
