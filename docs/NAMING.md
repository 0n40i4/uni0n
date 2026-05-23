# Matryca nazewnictwa — UnionAI (UAI-P0-007)

Dokument kanoniczny ujednolicający warianty pisowni **UnionAI / UNI0NAI / uni0n**, które
występują w repozytorium, na produkcji i w komunikacji. Celem jest jedna spójna konwencja —
każde nowe odwołanie powinno używać formy kanonicznej z poniższej tabeli.

## Rekomendowana konwencja

- **Brand (marketing)**: `UnionAI` — CamelCase, `U` i `AI` wielką literą. W stopkach/genesis
  dopuszczalne stylizowane `UNIONAI Ω∞`.
- **Repo (GitHub)**: `uni0n` — z zerem, taka jest rzeczywista nazwa repo.
- **App Fly / nazwa serwisu**: `unionai-core` — z literą `o`, bez zera.
- Zasada skrótowa: **brand i kod = `o` (UnionAI / unionai-core); tylko nazwa repo = `0` (uni0n)**.
  Forma `UNI0NAI` (zero + capslock) NIE jest kanoniczna w żadnym kontekście — to wariant do wyplenienia.

## Matryca kanoniczna

| Kontekst              | Forma kanoniczna                                  |
|-----------------------|---------------------------------------------------|
| Brand (marketing)     | `UnionAI` (stylizowane: `UNIONAI Ω∞`)             |
| Repo (GitHub)         | `github.com/0n40i4/uni0n`                          |
| Domena                | `uni0nai.k0nsult.cloud` (kanoniczna) · alias: `unionai.grassrootslobbing.pl` |
| App Fly               | `unionai-core` (`unionai-core.fly.dev`)            |
| Endpoint / service name | `unionai-core` (`x-service-name`, `SERVICE_NAME`) |
| Federation ID         | `UNIONAI-GENESIS-0N40I4-20260512`                  |
| DID                   | `did:unionai:s4:k0nsulat` (metoda `did:unionai`)   |

## Domena — status (UAI-P0-005)

Weryfikacja non-destruktywna `uni0nai.k0nsult.cloud` z dnia 2026-05-22:

**`nslookup uni0nai.k0nsult.cloud`** — DZIAŁA (CNAME):
```
Name:    unionai-core.fly.dev
Addresses:  2a09:8280:1::114:b6b7:0
            66.241.124.223
Aliases:  uni0nai.k0nsult.cloud
```

**`curl -sI https://uni0nai.k0nsult.cloud`** — `HTTP/1.1 200 OK`, nagłówki:
```
x-service-name: unionai-core
x-service-version: 0.3.0-dev
x-service-channel: dev
x-build-sha: 01KS7BR5FTWNGHM86S0B96DCPW
x-federation-id: UNIONAI-GENESIS-0N40I4-20260512
```

**Wniosek:** domena `uni0nai.k0nsult.cloud` jest LIVE i poprawnie zCNAME-owana na
`unionai-core.fly.dev` (zwraca tę samą aplikację co domena kanoniczna). NIE wymaga zmian DNS.

**DECYZJA (2026-05-24, operator): przyjęto opcję 2 — `uni0nai.k0nsult.cloud` jest domeną
kanoniczną; `unionai.grassrootslobbing.pl` pozostaje jako alias (drugorzędny).** Zrealizowano
podmianę literału w żywych powierzchniach (sitemap, index.html, ai-plugin.json, ai-feed.xml,
robots.txt, security.txt, README, CONTRIBUTING, SECURITY, bug.md) oraz w `apps/core/src/main.ts`
(OpenAPI `servers` — kanon pierwszy, alias zachowany; terms/privacy; `link` feedów). Zachowano
świadomie: `id`/`guid` feedów (stabilność dedup RSS) oraz alias w `servers`. Zmiany DNS zbędne
(oba adresy już CNAME na `unionai-core.fly.dev`). NIE ruszono: strony firmy `grassrootslobbing.pl`,
maili `@grassrootslobbing.pl`, dokumentów historycznych (reports/sessions/memory).

**Otwarte do decyzji operatora (3B — NIE ruszone):** `public/evidence/manifest.json` (zawiera
SHA256 — podmiana URL wymaga przeliczenia hashy, inaczej `/api/evidence/verify` zgłosi naruszenie),
`CITATION.cff` i `codemeta.json` (metadane powiązane z DOI Zenodo — rozjazd z opublikowaną wersją).

Forma `uni0nai` w tej domenie używa zera + małej litery — niezgodna z konwencją brandu
(`UnionAI` przez `o`). Jeśli domena ma zostać, warto rozważyć rejestrację `unionai.k0nsult.cloud`.

## Niespójności w repo (lista plik:linia — NIE poprawiać w tym zadaniu)

Stan na 2026-05-22. Większość odwołań jest już spójna; poniżej rzeczywiste rozbieżności
względem rekomendowanej konwencji:

- **Forma `UNIONAI` (capslock przez `o`)** — dopuszczalna tylko jako stylizacja brandu
  `UNIONAI Ω∞`, ale używana też w prozie/nagłówkach RFC i może być mylona z `UNI0NAI`:
  - `README.md:101` — `RFC-001 | UNIONAI Federation Protocol`
  - `README.md:147` — `**UNIONAI Ω∞**` (OK — stylizacja brandu)
  - `apps/core/src/main.ts:549` — nagłówek `# UNIONAI Ω∞ — AI Federation Layer` (OK — stylizacja)
  - `apps/core/src/main.ts:742` — `federation: "UNIONAI-GENESIS-..."` (OK — to Federation ID)
- **Nazwa pakietu npm** `package.json:2` — `"name": "unionai"` (lowercase, przez `o`).
  Niespójna z nazwą repo `uni0n`; spójna z brandem/app. Do rozważenia ujednolicenie do
  `unionai-core` lub pozostawienie jako brand-slug.
- **Dwie custom domeny w komunikacji** — `unionai.grassrootslobbing.pl` (w kodzie) vs
  `uni0nai.k0nsult.cloud` (live CNAME, brak w kodzie). Patrz sekcja "Domena — status".
- **Brak wystąpień `UNI0NAI` (zero + capslock)** w przeszukanych plikach (`package.json`,
  `fly.toml`, `README.md`, `apps/core/src`, `docs`) — ta zła forma nie jest obecnie używana w kodzie;
  pojawia się głównie w notatkach/komunikacji operatora i należy jej unikać.

> Poprawki tych pozycji to osobne zadanie (refactor nazewnictwa) — wymaga decyzji brandowej
> co do domeny i nazwy pakietu npm.
