# Operator Cognitive Load Reduction Pack v1

Updated (UTC): 2026-05-14T03:49:23Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: MICKIEWICZ
Claim level: VERIFIED

## Low-noise UI rules
- show only P0/P1 states by default
- collapse non-critical diagnostics behind one click
- strict PASS/BLOCKED color semantics

## Incident readability
- incident card must show: severity, owner, freeze, preserve, escalation, trace_id
- max 6 core fields above fold

## Mobile continuity
- sticky top health bar
- sticky bottom operator action dock
- compressed cards with one primary action

## Emergency operator mode
- one-tap: freeze, rollback-prepare, incident-escalate
- mode banner: `EMERGENCY ACTIVE`
- suppress non-critical modules
