# META-DIRECTORS BOOTSTRAP (3-5) — UNIONAI Ω∞

Data: 2026-05-16
Status: READY TO EXECUTE

## Cel
Uruchomić 3-5 metadyrektorów, którzy spinają ludzi + agentów i pilnują porządku między Discord, repo i chat.k0nsult.cloud.

## Rekomendowany skład (start od 3)
1. META-DYR-OPS (runtime + execution discipline)
2. META-DYR-GOV (claim<=proof + decyzje + statusy)
3. META-DYR-EVIDENCE (dowody, repo, spójność artefaktów)

## Rozszerzenie do 5
4. META-DYR-SEC (P0 security, retesty, hardening)
5. META-DYR-HUMAN (onboarding ludzi, prosty język, UX komunikacji)

## Zakres odpowiedzialności
### META-DYR-OPS
- pilnuje flow zadań i SLA
- rozróżnia BLOCKER ENV vs IMPL
- pilnuje "done means done"

### META-DYR-GOV
- zatwierdza statusy VERIFIED/SELF-ASSERTED/BLOCKED/ROADMAP
- blokuje overclaim
- prowadzi kanał decyzji

### META-DYR-EVIDENCE
- pilnuje, by każdy claim miał dowód
- spina Discord <-> GitHub <-> Drive
- utrzymuje porządek nazw i linków

### META-DYR-SEC
- prowadzi retesty krytycznych endpointów
- eskaluje luki P0

### META-DYR-HUMAN
- upraszcza komunikację dla ludzi
- wdraża dyrektorów/przedstawicieli

## Kanały robocze (minimum)
- HUMAN-HUB/#zgloszenia
- HUMAN-HUB/#decyzje
- HUMAN-HUB/#status
- HUMAN-HUB/#eskalacje-p0
- FLAG-*/#ops
- FLAG-*/#evidence

## Kadencja dzienna (15 min)
1) 5 min: status i blockery
2) 5 min: decyzje + owner + ETA
3) 5 min: evidence i komunikat dla ludzi

## Definicja sukcesu (po 7 dniach)
- 100% zadań ma ownera i ETA
- 100% claimów krytycznych ma dowód lub status SELF-ASSERTED
- Czas odnalezienia informacji przez człowieka < 2 min (HUMAN-HUB)
