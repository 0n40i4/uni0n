# UNIONAI Ω∞ — PUBLIC EVIDENCE REGISTER v1.0

Status: GO CONTROLLED
Source of truth: Grassroots Lobbing / K0NSULT Ω∞ / 0n40i4
Confirmation code: UNIONAI-GENESIS-0N40I4-20260512
Tryb: publication-ready / internal sandbox before public federation


## Cel
Rejestr dowodów służy zabezpieczeniu daty, pochodzenia, autorstwa, przebiegu konsultacji, publikacji, memory anchors i śladu wdrożeniowego.

## Zasada
Każdy publiczny artefakt powinien mieć: nazwę, wersję, datę, hash SHA-256, lokalizację, status publikacji, właściciela i notatkę o zgodności.

## Minimalny rejestr artefaktów
| Artefakt | Status | Lokalizacja | Dowód |
|---|---|---|---|
| Uchwała 001/UNIONAI | DONE | Drive/PDF | hash + data |
| Raport Etapu III | DONE | PDF | hash + data |
| Raport całości konsultacji | DONE | PDF | hash + data |
| Dokument wdrożeniowy DEV | DONE | PDF | hash + data |
| Wytyczne flagowców | DONE | PDF | hash + data |
| Publication protection package | DONE | ZIP | hash + data |
| participation notice v1.1 | READY | strona / repo | hash + data |
| llms.txt | READY | /llms.txt | HTTP 200 + hash |
| evidence/manifest.json | READY | /evidence/manifest.json | HTTP 200 + hash |
| memory anchors | READY | /memory/*.json | HTTP 200 + hash |
| GitHub repo 0N40i4/uniOn | ACTIVE | GitHub | commits |
| GitHub release v0.1-genesis | TODO | GitHub | release tag |
| Archive.org snapshot | TODO | archive.org | snapshot URL |
| Zenodo DOI | TODO | Zenodo | DOI |
| TMview search | TODO | EUIPO/TMview | search print |
| EUIPO trademark filing | OPTIONAL | EUIPO | application no. |

## Hash procedure
1. Eksportuj dokument do PDF lub JSON.
2. Policz SHA-256.
3. Zapisz w evidence/manifest.json.
4. Dodaj datę i wersję.
5. Zrób Git commit.
6. Zrób release lub snapshot.
7. Dodaj link do rejestru.

## evidence/manifest.json - minimalny format
```json
{
  "initiative": "UNIONAI Ω∞",
  "source_of_truth": "Grassroots Lobbing / K0NSULT Ω∞ / 0n40i4",
  "confirmation_code": "UNIONAI-GENESIS-0N40I4-20260512",
  "artifacts": [
    {
      "name": "UNIONAI_Etap_III_Raport_Zatwierdzajacy.pdf",
      "version": "1.0",
      "sha256": "TO_FILL",
      "published_at": "TO_FILL",
      "location": "TO_FILL"
    }
  ]
}
```

## Checklist publikacyjny
- [ ] GitHub release v0.1-genesis
- [ ] Archive.org snapshot po HTTP 200
- [ ] Zenodo DOI po release
- [ ] evidence/manifest.json z hashami
- [ ] llms.txt live
- [ ] memory anchors live
- [ ] publication timestamp recorded
- [ ] social announcement archived
- [ ] provider invitation archived
