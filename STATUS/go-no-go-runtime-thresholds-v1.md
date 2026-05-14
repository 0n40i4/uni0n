# Go/No-Go Runtime Thresholds v1

Updated (UTC): 2026-05-14T03:52:44Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: ORACLE
Claim level: VERIFIED

## Threshold states
- GO
- CONTROLLED
- BLOCKED

## GO thresholds
- smoke PASS
- replay PASS
- rollback readiness verified
- no CRITICAL incidents
- drift not blocked

## CONTROLLED thresholds
- minor degradation allowed
- no integrity violations
- fallback provider active but stable
- explicit operator acknowledgment required

## BLOCKED thresholds
- missing replay linkage on critical path
- CRITICAL incident active
- freeze active without release clearance
- quorum below minimum
- audit integrity failure

## Freeze triggers
- CRITICAL incident
- audit tamper detection
- replay unavailable on release path

## Escalation triggers
- repeated failover churn
- operator overload score high
- governance drift beyond tolerance
