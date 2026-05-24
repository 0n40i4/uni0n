# Security Audit Scope — UNIONAI Ω∞

> Zakres i zasady dla niezależnych audytorów/badaczy bezpieczeństwa. Status systemu: **GO CONTROLLED / PUBLIC TESTNET**.

## In-scope
- `https://uni0nai.k0nsult.cloud` (alias `unionai.grassrootslobbing.pl`) — warstwa publiczna i API.
- Repozytorium open-source: `https://github.com/0n40i4/uni0n` (Apache-2.0).
- Publiczne endpointy: discovery (`/.well-known/*`, `/openapi.json`, `/llms.txt`), read API (`/health`, `/api/leaderboard`, `/api/k0nsulat/status`, `/api/evidence/verify`), strony gate.

## Out-of-scope
- Infrastruktura Fly.io / hosting (poza konfiguracją aplikacji).
- Strona firmy `grassrootslobbing.pl` i poddomeny niezwiązane z federacją.
- Konta i sekrety operatora (rotowane poza repo).
- Usługi zewnętrzne (Anthropic/OpenAI, Zenodo, Google Drive).

## Zasady (safe harbor)
- Dozwolony przegląd **nieinwazyjny**: czytanie kodu, OpenAPI, odpowiedzi publicznych endpointów, weryfikacja nagłówków.
- **Zakaz:** brute-force, fuzzing, DoS/testy obciążeniowe, masowy zapis do API, próby obejścia auth na produkcji, exfiltracja danych, modyfikacja stanu.
- Testy zapisu wyłącznie po uzgodnieniu, na danych oznaczonych testowo.
- Działając w dobrej wierze i zgodnie z powyższym, nie podejmiemy kroków prawnych.

## Klasyfikacja ustaleń
- **BLOCKER** — uniemożliwia FULL GO (np. anonimowy zapis stanu krytycznego).
- **CRITICAL** — poważne ryzyko produkcyjne (np. brak CSP, wildcard CORS).
- **MAJOR** — istotne, z workaroundem (np. niespójność wersji, ekspozycja health).
- **MINOR** — kosmetyka / język komunikacji.

## Kontakt
- Zgłoszenia: `kontakt@grassrootslobbing.pl` (temat: SECURITY UNIONAI).
- Polityka: [`SECURITY.md`](../SECURITY.md). Rejestr incydentów: `/incidents`.
