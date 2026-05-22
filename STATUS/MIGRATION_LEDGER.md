# MIGRATION_LEDGER — source → destination → owner → status → proof
generated_utc: 2026-05-21 · reguła: claim ≤ proof · DELETE tylko po GO operatora

| source (Drive) | destination | owner | status | proof |
|---|---|---|---|---|
| `1ntdntfl…` CODERS_IMPLEMENTATION_PACK | repo uni0n: STATUS/TASKS_P0_P1_P2.md | K02 | DONE | plik utworzony w tej sesji |
| `1exYVUX…`+`1zKWzTu…` HANDOFF (2 kopie 7443 B) | CANONICAL/ → 1 kanon, drugi DEPRECATED | Operator | BLOCKED (GO) | identyczny fileSize |
| 1605 AUDYT UNI0N ×5 | _ARCHIVE_20260521/ + 1 kanon do CANONICAL | Operator | BLOCKED (GO) | fileSize match (160622/11858) |
| Raport 1405 Kimi ×3 (128444 B) | _ARCHIVE_20260521/ + 1 kanon | Operator | BLOCKED (GO) | fileSize match |
| `1s6lD8…` 01_P0_NOW | repo uni0n STATUS/ | K02 | BLOCKED | folder niedostępny przez API scope |
| README status „LIVE" | „GO CONTROLLED / TESTNET" | K02/Codex | SELF-ASSERTED→do zmiany | audyt Moonshot: DNS fail |

## Plan cleanup (bezpieczna kolejność)
1. **COPY** — `_ARCHIVE_20260521/` z kopią każdego pliku objętego zmianą.
2. **MOVE** — kanon do `UNIONAI_Ω∞/CANONICAL/`, duplikaty do `_ARCHIVE`.
3. **DELETE** — dopiero po GO operatora i weryfikacji backupu.
