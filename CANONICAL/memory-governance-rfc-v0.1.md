# MEMORY GOVERNANCE RFC v0.1 (KOPERNIK)

Status: DRAFT (P1)
Owner: KOPERNIK
Authority: KONSULAT final veto

## 1. Overwrite hierarchy
1) KONSULAT decision
2) CANONICAL records
3) VERIFIED evidence-linked status
4) SELF-ASSERTED operational notes
5) ROADMAP statements

Higher rank overrides lower rank only with explicit audit record.

## 2. Authority rules
- No autonomous overwrite of canonical truth.
- No deletion of VERIFIED evidence.
- All contentious updates require conflict record + adjudication path.

## 3. Replay ownership
- Each memory-affecting decision must link to:
  - trace_id or decision_id
  - evidence_ref
  - owner
  - timestamp

## 4. Conflict resolution
- open: MEMORY_CONFLICT_OPEN
- adjudicate: authority decision reference
- close: MEMORY_CONFLICT_RESOLVED + applied overwrite log

## 5. Drift controls
- terminology changes impacting trust/federation require drift note in STATUS
- LIVE vs TESTNET language must remain explicit in public-facing summaries

## Claim level discipline
All RFC-linked status entries must carry: VERIFIED / SELF-ASSERTED / BLOCKED / ROADMAP.
