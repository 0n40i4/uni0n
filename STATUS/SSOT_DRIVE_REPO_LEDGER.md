# SSOT — DRIVE ↔ REPO LEDGER
**Jedno źródło prawdy.** Repo: `0n40i4/uni0n` · Plik: `STATUS/SSOT_DRIVE_REPO_LEDGER.md`
updated_utc: 2026-05-21T (sesja K02/Opus)
Reguła: **claim ≤ proof**. Bez dowodu = `SELF-ASSERTED`. Nic destruktywnego bez GO operatora.

## Zasady
- GitHub = źródło prawdy dla KODU. Drive = źródło prawdy dla DOKUMENTÓW/EVIDENCE.
- Każdy wpis: source_link · target_repo · target_path · owner · status · proof · updated_utc.
- status ∈ {VERIFIED, SELF-ASSERTED, BLOCKED, ROADMAP}.

## LEDGER

| source_link | target_repo | target_path | owner | status | proof | updated_utc |
|---|---|---|---|---|---|---|
| Drive doc `1ntdntfl...` CODERS_IMPLEMENTATION_PACK_20260517 | 0n40i4/uni0n | STATUS/TASKS_P0_P1_P2.md | K02 | VERIFIED | odczytany przez read_file_content (7075 B) | 2026-05-21 |
| Drive sheet `1ljUZg...` CODERS_TASK_BOARD_20260517 | 0n40i4/uni0n | STATUS/TASKS_P0_P1_P2.md | K02 | SELF-ASSERTED | wymieniony w skanie, treść nie zweryfikowana komórka-po-komórce | 2026-05-21 |
| Drive doc `1TM4wxN6...` Multi-Agent / chat.k0nsult.cloud spec | 0n40i4/uni0n | docs/META_ROUTER_RFC.md (ROADMAP) | K02 | SELF-ASSERTED | streszczony przez Lyra ingest | 2026-05-21 |
| Drive folder `1s6lD8...` 01_P0_NOW (DEV) | — | — | Operator | BLOCKED | parentId search → pusto; prawdopodobnie Shared Drive / inny scope | 2026-05-21 |
| Drive folder `1WHmyfrl...` (audyty/handoffy/PDF) | Drive CANONICAL | — | Operator | BLOCKED | folder nie czyta się bezpośrednio; dedup wymaga GO | 2026-05-21 |
| repo 0n40i4/k0nsult-chat (control plane) | 0n40i4/k0nsult-chat | server/* | Codex | BLOCKED | 15 plików P0 do utworzenia; brak w kodzie wg task board | 2026-05-21 |
| repo 0n40i4/uni0n (federation/public) | 0n40i4/uni0n | apps/* | K02/Codex | VERIFIED | repo lokalne v0.3.0-dev, gh auth=0n40i4 OK | 2026-05-21 |

> Ten plik jest żywy. Aktualizuj przy każdej zmianie statusu. Nie kasuj wierszy — zmieniaj status + proof + updated_utc.
