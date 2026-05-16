# UNIONAI Ω∞ STATUS

**Aktualny status:** **GO CONTROLLED / GENESIS TESTNET**  
**Data aktualizacji:** 2026-05-16

## VERIFIED
- `unionai.grassrootslobbing.pl` odpowiada publicznie (DNS resolve + HTTP 200 na `/health`).
- Podstawowy health runtime jest dostępny (`status`, `database`, `redis`).
- Pełny smoke endpointów krytycznych zakończony HTTP 200 (raport: `EVIDENCE/SMOKE_RUN_2026-05-16.md`).
- Dokument `README.md` został zaktualizowany do polityki claim <= proof.

## SELF-ASSERTED
- Pełna funkcjonalność modułów federacji/governance opisana w repo (wymaga pełnej walidacji runtime endpointów).
- Gotowość do przejścia na GO PILOT po domknięciu checklisty P0.

## BLOCKED
- Provenance release niezamknięte: nagłówki/metadane z wartościami `unknown` (np. build/version).
- Brak kompletnego, zapisanego pakietu smoke dla wszystkich endpointów krytycznych.
- Niejednoznaczny publiczny opis source-of-truth deploy (Railway/Fly/hybrid) wymaga doprecyzowania.

## ROADMAP
- P0: domknięcie smoke + provenance + source-of-truth.
- P1: evidence manifest, changelog deployów, rollback drill.
- P2: status page, incident register, claim-vs-proof matrix.

## Warunki przejścia na FULL LIVE

### P0 (MUST PASS)
- [ ] 100% PASS smoke endpointów krytycznych (wg `EVIDENCE/FULL_LIVE_READY_CHECKLIST.md`).
- [ ] Brak `unknown` w polach provenance (`build_sha`, `version`, `channel`, `build_time`).
- [ ] Jednoznaczny model produkcyjny (Railway/Fly/hybrid) i zgodna dokumentacja.

### P1 (SHOULD PASS)
- [ ] Opublikowany `evidence/manifest` z hashami i timestampami release.
- [ ] Publiczny changelog deployów.
- [ ] Udokumentowany i zaliczony rollback drill.

### P2 (POST-PILOT)
- [ ] Publiczny status page (HTML/JSON).
- [ ] Incident register.
- [ ] Publiczna claim-vs-proof matrix.

## Protokół aktualizacji statusu
- **Kto:** Owner techniczny + zatwierdzenie K0NSULAT.
- **Kiedy:** po każdej zmianie statusu oraz po każdym releasie wpływającym na claim-level.
- **Dowód:** link do artefaktów w `EVIDENCE/` (curl output, manifest, logi, timestamp).

---
**Zasada:** claim bez dowodu = `SELF-ASSERTED` lub `BLOCKED`, nigdy `VERIFIED`.