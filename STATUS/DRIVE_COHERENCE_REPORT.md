# RAPORT SPÓJNOŚCI I ZGODNOŚCI — GOOGLE DRIVE (K0NSULT / UNIONAI)
generated_utc: 2026-05-21 · autor: K02 (Opus) + Lyra (Haiku ingest) · metoda: list_recent_files + search_files (read-only)
Reguła oceny: **claim ≤ proof**. Dowód = fileSize/ID z API Drive.

## 1. OCENA OGÓLNA
**Spójność: NISKA. Zgodność z nazewnictwem (APP_TYP_DATA_STATUS_vX): CZĘŚCIOWA.**
Brak jednego źródła prawdy na Drive — pliki rozsypane po ≥8 folderach + My Drive root (`0AC30CwQzUCHwUk9PVA`). Ten sam artefakt istnieje równolegle w root i w podfolderze. Foldery CANONICAL/MEMORY/EVIDENCE (D-CLEAN-001) puste lub nieutworzone.

## 2. DUPLIKATY (dowód = identyczny fileSize → bajtowo identyczne)

| Artefakt | Kopie (ID · rozmiar) | Werdykt | Rekomendacja |
|---|---|---|---|
| **1605 AUDYT UNI0N** | `1PpMumnB…` 160622 B · `166062WT…` 160622 B (=link #5/#3) · `1n4FO8Ux…` 162814 B (.PDF.pdf) + GDoc `1NLjdXRO…` 11858 B (=link #4) + GDoc `1CVTDw43…` 11858 B „Kopia" | 5 kopii; 2 PDF bajtowo identyczne, 2 GDoc bajtowo identyczne | KEEP 1×PDF + 1×GDoc → CANONICAL; reszta ARCHIVE |
| **UNIONAI_HANDOFF_20260516.md** | `1exYVUX…` 7443 B (folder 1WHmyfrl) · `1zKWzTu…` 7443 B (root) | identyczne | KEEP 1, drugi DEPRECATED |
| **Raport 1405 Kimi odp.pdf** | `1CCgM3Z…` · `1Wzr1TA…` · `1LvufFh…` wszystkie 128444 B | 3× identyczne | KEEP 1, 2 ARCHIVE |
| **UNIONAI_Raport_Calosci_Konsultacji.pdf** | `16AwF…` 57304 B · `1jazJRG…` 57304 B (+`1a1yU1h…` 57692 B wariant) | 2× identyczne + 1 wariant | KEEP wariant najnowszy, reszta ARCHIVE |
| **UNIONAI_ADVANCED_EXECUTION_TASKS_LEVEL2** | `1tgd1OV…` + `1NEl74…` „(1)" | duplikat z sufiksem (1) | ARCHIVE „(1)" |
| **UNIONAI_AI_FEDERATION_DEV_SPEC** | `1yC7Djg…` + `1jyCqyS…` „-1" | duplikat z sufiksem -1 | ARCHIVE „-1" |
| **UNIONAI_LIVE_GAP_20260520.md** | `1LkHtcF…` 983 B · `1XKiOFz…` 1847 B | RÓŻNE rozmiary — NIE bezpieczny dedup | review przed merge |
| **SESSION_20260520_CHAT_K0NSULT_STABILITY_GITHUB.md** | `11JB_Bg…` 1301 B · `1rEontx…` 3114 B | RÓŻNE — możliwe wersje | review przed merge |

## 3. NARUSZENIA NAZEWNICTWA (wzorzec: APP_TYP_DATA_STATUS_vX)
- `Bez tytułu` (`16BjyU…`, JSON 349 B) — brak nazwy. → nazwać lub usunąć (po GO).
- `uni0n do zrobienia jak wstanie sesja to jest do zrobienia:` (`1X7OcGg…`) — zdanie zamiast nazwy.
- folder `AGENT_ID: K0NSULT-Ω∞-CORE-01 SESSION_HASH: dynamic…` — cała sesja jako nazwa folderu.
- `Kopia 1605 AUDYT UNI0N`, `…(1).pdf`, `…-1.pdf` — sufiksy kopii.
- Znaki `Ω∞` / emoji w nazwach docs — ryzyko przy sync do repo (slug).
- Mieszane konwencje: `SESSION_YYYYMMDD_*` (OK) vs `RAPORT_SESJA_*` vs `K0NSULT_SESJA_05_12_POGLEBIONA_*` (re-analizy starych sesji generowane 20.05).

## 4. ZGODNOŚĆ TREŚCI (claim ≤ proof) — z audytów Kimi/Moonshot (ingest Lyra)
- README/landing twierdzi „LIVE", audyt Moonshot: realny stan = **GO CONTROLLED / GENESIS TESTNET** + DNS fail (`Could not resolve host` unionai.grassrootslobbing.pl). → **OVERCLAIM**, status do korekty.
- chat.k0nsult.cloud: 15 plików server/* P0 wymienionych w packu = **brak w kodzie** (BLOCKED) — to nie jest „done".
- Semantic routing: oznaczone LIVE_INTERNAL → faktycznie **SELF-ASSERTED** (brak publicznego dowodu).

## 5. REKOMENDACJE (kolejność bezpieczna: COPY → MOVE → DELETE)
1. Utworzyć `UNIONAI_Ω∞/CANONICAL/` z: SOURCE_OF_TRUTH.md, MASTER_INDEX.md, STATUS.md, CURRENT_ROADMAP.md (D-CLEAN-001).
2. Dla każdej grupy duplikatów: NAJPIERW kopia zapasowa do `_ARCHIVE_20260521/`, potem oznaczyć kanon, **delete dopiero po GO**.
3. Znormalizować nazwy do `APP_TYP_DATA_STATUS_vX.md` (batch rename plan — nie wykonywać bez GO).
4. Skorygować status publiczny: LIVE → GO CONTROLLED / TESTNET (claim ≤ proof).
5. Rozwiązać dostęp do folderu P0 `1s6lD8…` (Shared Drive scope) — BLOCKER dla pełnego ledgera.

## 6. BLOKERY
- F1: folder P0 `1s6lD8…` i foldery `1VdpMaRcp…`/`1WHmyfrl…` nie listują się przez API w tym scope (Shared Drive / mime folder). → dedup tych folderów = SELF-ASSERTED do czasu dostępu.
- F2: usuwanie/przenoszenie na Drive = wymaga GO operatora (D-CLEAN-010).
