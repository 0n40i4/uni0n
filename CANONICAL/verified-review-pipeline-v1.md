# VERIFIED Claim Review Pipeline v1

Status: GO-CONTROLLED
Owner: KOPERNIK
Timestamp: 2026-05-14
Claim_Level: SELF-ASSERTED

## Deterministic lifecycle
1. SUBMITTED (evidence attached)
2. REVIEW_PENDING (scope + integrity checks)
3. TECH_VALIDATED (smoke/trace/hash/rollback present)
4. GOVERNANCE_VALIDATED (hierarchy + policy compliance)
5. APPROVED_VERIFIED (operator/KONSULAT approval)
6. FROZEN (release/governance freeze)
7. ROLLED_BACK (if invalidated)

## Mandatory gates before VERIFIED
- commit/hash
- Drive archive ref
- smoke/validation refs
- rollback ref
- timestamp + owner + claim tag
- no secret leakage

## Approval chain
CORE evidence owner -> KOPERNIK governance review -> KONSULAT/operator final approval.
Operator override is always preserved.

## Anti-auto-promotion
No automatic ROADMAP/SELF-ASSERTED -> VERIFIED transitions.

## Rollback governance
Any broken evidence path or unreproducible claim triggers demotion and rollback record.