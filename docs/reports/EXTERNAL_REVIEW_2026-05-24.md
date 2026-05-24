# External Review — UNIONAI Ω∞ (2026-05-24)

> Audyt **nieinwazyjny** (bez brute-force/fuzzingu/DoS/zapisu). Zakres: domena publiczna, repo, publiczne endpointy i deklaracje.
> **Werdykt audytora: GO CONTROLLED — NIE FULL GO.** Dokument przechowuje wynik + status remediacji (P2-03).

## Werdykt
System ma realną warstwę publiczną, repo, health, manifest evidence, OpenAPI, discovery i podstawowy hardening — ale **nie może być komunikowany jako pełna produkcja / pełna zgodność** do zamknięcia P0/P1. Werdykt zgodny z naszym własnym: **GO CONTROLLED / PUBLIC TESTNET**.

## Ustalenia i status remediacji

| ID | Ustalenie | Status remediacji |
|---|---|---|
| BLOCKER-01 | Publiczne write-endpointy bez bariery | ✅ **WAVE 1+2:** incident/open\|freeze\|export → `requireAuth`; governance/event → `requireAuth`; agent/join → `unverified`; participation/acknowledge → `pending`. memory/anchor już miało trust-gate T2+ (P1-02). Pełny refaktor 4-klasowy + quarantine queue: ROADMAP. |
| BLOCKER-02 | Konflikt statusów LIVE/Production/TESTNET | ✅ **WAVE 1:** OpenAPI servers → „Public testnet runtime… GO CONTROLLED"; homepage badge GO CONTROLLED/PUBLIC TESTNET; status-bar v0.3.0. `env:production` w `/health` = runtime env (testnet), opisane w CLAIMS_MATRIX. |
| CRITICAL-01 | CSP wyłączony | ✅ **WAVE 1:** helmet CSP włączony (Google Fonts dozwolone, `frame-ancestors none`). |
| CRITICAL-02 | CORS wildcard | ✅ **WAVE 1:** default `'*'` → allowlista K0nsult (env override możliwy). Audyt nie widział, że parser allowlisty już istniał (Lyra P1.4). |
| MAJOR-01 | Evidence częściowo verified | ⏳ **ROADMAP (C):** manifest v2 z klasami verified/pending/reference_only. Dziś: `/api/evidence/verify mismatched:0`; opis w CLAIMS_MATRIX. |
| MAJOR-02 | `.env.example` dev_password | ✅ **WAVE 1:** → `CHANGE_ME` + nota EXAMPLE ONLY. |
| MAJOR-03 | SECURITY.md wersja 0.2.x | ✅ **WAVE 1:** → 0.3.x current. |
| MAJOR-04 | `/health` ujawnia szczegóły | ◻️ **AKCEPTOWANE dla testnetu** (audyt: transparentność OK); `/healthz` minimalny istnieje. Split przy przejściu na produkcję. |
| MINOR-01 | Język DOI/podpis | ✅ częściowo (CLAIMS_MATRIX rozdziela proof levels); dalsze doprecyzowanie copy: ROADMAP. |

## P1 — artefakty audytowe (dodane)
- `docs/SECURITY_AUDIT_SCOPE.md` (in/out-of-scope, safe harbor, severity).
- `docs/PUBLIC_ENDPOINTS_MATRIX.md` (klasy endpointów).
- `docs/CLAIMS_MATRIX.md` (claim ≤ proof).
- Scan sekretów (gitleaks niedostępny → ręczny wzorcowy skan plików śledzonych): **0 znalezisk** (brak private keys / AWS / hardcoded haseł / JWT). Rekomendacja: dodać gitleaks/CodeQL/Dependabot do CI (blokada: billing Actions — deploy ręczny).

## Pozostałe do FULL GO
- Pełny refaktor klas endpointów + kolejka quarantine (rozszerzenie BLOCKER-01).
- Evidence manifest v2 (MAJOR-01).
- CI security tooling (gitleaks/CodeQL/Dependabot/SBOM) — zależne od billingu Actions.
- Niezależny pełny re-test po powyższym + podpis `/production-gate` (P2-07).

## Komunikacja (utrzymana)
PUBLIC TESTNET / DEV / GO CONTROLLED. Nie używać: FULL LIVE, PRODUCTION READY, CERTIFIED, VERIFIED COMPLIANCE.
