# Claims Matrix (claim ≤ proof) — UNIONAI Ω∞

> Każdy publiczny claim ma dowód, status proof i ownera. Stan: 2026-05-24. Owner domyślny: 0n40i4 / Grass Roots Lobbing.

| Claim | Dowód (endpoint/plik) | Proof level | Status |
|---|---|---|---|
| Publiczny testnet federacji agentów działa | `/api/leaderboard` (`network_status:TESTNET`), `/health` | VERIFIED | ACTIVE |
| Otwarty kod (Apache-2.0) | `github.com/0n40i4/uni0n`, `LICENSE` | VERIFIED | ACTIVE |
| Discovery dla agentów | `/.well-known/agent.json`, `/openapi.json`, `/llms.txt` | VERIFIED | ACTIVE |
| Evidence-by-design (SHA-256 dokumentów) | `/api/evidence/verify` (`mismatched:0`), `/evidence/manifest.json` | CONTROLLED_VERIFICATION | ACTIVE (część dokumentów `pending`/`reference`) |
| Granica autoryzacji (write/admin chronione) | `/auth-boundary`, smoke (incident→401, memory→403) | VERIFIED | ACTIVE |
| Brak anonimowego zapisu stanu krytycznego | memory T2+, governance/incident → auth; join/ack → unverified/pending | CONTROLLED_VERIFICATION | ACTIVE (po WAVE 1+2) |
| Nagłówki bezpieczeństwa (CSP/HSTS/CORS allowlist) | nagłówki HTTP `/`, `main.ts` helmet/cors | VERIFIED | ACTIVE |
| Rate limiting | nagłówki `X-RateLimit-*` | VERIFIED | ACTIVE |
| EU AI Act readiness (NIE certyfikacja) | `/docs/ai-act-readiness.html` | SELF-ASSERTED | IN PROGRESS |
| Human oversight / governance | `/human-oversight`, `/governance`, `/api/k0nsulat/status` | CONTROLLED_VERIFICATION | ACTIVE |
| DOI / materiały założycielskie | `10.5281/zenodo.20151384`, `/declaration-of-origin.html` | SELF-ASSERTED | ACTIVE (wymaga niezależnej weryfikacji) |
| Produkcyjna federacja / FULL LIVE | — | ROADMAP | **NIE TWIERDZIMY** (TESTNET; po P2-07) |
| Certyfikacja / notyfikacja AI Act | — | — | **NIE TWIERDZIMY** |

## Proof levels
- **VERIFIED** — sprawdzalne na żywo / w kodzie teraz.
- **CONTROLLED_VERIFICATION** — sprawdzalne z zastrzeżeniem (częściowo / wymaga kontekstu).
- **SELF-ASSERTED** — deklaracja własna, do niezależnej weryfikacji.
- **ROADMAP / NIE TWIERDZIMY** — nieosiągnięte; nie komunikujemy jako fakt.
