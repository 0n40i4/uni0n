# Handoff: domena kanoniczna → `uni0nai.k0nsult.cloud` (alias: `unionai.grassrootslobbing.pl`)

> **✅ ZREALIZOWANO 2026-05-24** — wszystkie zalecenia wdrożone na `main`: 3A żywe powierzchnie + `main.ts` (commit `42f32e9`), 3B wrażliwe manifest/CITATION/codemeta (commit `cf4d503`). `/api/evidence/verify` po zmianie nadal `mismatched:0`. Zachowano: alias, `id`/`guid` feedów, historia, maile, strona firmy. Szczegóły: `docs/NAMING.md` + `CHANGELOG.md`. Poniższy tekst zachowany jako oryginalny audyt.
>
> Status (oryginał): **WYTYCZNE / AUDYT — zmian w kodzie NIE wykonano.** Dokument przygotowany do realizacji przez innego kodera.
> Data audytu: 2026-05-23. Branch roboczy: `claude/uni0nai-k0nsult-cloud-VPRdG` (zrealizowany i skasowany).

## 1. Decyzja (od operatora)

- **Domena docelowa (kanoniczna):** `uni0nai.k0nsult.cloud`
- **Alias (ma zostać, ale jako drugorzędny):** `unionai.grassrootslobbing.pl`
- Oba adresy są już CNAME-owane na `unionai-core.fly.dev` (ta sama aplikacja). **Zmiany DNS NIE są potrzebne** — to wyłącznie ujednolicenie odwołań w repo. Źródło: `docs/NAMING.md:30-50`.

## 2. KLUCZOWE rozróżnienie — nie podmieniać na ślepo `grassrootslobbing.pl`

W repo występują **trzy różne byty** z fragmentem `grassrootslobbing.pl`. Podmieniamy TYLKO pierwszy:

| Byt | Przykład | Co to jest | Akcja |
|---|---|---|---|
| **Subdomena aplikacji** | `unionai.grassrootslobbing.pl` | Domena federacji = ta sama appka co `uni0nai.k0nsult.cloud` | **PODMIENIĆ** → `uni0nai.k0nsult.cloud` |
| **Strona firmy (parasol prawny)** | `grassrootslobbing.pl`, `gok.grassrootslobbing.pl` | Witryna Grass Roots Lobbing Sp. z o.o. — inny byt | **ZOSTAWIĆ** |
| **E-mail** | `kontakt@grassrootslobbing.pl` | Skrzynka kontaktowa operatora | **ZOSTAWIĆ** |

> **Reguła bezpiecznego grepa/seda:** dopasowuj **wyłącznie** literał `unionai.grassrootslobbing.pl`.
> NIGDY nie rób globalnego `s/grassrootslobbing.pl/.../` — zniszczyłoby to maile i linki do strony firmy.

Liczby (stan 2026-05-23):
- `unionai.grassrootslobbing.pl` → **115 wystąpień** (do rozpatrzenia).
- `grassrootslobbing.pl` bez prefiksu `unionai.` (firma) → ZOSTAWIĆ.
- `kontakt@grassrootslobbing.pl` → 5 wystąpień, ZOSTAWIĆ.

## 3. Klasyfikacja plików (115 wystąpień subdomeny aplikacji)

### 3A. ŻYWE POWIERZCHNIE — podmienić (kanon + alias)

| Plik | Wyst. | Uwagi |
|---|---|---|
| `public/sitemap.xml` | 36 | Kanoniczne URL-e SEO → `uni0nai.k0nsult.cloud`. |
| `public/index.html` | 16 | Linki/JSON-LD aplikacji → podmienić. Uwaga: linie z `grassrootslobbing.pl/` (firma, GOK, /kontakt, /oferta) ZOSTAWIĆ. |
| `README.md` | 12 | Badge „Live", linki, cytowanie. Linie 93 i 147 (`grassrootslobbing.pl/` = parasol prawny) ZOSTAWIĆ. |
| `apps/core/src/main.ts` | 11 | Patrz sekcja 4 — najważniejsze. |
| `public/ai-plugin.json` | 3 | `url`, `logo_url`, `legal_info_url`. Linia 15 `contact_email` ZOSTAWIĆ. |
| `CONTRIBUTING.md` | 3 | Linki live; linia z parasolem prawnym ZOSTAWIĆ. |
| `public/ai-feed.xml` | 2 | `<link>` + guid item. |
| `public/robots.txt` | 1 | `Sitemap:`. |
| `public/.well-known/security.txt` | 1 | `Canonical:` (linia 5). Linia 1 e-mail i linia 8 `Hiring` (firma) ZOSTAWIĆ. |
| `SECURITY.md` | 1 | Link live. |
| `.github/ISSUE_TEMPLATE/bug.md` | 1 | Placeholder URL. |

> `public/privacy.html` i `public/pilot.html` zawierają TYLKO `grassrootslobbing.pl` (firma/kontakt) — **nie ruszać**.

### 3B. PLIKI WRAŻLIWE — wymagają świadomej decyzji operatora (NIE ruszać bez zgody)

| Plik | Wyst. | Ryzyko |
|---|---|---|
| `public/evidence/manifest.json` | 1 | Zawiera sumy **SHA256** dokumentów. Edycja URL może rozjechać hash → endpoint `/api/evidence/verify` zacznie zgłaszać „dokument naruszony". Opcje: (a) nie ruszać, (b) podmienić **i przeliczyć hashe**. |
| `CITATION.cff` | 3 | Metadane publikacji powiązane z **DOI** (Zenodo). Rozjazd z opublikowaną wersją. |
| `codemeta.json` | 2 | Jw. (metadane software/DOI). Linie 37/44 to `grassrootslobbing.pl/` firmy — i tak ZOSTAWIĆ. |

### 3C. HISTORIA — NIE ruszać (zapisy datowane)

Wsteczna podmiana sfałszowałaby raporty/sesje (compliance/audyt tracą wiarygodność):
- `docs/reports/UNIONAI_9xMETAGO_WAVE2_V02_ZGODNOSC_RAPORT_2026-05-20.md` (11)
- `docs/reports/UNIONAI_9xMETAGO_ANALIZA_RAPORT_2026-05-20.md` (1)
- `docs/sessions/SESSION_20260515_UNIONAI_V03_DEV_DEPLOY.md` (1)
- `public/memory/UNIONAI_9xMETAGO_WAVE2_V02_ZGODNOSC_MEMORY_2026-05-20.md` (2)
- `public/memory/UNIONAI-GENESIS-CLAIM.json` (1)
- `STATUS/DRIVE_COHERENCE_REPORT.md` (1)
- `CHANGELOG.md` (1 — historyczny wpis; nową zmianę dopisać jako NOWY wpis na górze)

### 3D. DOKUMENT KANONU — zaktualizować treść decyzji

- `docs/NAMING.md` (4) — patrz sekcja 5. To nie jest „podmiana literału", tylko aktualizacja zapisu, która domena jest kanoniczna.

## 4. Dokładne zmiany w `apps/core/src/main.ts`

**OpenAPI `servers` (obecnie linie 810-814)** — ustawić `uni0nai.k0nsult.cloud` jako pierwszy custom domain, `grassrootslobbing.pl` zostaje jako alias:

```ts
servers: [
  { url: "https://uni0nai.k0nsult.cloud", description: "Production (custom domain)" },
  { url: "https://unionai.grassrootslobbing.pl", description: "Production (alias)" },
  { url: "https://unionai-core.fly.dev", description: "Production (Fly app domain)" },
  { url: "http://localhost:3000", description: "Local" }
],
```

**terms / privacy (linie 729-730)** → host na `uni0nai.k0nsult.cloud`.

**Feedy RSS (linie 1065, 1066, 1079, 1103, 1104, 1768, 1770, 1779)** → host na `uni0nai.k0nsult.cloud`.
> Uwaga na `id` feedów (Atom/RSS `guid`): zmiana `id`/`guid` może zresetować deduplikację u czytników RSS (stare itemy pojawią się jako nowe). Jeśli to problem — `id`/`guid` można zostawić jako stabilny identyfikator, a podmienić tylko `link`. Decyzja operatora.

## 5. Aktualizacja `docs/NAMING.md`

- Wiersz matrycy (`:22`): `Domena | unionai.grassrootslobbing.pl (kanoniczna w kodzie)` → zmienić na `uni0nai.k0nsult.cloud (kanoniczna)`, a `unionai.grassrootslobbing.pl` opisać jako alias.
- Sekcja „Domena — status" (`:52-62`): zapisać, że decyzja zapadła = **opcja 2 (promować `uni0nai.k0nsult.cloud`)**, teraz jako domena główna; `grassrootslobbing.pl` = alias.
- Rozważyć notkę o niespójności brandu: `uni0nai` (zero + mała litera) vs konwencja `UnionAI` (przez `o`). Patrz `docs/NAMING.md:61` — ewentualna rejestracja `unionai.k0nsult.cloud` to osobny temat.

## 6. Weryfikacja po zmianie

```bash
# 1. W żywych powierzchniach NIE powinno już być starej subdomeny (poza aliasem w main.ts i historią):
grep -rn "unionai\.grassrootslobbing\.pl" public/ README.md CONTRIBUTING.md SECURITY.md .github/

# 2. Strona firmy i maile MUSZĄ zostać nietknięte:
grep -rn "@grassrootslobbing\.pl" .          # 5 wystąpień
grep -rnP "(?<!unionai\.)grassrootslobbing\.pl" public/index.html public/privacy.html

# 3. Build / typecheck backendu:
#   (zgodnie z package.json / docker-compose)
```

## 7. Checklist realizacji

- [ ] `main.ts`: servers (kanon + alias), terms, privacy, feedy
- [ ] `public/sitemap.xml`, `index.html`, `ai-plugin.json`, `ai-feed.xml`, `robots.txt`, `.well-known/security.txt`
- [ ] `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/bug.md`
- [ ] `docs/NAMING.md` — zapis nowej decyzji
- [ ] DECYZJA operatora: `evidence/manifest.json` (przeliczyć SHA256?) + `CITATION.cff`/`codemeta.json` (DOI)
- [ ] NIE ruszono: strona firmy `grassrootslobbing.pl`, maile, dokumenty historyczne
- [ ] `CHANGELOG.md`: NOWY wpis o zmianie domeny kanonicznej
- [ ] Weryfikacja grepami z sekcji 6 + build
