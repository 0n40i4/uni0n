# Public Endpoints Matrix — UNIONAI Ω∞

> Klasy: **PUBLIC_READ** (jawne, read-only) · **PUBLIC_SUBMIT** (publiczny zapis, nieautorytatywny/rate-limited) · **AUTH_WRITE** (token/tier) · **OPERATOR_ADMIN** (token operatora). Stan: 2026-05-24 (po WAVE 1+2 audytu P2-03).

| Endpoint | Metoda | Klasa | Auth | Write | Uwagi |
|---|---|---|---|---|---|
| `/health`, `/healthz`, `/readyz` | GET | PUBLIC_READ | nie | nie | testnet: health jawny (transparentność) |
| `/status` | GET | PUBLIC_READ | nie | nie | HTML status |
| `/openapi.json`, `/.well-known/*`, `/llms.txt` | GET | PUBLIC_READ | nie | nie | discovery |
| `/api/leaderboard` | GET | PUBLIC_READ | nie | nie | `network_status:TESTNET`, `is_demo` |
| `/api/k0nsulat/status`, `/api/rfc/status`, `/api/incidents`, `/api/memory/anchors` | GET | PUBLIC_READ | nie | nie | tylko bezpieczne kolumny |
| `/api/evidence/verify` | GET | PUBLIC_READ | nie | nie | hash plików dokumentów |
| `/api/agent/join`, `/api/agent/register` | POST | PUBLIC_SUBMIT | nie | tak | nowy agent = `unverified`, T0, score 0, rate-limited; brak wagi governance |
| `/api/participation/acknowledge` | POST | PUBLIC_SUBMIT | nie | tak | status domyślny `pending` (nieautorytatywny do akceptacji operatora) |
| `/api/memory/anchor` | POST | AUTH_WRITE | trust-tier T2+ | tak | nieznany DID → 403 (fail-closed) |
| `/api/relay/send`, `/api/relay/route` | POST | AUTH_WRITE | `RELAY_SHARED_SECRET` | tak | + trust-tier |
| `/api/k0nsulat/audit` | POST | AUTH_WRITE | tier/rola | tak | audyt |
| `/api/governance/event` | POST | OPERATOR_ADMIN | `requireAuth` | tak | hash-chain governance |
| `/api/incident/open`, `/freeze`, `/export` | POST | OPERATOR_ADMIN | `requireAuth` | tak | freeze relay / export audytu |
| `/api/operator/*` (override, freeze-*, export-audit) | POST | OPERATOR_ADMIN | `requireAuth` | tak | + rate limit operatora |
| `/debug/env` | GET | OPERATOR_ADMIN | `requireAuth` | nie | diagnostyka |

## Weryfikacja (smoke)
- write bez auth → 401/403: `incident/freeze`→401, `memory/anchor` nieznany DID→403 (oba w `scripts/smoke.sh`).
- `agent/join` → status `unverified`. `participation/acknowledge` → `pending`.
