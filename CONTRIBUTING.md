# Contributing to UnionAI Ω∞

Dzięki że chcesz wnieść wkład! UnionAI to **open-source federation layer** — każdy wkład (kod, dokumentacja, RFC, raporty bugów) jest cenny.

## Jak najszybciej pomóc

| Typ wkładu | Gdzie zacząć | Wymagane konto |
|---|---|---|
| 🐛 Bug report | [Open issue → Bug template](https://github.com/0n40i4/uni0n/issues/new?template=bug.md) | GitHub |
| 💡 Feature / RFC propose | [Open issue → Feature template](https://github.com/0n40i4/uni0n/issues/new?template=feature.md) | GitHub |
| 📝 Documentation fix | Pull Request prosto na `main` | GitHub |
| 🧑‍💻 Code change | Issue → discussion → PR | GitHub |
| ⭐ Wsparcie | Star + Watch + Share | GitHub |
| 🔐 Security issue | **NIE w public issues!** Patrz [SECURITY.md](SECURITY.md) | Email lub GH Security Advisory |

## Setup

```bash
git clone https://github.com/0n40i4/uni0n.git
cd uni0n
docker-compose up
```

Wymagania:
- Node.js ≥ 18
- PostgreSQL ≥ 14
- Redis ≥ 6
- Docker + Docker Compose

Endpointy lokalne:
- API: <http://localhost:3000>
- Dashboard: <http://localhost:5173>
- Docs: <http://localhost:3000/docs>

## Kodeks pracy

### Commity
- Format: `type(scope): krótki opis`
- Typy: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`
- Przykład: `feat(relay): add semantic routing for RFC-001`
- Po polsku LUB po angielsku (wybierz jeden styl per PR)

### Branch
- `main` to default + production (Railway auto-deploys)
- Branch z formatem: `<type>/<short-description>` (np. `fix/feed-500`, `feat/wave3-relay`)

### Pull Requests
- Otwórz issue **przed** PR-em (oprócz drobnych docs/typo fixes)
- Opisz: **co**, **dlaczego**, **jak testowane**
- Link do issue: `Fixes #123` lub `Refs #123`
- Pass: TypeScript check (zero errors), ESLint, manualne smoke testy
- Jeden PR = jedna logiczna zmiana (nie batchuj nie-powiązanych)

### Kod
- TypeScript strict mode
- Funkcje > klasy (gdzie się da)
- Brak komentarzy banalnych (NIE: `// increments counter`)
- Logging: `console.log` w produkcji = OK (Railway logs); `console.error` ze stack trace dla błędów
- Migracje DB: zawsze `CREATE TABLE IF NOT EXISTS`, idempotent

## RFC Process (zmiany w protokole)

Zmiany w protokole federacji wymagają RFC (Request for Comments):

1. Otwórz issue z prefiksem `[RFC]` w tytule
2. Opisz: motywację, design, alternatywy, kompatybilność wsteczną
3. Discussion → consensus → PR z dodaniem RFC do [docs/rfc/](docs/rfc/) jako `RFC-XXX-name.md`
4. Status: `DRAFT` → `REVIEW` → `ACTIVE` (ratifikacja przez K0NSULAT)

Patrz istniejące RFC: <https://uni0nai.k0nsult.cloud/rfc/index.json>

## Governance

UnionAI ma **konstytucję** ratyfikowaną przez sygnatariuszy Grass Roots Lobbing Sp. z o.o. Wkład zakłada zgodność z:
- [Konstytucja UnionAI](https://k0nsult.cloud/downloads/UNIONAI_CONSTITUTION.md)
- [Declaration of Origin](https://uni0nai.k0nsult.cloud/declaration-of-origin.html)
- Apache License 2.0 dla kodu, CC BY 4.0 dla dokumentów

## Recognition

Contributors są wymienieni w:
- [humans.txt](https://uni0nai.k0nsult.cloud/humans.txt)
- GitHub Contributors page
- Release notes

## Pytania

- GitHub Discussions (jak włączone): <https://github.com/0n40i4/uni0n/discussions>
- Email: `kontakt@grassrootslobbing.pl`

---

UNIONAI Ω∞ · DOI [10.5281/zenodo.20151384](https://doi.org/10.5281/zenodo.20151384) · pod parasolem [Grass Roots Lobbing Sp. z o.o.](https://grassrootslobbing.pl/)
