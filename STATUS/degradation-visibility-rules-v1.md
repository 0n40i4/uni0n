# Degradation Visibility Rules v1

Updated (UTC): 2026-05-14T03:49:23Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: LEM
Claim level: VERIFIED

## States
- DEGRADED
- PARTITIONED
- FAILOVER
- REPLAY_UNAVAILABLE

## Rules
1. DEGRADED
   - trigger: latency/error threshold breach
   - UI: yellow warning + impacted modules

2. PARTITIONED
   - trigger: federation node unreachable > threshold
   - UI: red state + node isolation marker

3. FAILOVER
   - trigger: provider chain switched
   - UI: blue failover marker + switch timestamp + trace_id

4. REPLAY_UNAVAILABLE
   - trigger: replay lookup fails/unavailable
   - UI: red marker, disable replay-dependent actions

## Enforcement
- Any unknown state => BLOCKED
- Any hidden degradation => BLOCKED