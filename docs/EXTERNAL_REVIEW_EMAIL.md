# Gotowy e-mail do audytora — przegląd zewnętrzny UNIONAI (P2-03)

> Kopiuj-wklej. Załącz `docs/EXTERNAL_REVIEW_RFP.md` (lub wklej jego treść). Wyślij osobno do: pentest (Securitum), kancelaria prawna, audytor compliance — albo do jednej firmy robiącej całość.

---

## Wariant A — pentest / bezpieczeństwo (np. Securitum)

**Temat:** Zapytanie ofertowe — przegląd bezpieczeństwa publicznego testnetu (open-source, AI federation)

**Treść:**

Dzień dobry,

reprezentuję Grass Roots Lobbing Sp. z o.o. (projekt badawczo-techniczny „UNIONAI Ω∞"). Chcielibyśmy zlecić **niezależny przegląd bezpieczeństwa** otwartej, publicznej wersji testowej naszej platformy przed ewentualnym przejściem z trybu kontrolowanego (public testnet) na produkcyjny.

Charakterystyka:
- Aplikacja webowa + API (Node.js/TypeScript), open-source (Apache-2.0): https://github.com/0n40i4/uni0n
- Domena: https://uni0nai.k0nsult.cloud
- Środowisko **testnet**, nieodpłatne, bez danych osobowych w warstwie publicznej.

Zakres przeglądu (szczegóły w załączonym briefie):
- granica autoryzacji (endpointy write/admin vs read-only), trust tiers, brak anonimowego zapisu stanu,
- rate limiting, nagłówki bezpieczeństwa, brak sekretów w repo/UI,
- integralność warstwy evidence (hash SHA-256), hash-chain pamięci,
- konfiguracja hostingu (Fly.io, HA, Postgres/Redis).

Oczekiwany rezultat: raport z ustaleniami (severity BLOCKER/CRITICAL/MAJOR/MINOR), rekomendacjami i werdyktem zgodności publicznych deklaracji z dowodami.

Proszę o informację nt. dostępności, orientacyjnego kosztu i terminu. W załączeniu brief z pełnym zakresem i listą materiałów (wszystkie publiczne).

Pozdrawiam,
[Imię i nazwisko], Grass Roots Lobbing Sp. z o.o.
kontakt@grassrootslobbing.pl · https://grassrootslobbing.pl

---

## Wariant B — przegląd prawny (kancelaria / radca IT/AI Act)

**Temat:** Zlecenie — przegląd prawny komunikacji i pozycjonowania (AI Act readiness, RODO)

**Treść:**

Dzień dobry,

Grass Roots Lobbing Sp. z o.o. prowadzi otwartą inicjatywę badawczo-techniczną „UNIONAI Ω∞" (publiczny testnet, nieodpłatny). Przed szerszą komunikacją prosimy o **przegląd prawny** pod kątem:
- braku claimów sugerujących certyfikację/notyfikację (pozycjonowanie readiness/testnet),
- zgodności z RODO (polityka prywatności, retencja, brak PII w publicznym evidence),
- poprawności rozdziału między projektem a spółką (parasol prawny).

Materiały (publiczne): https://uni0nai.k0nsult.cloud/trust-center · /docs/ai-act-readiness.html · /privacy · /regulatory-packet. Pełny zakres w załączonym briefie.

Proszę o ofertę i termin.

Pozdrawiam,
[Imię i nazwisko], Grass Roots Lobbing Sp. z o.o.

---

## Wariant C — compliance EU AI Act

**Temat:** Zlecenie — audyt readiness EU AI Act (klasyfikacja, role, nadzór)

**Treść:**

Dzień dobry,

prosimy o **niezależny audyt readiness EU AI Act** dla otwartej platformy „UNIONAI Ω∞" (testnet): weryfikacja matrycy ról (provider/deployer/operator), klasyfikacji high-risk per use-case, nadzoru ludzkiego, rejestru ryzyk i polityki incydentów oraz spójności zasady claim ≤ proof.

Materiały: https://uni0nai.k0nsult.cloud/docs/ai-act-readiness.html · /risk-register · /incidents · /human-oversight · /governance · /trust-center. Pełny zakres w briefie.

Proszę o ofertę i termin.

Pozdrawiam,
[Imię i nazwisko], Grass Roots Lobbing Sp. z o.o.

---

## Po otrzymaniu raportu
1. Zaadresować ustalenia BLOCKER/CRITICAL.
2. Wkleić link do raportu w sekcję „Wynik" strony `/external-review`.
3. Przejść do P2-07 (podpis production-gate).
