# Runtime Widget Smoke Pack v1

Updated (UTC): 2026-05-14T03:49:23Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Claim level: VERIFIED (pre-unblock smoke plan)

## Scope
- runtime bar
- replay lookup
- incident stream
- execution board

## Smoke checks
1. Runtime bar
   - PASS: returns live `health/smoke/incidents/drift/replay/release` fields
   - BLOCKED: missing any critical field or stale timestamp >60s

2. Replay lookup
   - PASS: known trace_id returns `replay_status=found` + fingerprint
   - BLOCKED: trace lookup errors or no replay linkage

3. Incident stream
   - PASS: returns active incidents with freeze/preserve/escalation
   - BLOCKED: incident list unavailable or schema mismatch

4. Execution board
   - PASS: returns task/owner/status/claim_level/PASS-BLOCKED states
   - BLOCKED: board endpoint unavailable or claim field missing

## Smoke command references (runtime)
- `health`: call runtime status endpoint
- `replay`: query trace_id
- `incident`: list active incidents
- `board`: fetch execution board

## Evidence required per smoke run
- trace_id(s)
- request/response snippets (sanitized)
- PASS/BLOCKED result line
- replay ref
- rollback ref