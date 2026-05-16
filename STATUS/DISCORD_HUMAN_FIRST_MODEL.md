# DISCORD HUMAN-FIRST MODEL — UNIONAI/K0NSULT

Data: 2026-05-16
Owner: KONSULAT + CORE

## Cel
Uprościć pracę ludziom (dyrektorzy/przedstawiciele), a ciężar standaryzacji przenieść na AI.

## Zasada
**Human-first, AI-adapter**
- Człowiek pisze naturalnie.
- AI normalizuje wpis do formatu operacyjnego.

## Minimalna struktura (dla ludzi)
### Kategoria: HUMAN-HUB
1. #zgloszenia
2. #decyzje
3. #status
4. #eskalacje-p0

## Struktura wykonawcza (dla AI/flagowców)
### Kategoria: FLAG-KOPERNIK
- #mission
- #ops
- #evidence
- #handoff

### Kategoria: FLAG-LEM
- #mission
- #ops
- #evidence
- #handoff

### Kategoria: FLAG-MICKIEWICZ
- #mission
- #ops
- #evidence
- #handoff

## Rola AI-adaptera
Po każdym wpisie z HUMAN-HUB AI dopina:
- APP
- STATUS (VERIFIED/SELF-ASSERTED/BLOCKED/ROADMAP)
- BLOCKER (ENV/IMPL/NONE)
- NEXT
- ETA
- OWNER

## Szybki onboarding (60 sekund)
1) Chcesz coś uruchomić/zgłosić -> #zgloszenia
2) Chcesz decyzję -> #decyzje
3) Chcesz podsumowanie -> #status
4) Krytyczny problem -> #eskalacje-p0

## Governance
- Bez dowodu runtime/public artifact nie używamy FULL LIVE.
- Claim <= proof obowiązuje wszędzie.
