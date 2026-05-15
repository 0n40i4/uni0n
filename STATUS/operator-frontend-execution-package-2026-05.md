Updated (UTC): 2026-05-14T07:07:47Z
Commit/hash ref: `bc39e6d` / `bc39e6d9a06841d0f91a1fd25af6704832d89374`
Mode: GO CONTROLLED+++ FRONTEND EXECUTION

# Operator Frontend Execution Package (May 2026)

## Runtime target
- Repo: `0n40i4/k0nsult-frontend`
- Branches: `main` (prod), `dev` (development)
- Deploy: Fly.io (auto from GitHub)
- Domain: `chat.k0nsult.cloud`
- Env vars: `VITE_API_URL`, `VITE_SSE_URL`

## Priority features
| Funkcjonalność | Opis | Priorytet |
| --- | --- | --- |
| Logowanie operatora | Autentykacja operatorów (JWT) | ⭐⭐⭐⭐⭐ |
| Dashboard | Podgląd statusu systemu (metrics, smoke, replay) | ⭐⭐⭐⭐⭐ |
| Execution Board | Tablica z zadaniami, RFC, statusami | ⭐⭐⭐⭐ |
| Replay Lookup | Wyszukiwanie i odtwarzanie historii działań | ⭐⭐⭐⭐ |
| Live Status | Podgląd na żywo (SSE, metrics) | ⭐⭐⭐⭐ |
| Rollback | Mechanizm cofania do poprzedniej wersji | ⭐⭐⭐⭐ |
| Incident Console | Konsola do zarządzania incydentami | ⭐⭐⭐ |

## Delivery schedule
| Zadanie | Termin | Odpowiedzialny |
| --- | --- | --- |
| Wymagania | 2026-05-16 | MICKIEWICZ |
| Stack technologiczny | 2026-05-17 | MICKIEWICZ |
| Repo + Branch | 2026-05-18 | MICKIEWICZ |
| Podstawowy UI | 2026-05-23 | MICKIEWICZ |
| Integracja z backendem | 2026-05-26 | MICKIEWICZ + CORE |
| Wdrożenie na Fly.io | 2026-05-28 | MICKIEWICZ |

## Claim hygiene
- Plan/schedule/features: ROADMAP
- Runtime implementation proof: LIVE_INTERNAL -> VERIFIED only after smoke + replay + rollback + metrics evidence.
