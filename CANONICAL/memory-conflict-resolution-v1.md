# Memory Conflict Resolution v1

STATUS: P1 / DRAFT
OWNER: KOPERNIK
CLAIM_LEVEL: SELF-ASSERTED
UPDATED: 2026-05-14

## Deterministic conflict policy
1. Detect collision (`MEMORY_CONFLICT_OPEN`)
2. Capture both claims + evidence refs
3. Apply authority hierarchy
4. If unresolved -> escalate to KONSULAT decision
5. Persist adjudication (`MEMORY_CONFLICT_RESOLVED`)
6. Record overwrite chain + replay ownership

## Authority and ownership
- Canonical ownership inheritance required
- Operator override preserved
- Replay continuity mandatory

## Guardrails
- No silent overwrite
- No mutation of canonical truth without approval
- Full audit trail required

## Evidence block
- conflict case refs: TBD
- adjudication refs: TBD
- timestamps: TBD
