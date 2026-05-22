# Procedura wydania — UnionAI Ω∞

Kryterium wydania (UAI-P2-003): **każde wydanie ma tag git, hash commita oraz wpis w CHANGELOG**, a docelowo lustrzane archiwum GitHub Release + Zenodo (DOI).

> ⚠️ **WSZYSTKIE komendy poniżej tworzą publiczne tagi/release i wymagają ACK operatora.** Agent ich NIE wykonuje. Kopiuj-wklej dopiero po akceptacji.

---

## 0. Źródło prawdy

| Artefakt | Plik | Rola |
|---|---|---|
| Wersja runtime | `apps/core/package.json` → `version` | jedyne źródło `SERVICE_VERSION` (provenance) |
| Lista zmian | `CHANGELOG.md` (Keep a Changelog) | parsowany na żywo przez `GET /releases.json` |
| Cytowanie | `CITATION.cff` → `version` | widget cytowania GitHub + Zenodo |
| Metadane akademickie | `codemeta.json` → `version` | discovery (codemeta-2.0) |

Endpoint `GET /releases.json` parsuje `CHANGELOG.md` (nagłówki `## [x.y.z] - YYYY-MM-DD`) i dokleja bieżący build, więc **dyscyplina CHANGELOG = poprawny live changelog**. Strona `GET /changelog` renderuje to po polsku.

---

## 1. Przygotowanie wydania (lokalnie, bez akcji publicznych)

1. Ustal numer wersji wg SemVer (np. `0.3.0`). Kanał: bez `-dev` → `stable`, z `-dev` → `dev`.
2. Zsynchronizuj wersję w **trzech** plikach (muszą być identyczne):
   - `apps/core/package.json`
   - `CITATION.cff` (`version:`)
   - `codemeta.json` (`version`, oraz `dateModified`)
3. Przenieś pozycje z sekcji `## [Unreleased]` do nowej sekcji `## [X.Y.Z] - YYYY-MM-DD` w `CHANGELOG.md`.
4. Uaktualnij linki compare na dole `CHANGELOG.md`.
5. Sprawdź lokalnie: `cd apps/core && npx tsc && npx vitest run`.
6. Zweryfikuj live changelog lokalnie: `curl localhost:3000/releases.json` (najnowszy wpis = nowa wersja).

---

## 2. Tag git + commit hash

```bash
# (po ACK) — z czystego working tree na main
git add CHANGELOG.md CITATION.cff codemeta.json apps/core/package.json package.json
git commit -m "release: vX.Y.Z"
git tag -a vX.Y.Z -m "UnionAI Ω∞ vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

Hash commita wskazywanego przez tag:

```bash
git rev-list -n 1 vX.Y.Z
```

Ten hash trafia do release jako `build_sha`/`commit` (w runtime wstrzykiwany przez `GIT_SHA` przy buildzie obrazu — patrz Dockerfile/fly).

---

## 3. GitHub Release (lustro changeloga)

Notatki release bierzemy wprost z sekcji CHANGELOG dla danej wersji (plik z wyciągiem):

```bash
# (po ACK) — utwórz plik notatek z sekcji CHANGELOG, np. /tmp/notes-vX.Y.Z.md
gh release create vX.Y.Z \
  --title "UnionAI Ω∞ vX.Y.Z" \
  --notes-file /tmp/notes-vX.Y.Z.md \
  --verify-tag
```

Dla pre-release (kanał `dev`) dodaj `--prerelease`:

```bash
gh release create vX.Y.Z --title "UnionAI Ω∞ vX.Y.Z" --notes-file /tmp/notes-vX.Y.Z.md --prerelease --verify-tag
```

Po utworzeniu, `github_release_url` w `/releases.json` (`https://github.com/0n40i4/uni0n/releases/tag/vX.Y.Z`) staje się żywym linkiem.

---

## 4. Archiwizacja na Zenodo (DOI)

Repo ma już artefakty wymagane przez Zenodo: **`CITATION.cff`** (autorzy, tytuł, słowa kluczowe) oraz **`codemeta.json`**. Genesis DOI: `10.5281/zenodo.20151384`.

Integracja **GitHub ↔ Zenodo (webhook)** — jednorazowa konfiguracja (operator):

1. Zaloguj się na <https://zenodo.org> kontem powiązanym z GitHub (OAuth).
2. Zenodo → **GitHub** → włącz przełącznik (toggle ON) przy repozytorium `0n40i4/uni0n`. To rejestruje webhook `release` w repo.
3. Od tej chwili **każdy nowy GitHub Release** automatycznie:
   - tworzy nowy rekord/wersję na Zenodo,
   - nadaje świeży **version DOI** + utrzymuje **concept DOI** (stały, wskazuje najnowszą wersję),
   - zaciąga metadane z `CITATION.cff`.
4. Po pierwszym release dodaj concept-DOI badge do README i wpisz świeży `version DOI` do nowej sekcji CHANGELOG (parser `/releases.json` wykryje wzorzec `zenodo.<id>` i wystawi `zenodo_doi`).

> Webhook działa tylko dla release utworzonych **po** włączeniu toggle. Wcześniejsze tagi można dodać ręcznie przez „New upload" na Zenodo.

---

## 5. Po wydaniu — weryfikacja live

```bash
curl -s https://unionai-core.fly.dev/version       # SERVICE_VERSION == vX.Y.Z
curl -s https://unionai-core.fly.dev/releases.json  # najnowszy wpis == vX.Y.Z, build_sha ustawiony
# wizualnie:
open https://unionai-core.fly.dev/changelog
```

---

## Załącznik: stan zgodności wersji (audyt UAI-P2-003, 2026-05-22)

| Plik | Wersja przed | Akcja |
|---|---|---|
| `codemeta.json` | `0.3.0-dev` | OK — zgodna z runtime |
| `apps/core/package.json` | `0.3.0-dev` | OK — zgodna z runtime |
| `CITATION.cff` | `0.2.0` ❌ dryf | **zaktualizowano → `0.3.0-dev`** (CHANGELOG 0.3.0-dev bumpował codemeta, ale pominął CITATION.cff) |

Na przyszłość: wersję w `CITATION.cff` i `codemeta.json` bumpować zawsze razem z `package.json` (krok 1.2 powyżej).
