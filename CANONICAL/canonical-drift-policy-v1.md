# Canonical Drift Detection Policy v1

Status: GO-CONTROLLED
Owner: KOPERNIK
Timestamp: 2026-05-14
Claim_Level: SELF-ASSERTED

## Drift classes
- D1: Formatting drift (non-semantic)
- D2: Semantic mismatch (same topic, conflicting meaning)
- D3: Authority conflict (lower source contradicts canonical)
- D4: Replay ownership conflict
- D5: Stale canonical reference

## Source-of-truth hierarchy
KONSULAT approval > CANONICAL > STATUS + EVIDENCE > working notes.

## Arbitration flow
Detect -> classify drift -> collect conflicting refs -> authority decision -> adjudication note -> replay log update.

## Stale invalidation
Documents marked stale require replacement ref, timestamp, owner, and migration note.

## Mandatory safeguards
- no silent canonical overwrite
- preserve prior revision links
- deterministic conflict closure record.