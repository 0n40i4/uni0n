# Verified Promotion Policy v1

STATUS: P1 / DRAFT
OWNER: KOPERNIK
CLAIM_LEVEL: SELF-ASSERTED
UPDATED: 2026-05-14

## VERIFIED lifecycle (deterministic)
1. Candidate claim created (SELF-ASSERTED/ROADMAP)
2. Evidence threshold check
3. Reproducibility check
4. Rollback reference check
5. Review + approval
6. Promotion to VERIFIED

## Mandatory thresholds
- Evidence refs present
- Commit/hash present
- Smoke test outputs present
- Timestamp + owner present
- Runtime claims include trace_id
- Rollback path documented

## Demotion rules
- Missing evidence -> demote to SELF-ASSERTED/BLOCKED
- Broken reproducibility -> demote to BLOCKED

## Guardrails
- No VERIFIED promotion from sync message alone
- No VERIFIED without file_id for upload claims
