# Claim Governance RFC v1

Version: v1
Timestamp: 2026-05-14T00:00:00Z
Owner: KOPERNIK
Claim-Level: ROADMAP
Anti-Drift: ENABLED

## Claim lifecycles
### VERIFIED
- Entry requirements: reproducible evidence + trace_id + owner + timestamp.
- Can demote to BLOCKED if reproducibility fails.

### SELF-ASSERTED
- Owner-reported state without independently reproducible proof.
- Promote only after evidence check.

### BLOCKED
- Execution/verification prevented by concrete blocker.
- Must include blocker, owner, and next action.

### ROADMAP
- Planned state, not executed.
- Must never be presented as runtime fact.

## Promotion rules
- ROADMAP -> SELF-ASSERTED: execution reported.
- SELF-ASSERTED -> VERIFIED: reproducible evidence attached.
- VERIFIED -> BLOCKED: verification regression.

## Evidence requirements (mandatory)
- TASK_ID
- COMMIT
- SHA256 (if artifact)
- SMOKE_TEST
- ROLLBACK
- STATUS
- CLAIM_LEVEL
- TIMESTAMP
- OWNER

## Governance guardrails
- No claim inflation.
- No ROADMAP as VERIFIED.
- Keep runtime and governance ownership separation.
