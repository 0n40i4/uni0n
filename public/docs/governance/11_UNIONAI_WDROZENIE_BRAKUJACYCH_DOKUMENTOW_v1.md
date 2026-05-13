# UNIONAI Ω∞ — WDROŻENIE BRAKUJĄCYCH DOKUMENTÓW v1.0

Status: GO CONTROLLED
Source of truth: Grassroots Lobbing / K0NSULT Ω∞ / 0n40i4
Confirmation code: UNIONAI-GENESIS-0N40I4-20260512
Tryb: publication-ready / internal sandbox before public federation


## Cel
Instrukcja wdrożenia brakujących dokumentów i artefaktów wskazanych po analizie folderu pamięci.

## Kolejność wdrożenia
### Priorytet 1 - Governance i dowody
1. RFC_MASTER_INDEX
2. PUBLIC_EVIDENCE_REGISTER
3. OPERATOR_CONSTITUTION
4. PUBLIC_TIMELINE

### Priorytet 2 - Bezpieczeństwo
5. HUMAN_OVERRIDE_PLAYBOOK
6. MEMORY_POLICY
7. TESTNET_GENESIS_CHECKLIST

### Priorytet 3 - Interoperacyjność
8. UNIONAI-WIRE-v0 SPEC
9. VISUAL_ARCHITECTURE_PACK
10. PROVIDER_INVITATION_PACKAGE

## Struktura publikacji w repo
```txt
docs/
  governance/
  evidence/
  testnet/
  operator/
  specs/
  public/
public/
  evidence/
  memory/
  .well-known/
  llms.txt
```

## Zadania dla dev
- dodać PDF i MD do repo,
- dodać hash do evidence/manifest.json,
- podlinkować dokumenty na /evidence,
- dodać route /docs,
- dodać static serving,
- sprawdzić HTTP 200,
- zrobić commit i release.

## Zadania dla operatora
- zatwierdzić treść,
- sprawdzić czy nie ma sekretów/PII,
- zatwierdzić status publikacji,
- wykonać hash snapshot,
- uruchomić Archive.org i Zenodo po HTTP 200,
- dodać wpis do PUBLIC_EVIDENCE_REGISTER.

## Komendy
```bash
sha256sum docs/*.pdf
git add docs public
git commit -m "Add UNIONAI missing governance and evidence docs"
git tag v0.1-genesis
git push origin main --tags
```

## Acceptance
GO jeśli:
- wszystkie dokumenty mają PDF+MD,
- hash jest w manifest,
- /evidence pokazuje listę,
- nie ma PII/secrets,
- operator zatwierdził.
