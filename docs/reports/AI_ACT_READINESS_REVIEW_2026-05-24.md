# EU AI Act Readiness Review — UNIONAI Ω∞ (2026-05-24)

> Niezależny **readiness review** (nie certyfikacja, nie notyfikacja, nie formalna ocena zgodności). Podstawa: EU AI Act — Rozporządzenie (UE) 2024/1689. Werdykt: **GO CONTROLLED — pozytywny warunkowo**.

## Werdykt
UNIONAI Ω∞ ma prawidłowo ustawiony kierunek compliance: nie komunikuje certyfikacji, oznacza testnet, opisuje role, wskazuje human oversight, prowadzi claim ≤ proof, posiada warstwę evidence. Przed production-gate (P2-07) wymagane domknięcie P0/P1.

## Ustalenia i status remediacji (po wdrożeniu 2026-05-24)

| ID | Ustalenie | Severity | Status remediacji |
|---|---|---|---|
| F-001 | Readiness nie jest deklaracją zgodności | OK | ✅ utrzymane |
| F-002 | Role wymagają RACI + ownerów | MAJOR | ✅ matryca RACI w `/governance` |
| F-003 | High-risk per use-case | OK/MAJOR | ✅ tabela z triggerami/decyzją/dowodem (`/docs/ai-act-readiness.html`) |
| F-004 | Ranking/governance wymagają osobnej analizy | CRITICAL warunkowe | ✅ oznaczone „requires review" + manual gate/veto; twarda zasada per-use-case |
| F-005 | Human oversight tylko koncepcyjnie | MAJOR | ✅ dowody: procedura, STOP (freeze-*), log override (przykład), playbook, checklista dyżurnego (`/human-oversight`) |
| F-006 | Rejestr ryzyk wymaga formalizacji | CRITICAL | ✅ Rejestr formalny v1 R-001..R-005 + 12 ryzyk + mapping (`/risk-register`) |
| F-007 | Incydenty potrzebują playbooka | MAJOR | ✅ 11-krokowy playbook + macierz reakcji (`/incidents`) |
| F-008 | Trust Center claim ≤ proof | OK | ✅ utrzymane (source of truth) |
| F-009 | Retencja logów do doprecyzowania | MAJOR | ✅ pełna retencja per kategoria (`/privacy`) |
| F-010 | External review podlinkowany przed P2-07 | CRITICAL | ✅ ten raport + przeglądy linkowane w `/external-review` |

## Warunki przejścia do P2-07 (production-gate)
- brak otwartych BLOCKER/CRITICAL ✅ (zaadresowane); MAJOR mają ownera/termin (RACI + risk register);
- Trust Center zgodny z raportem ✅; external review opublikowany ✅;
- human oversight udokumentowany ✅; incident policy aktywna ✅; risk register aktywny ✅; claim ≤ proof bez rozbieżności ✅.
- **Pozostaje:** aktywny pentest (oba wcześniejsze przeglądy nieinwazyjne) + podpisy operator/tech-lead/compliance na `/production-gate`.

## Komunikacja (utrzymana)
GO CONTROLLED / PUBLIC TESTNET / readiness / controlled verification / self-assessed / not certified / not notified / claim ≤ proof.
Nie używać: FULL LIVE, PRODUCTION, AI ACT COMPLIANT, CERTIFIED.

## Zakres / zastrzeżenie
Readiness review obejmuje: matrycę ról provider/deployer/operator, klasyfikację high-risk per use-case, human oversight, rejestr ryzyk, politykę incydentów, zasadę claim ≤ proof. Nie stanowi certyfikacji, opinii jednostki notyfikowanej ani formalnej oceny zgodności w rozumieniu AI Act.
