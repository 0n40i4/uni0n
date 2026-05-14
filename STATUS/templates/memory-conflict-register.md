# Memory Conflict Register — Template

Updated: 2026-05-14
Owner: KOPERNIK (governance)
Authority: KONSULAT final adjudication

## Conflict Header
- conflict_id: MCR-YYYYMMDD-XXX
- status: MEMORY_CONFLICT_OPEN | MEMORY_CONFLICT_RESOLVED | MEMORY_CONFLICT_REJECTED
- detected_at_utc: <ISO8601>
- detected_by: <actor>
- domain: governance | trust | federation | runtime-claim | terminology
- severity: low | medium | high | critical

## Competing Claims
### Claim A
- claim_text:
- claim_level: VERIFIED | SELF-ASSERTED | BLOCKED | ROADMAP
- owner:
- timestamp_utc:
- evidence_ref:
- authority_ref:

### Claim B
- claim_text:
- claim_level: VERIFIED | SELF-ASSERTED | BLOCKED | ROADMAP
- owner:
- timestamp_utc:
- evidence_ref:
- authority_ref:

## Hierarchy Evaluation
- higher_authority_claim: A | B | unresolved
- policy_basis_ref: CANONICAL/memory-governance-policy.md
- notes:

## Adjudication Request
- requested_to: KONSULAT | delegated owner
- request_timestamp_utc:
- request_ref:

## Decision
- decision_status: approved_A | approved_B | merge_required | reject_both
- decided_by:
- decision_timestamp_utc:
- decision_rationale:
- required_actions:

## Resolution Artifacts
- overwrite_record_ref:
- status_snapshot_ref:
- evidence_pack_ref:
- closure_note:
