# FINAL_GOVERNANCE_MATRIX — CLAIM ≤ PROOF

Data: 2026-05-16  
Owner: KONSULAT + CORE

## 1) Klasyfikacje

- **VERIFIED** — potwierdzone dowodem runtime/public artifact.
- **SELF-ASSERTED** — deklaracja zespołu bez pełnego dowodu publicznego.
- **BLOCKED** — wykryty blocker (ENV/IMPL) uniemożliwia claim.
- **ROADMAP** — planowany element, nieaktywny produkcyjnie.

## 2) Matryca (stan bieżący)

| Obszar | Claim | Status | Dowód | Owner | Następny krok |
|---|---|---|---|---|---|
| Public runtime | unionai.grassrootslobbing.pl odpowiada publicznie | VERIFIED | smoke run PASS 9/9 | CORE | monitor cykliczny |
| Provenance | build/version headers i payload spójne | VERIFIED | smoke provenance PASS | CORE | utrzymać env discipline |
| Governance API | `/api/k0nsulat/status` działa | VERIFIED | HTTP 200 + endpoint suite | CORE/KONSULAT | monitoring |
| Security relay | write relay wymaga auth | BLOCKED (do ponownej walidacji) | brak aktualnego PASS retestu security | CORE | wykonać retest i zamknąć P0 |
| Evidence hash chain | wszystkie pozycje mają SHA256 | SELF-ASSERTED / PARTIAL | manifest z `evidence_hash_status: PARTIAL` | Evidence owner | dostarczyć brakujące pliki/hash |
| Marketing claim FULL LIVE | pełny live bez zastrzeżeń | BLOCKED | gate review niezamknięty | KONSULAT | zamknąć wszystkie P0 |

## 3) Zasady publikacji statusu

1. Nie używamy etykiety FULL LIVE bez zamknięcia wszystkich blockerów P0.
2. Każdy status musi mieć dowód i ownera.
3. `BLOCKED` zawsze rozbijamy na:
   - `ENV` (środowisko/infrastruktura)
   - `IMPL` (kod/logika).

## 4) Decyzja operacyjna (obecna)

- Rekomendacja: **GO PILOT candidate / FULL LIVE gate review**.
- Utrzymać claim discipline i codzienny update matrycy.
