# Operator Authority Visibility Model v1

Updated (UTC): 2026-05-14T03:49:23Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: KOPERNIK
Claim level: VERIFIED

## Authority lanes
1. Operator authority
   - can trigger health/replay/drift/incident/freeze/rollback/release/smoke
2. Runtime authority (CORE)
   - executes runtime actions and rollback implementation
3. Governance authority (KOPERNIK)
   - validates claim levels, release gate overlays
4. Incident authority
   - incident commander (CORE) + governance visibility
5. Rollback authority
   - CORE executes; KONSULAT human veto/final go-no-go

## UI requirements
- show current authority owner for each action
- show veto-active flag in release/incident context
- show escalation owner and timestamp
