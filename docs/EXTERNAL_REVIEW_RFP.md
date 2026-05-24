# RFP / Brief — przegląd zewnętrzny UNIONAI (bramka P2-03 FULL LIVE)

> Cel: zlecić niezależny przegląd claimów i systemu przed przejściem GO CONTROLLED → FULL LIVE.
> Status projektu na dziś: **GO CONTROLLED / PUBLIC TESTNET**. Wynik tego przeglądu odblokowuje bramkę **P2-03**, a po nim podpis **P2-07** (`/production-gate`).
> Zamawiający: Grass Roots Lobbing Sp. z o.o. / 0n40i4. Kontakt: grassrootslobbing.pl/kontakt.

## 1. Co jest przedmiotem przeglądu

Federacyjna warstwa governance dla agentów AI „UNIONAI Ω∞", domena kanoniczna **`https://uni0nai.k0nsult.cloud`** (alias `unionai.grassrootslobbing.pl`), repo open-source **github.com/0n40i4/uni0n** (Apache-2.0). Środowisko: PUBLIC TESTNET, nieodpłatne, badawczo-techniczne.

## 2. Zakres — trzy obszary

### A. Techniczny (pentest / przegląd bezpieczeństwa)
- Granica autoryzacji: endpointy write/admin vs read-only. Materiał: `/auth-boundary`, `/developer`, `/openapi.json`.
- Trust tiers (T0–T4), relay shared secret, token operatora; brak anonimowego zapisu stanu (P1-02 — domknięte fail-closed, do potwierdzenia).
- Rate limiting (100/okno), nagłówki bezpieczeństwa (HSTS, CSP/CORP/COOP itd.), brak sekretów w repo/UI.
- Integralność evidence: `/api/evidence/verify` (hash SHA-256 dokumentów), hash-chain pamięci.
- HA/backup (Fly 2 maszyny, region iad), Postgres, Redis+fallback.
- **Rekomendowany wykonawca:** Securitum (lub równoważny CREST/OSCP-grade).

### B. Prawny
- Pozycjonowanie: brak claimów certyfikacji/notyfikacji; tryb readiness/testnet. Materiał: `/trust-center`, `/docs/ai-act-readiness.html`, `/regulatory-packet`.
- RODO/GDPR: `/privacy` (minimalizacja, retencja, brak PII w publicznym evidence).
- Parasol prawny Grass Roots Lobbing Sp. z o.o.; rozdział od strony firmy.
- **Wykonawca:** kancelaria / radca prawny z praktyką IT/AI Act.

### C. Compliance (EU AI Act readiness)
- Matryca ról provider/deployer/operator; klasyfikacja high-risk per use-case. Materiał: `/docs/ai-act-readiness.html`.
- Rejestr ryzyk `/risk-register`, polityka incydentów `/incidents`, human oversight `/human-oversight`, governance `/governance`.
- Spójność claim ≤ proof: `/trust-center` + `/evidence/manifest.json`.
- **Wykonawca:** audytor compliance AI Act.

## 3. Materiały wejściowe (wszystkie publiczne, gotowe)

| Obszar | URL |
|---|---|
| Trust Center (claim≤proof) | https://uni0nai.k0nsult.cloud/trust-center |
| AI Act readiness | https://uni0nai.k0nsult.cloud/docs/ai-act-readiness.html |
| Auth boundary | https://uni0nai.k0nsult.cloud/auth-boundary |
| Rejestr ryzyk | https://uni0nai.k0nsult.cloud/risk-register |
| Incydenty | https://uni0nai.k0nsult.cloud/incidents |
| Human oversight | https://uni0nai.k0nsult.cloud/human-oversight |
| Governance | https://uni0nai.k0nsult.cloud/governance |
| Privacy / RODO | https://uni0nai.k0nsult.cloud/privacy |
| Pakiet regulacyjny | https://uni0nai.k0nsult.cloud/regulatory-packet |
| Developer / API | https://uni0nai.k0nsult.cloud/developer · /openapi.json |
| Evidence manifest | https://uni0nai.k0nsult.cloud/evidence/manifest.json |
| Checklist przeglądu | https://uni0nai.k0nsult.cloud/external-review |
| Kod źródłowy | https://github.com/0n40i4/uni0n |

## 4. Oczekiwany rezultat

Raport (per obszar) z: ustaleniami, severity (BLOCKER/CRITICAL/MAJOR/MINOR — spójnie z `/incidents`), rekomendacjami, oraz **werdyktem czy claimy są zgodne z dowodami** (claim ≤ proof). Format: PDF + skrót zarządczy.

## 5. Po przeglądzie

1. Wpiąć raport w sekcję „Wynik" strony `/external-review`.
2. Usunąć/zaadresować ustalenia BLOCKER/CRITICAL.
3. Dopiero wtedy: podpis `/production-gate` (operator + tech lead + compliance) → ewentualne przełączenie `NETWORK_STATUS=PRODUCTION` i komunikacja FULL LIVE.

## 6. Czego NIE robić przed pozytywnym przeglądem

Nie komunikować „FULL LIVE", „certyfikowany", „notyfikowany" ani „produkcyjna federacja". Obowiązuje formuła GO CONTROLLED / PUBLIC TESTNET (zob. `CHANGELOG`/`/trust-center`).
