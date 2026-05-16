# FULL LIVE READY CHECKLIST

> Cel: szybka i audytowalna walidacja gotowości środowiska LIVE.
> Instrukcja: zaznacz `[x]` po spełnieniu kryterium, wpisz wynik (`PASS`/`FAIL`) i uzupełnij dowód (link, log, zrzut, komenda, timestamp).

---

## Metadane weryfikacji

- Data/czas weryfikacji: `........................................`
- Środowisko: `........................................`
- Weryfikujący: `........................................`
- Wersja release: `........................................`

---

## P0 — Smoke endpoints (must-pass)

### 1) `GET /health`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli endpoint odpowiada kodem `200` i zwraca poprawny JSON statusu; w innym przypadku `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `curl/output/log/link: ........................................`

### 2) `GET /healthz`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli kod `200` i semantycznie zdrowy status (np. `ok/healthy`); inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 3) `GET /readyz`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli kod `200` i gotowość aplikacji (brak blokujących zależności); inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 4) `GET /version`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli kod `200` oraz zawiera komplet metadanych wersji (co najmniej `build_sha`, `version`, `channel`, `build_time`) bez wartości `unknown`; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 5) `GET /.well-known/agent.json`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli kod `200` i zwracany jest poprawny JSON zgodny z oczekiwanym schematem agenta; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 6) `GET /openapi.json`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli kod `200`, JSON poprawny składniowo i specyfikacja parsuje się bez błędów krytycznych; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 7) `GET /rfc/index.json`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli kod `200` i indeks RFC jest dostępny/parsowalny; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 8) `GET /api/k0nsulat/status`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli kod `200` i status usługi `k0nsulat` jest jednoznacznie zdrowy; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 9) `GET /api/leaderboard`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli kod `200`, payload niepusty (lub zgodny z kontraktem dla pustego stanu) i bez błędów serwera; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

---

## P0 — Provenance (must-pass)

### 10) `build_sha` obecny i nie-`unknown`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli `build_sha` jest niepusty, ma poprawny format i nie jest `unknown`; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 11) `version` obecna i nie-`unknown`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli `version` jest ustawiona (np. semver/tag) i nie jest `unknown`; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 12) `channel` obecny i nie-`unknown`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli `channel` jest jawnie ustawiony (np. `prod`, `staging`) i nie jest `unknown`; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 13) `build_time` obecny i nie-`unknown`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli `build_time` istnieje, jest parsowalny jako data/czas i nie jest `unknown`; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

---

## P0 — Deploy truth (must-pass)

### 14) Model wdrożenia jest jednoznaczny: `Railway` / `Fly` / `hybrid`
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli dokumentacja + runtime + konfiguracja wskazują dokładnie jeden stan (`Railway`, `Fly` albo `hybrid`) bez sprzeczności; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Zidentyfikowany model:** `Railway / Fly / hybrid`
- **Dowód:** `........................................`

---

## P1 — Operacyjna dojrzałość

### 15) Manifest hashy artefaktów release
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli istnieje aktualny manifest (np. SHA256) dla kluczowych artefaktów i jest możliwy do zweryfikowania; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 16) Changelog deploy (co weszło na LIVE)
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli istnieje czytelny changelog wdrożenia (zakres zmian, commit/tag, data, autor/owner); inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 17) Rollback drill (próba wycofania)
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli wykonano i udokumentowano ćwiczenie rollbacku z akceptowalnym RTO/RPO; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

---

## P2 — Governance / transparentność

### 18) Status page
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli istnieje publiczna lub wewnętrzna strona statusowa aktualizowana operacyjnie; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 19) Incident register
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli istnieje rejestr incydentów (ID, data, wpływ, RCA, akcje naprawcze); inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

### 20) Claim-vs-proof matrix
- [ ] **Sprawdzone**
- **Kryterium PASS/FAIL:** `PASS` jeśli dla kluczowych claimów produkcyjnych istnieje jawne mapowanie na dowody techniczne; inaczej `FAIL`.
- **Wynik:** `PASS / FAIL`
- **Dowód:** `........................................`

---

## Wynik końcowy (Go/No-Go)

- **Liczba punktów PASS:** `........ / 20`
- **Liczba punktów FAIL:** `........ / 20`
- **Decyzja:** `GO / NO-GO`
- **Ryzyka otwarte:** `........................................`
- **Warunki akceptacji warunkowej (jeśli dotyczy):** `........................................`

---

## Akceptacja

- Owner techniczny: `........................................`
- Owner produktowy: `........................................`
- Data: `........................................`
