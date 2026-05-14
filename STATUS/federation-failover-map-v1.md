# Federation Failover Map v1

Status: GO-CONTROLLED
Owner: LEM
Timestamp: 2026-05-14
Claim_Level: ROADMAP

## Failure modes
- single node outage
- provider outage
- partial federation partition
- replay queue delay

## Routing strategy
1. Primary semantic route
2. Secondary provider route
3. Degraded syntactic fallback (explicitly tagged)
4. Replay reconciliation when connectivity returns

## Continuity rules
- isolated nodes operate local-safe mode
- degraded mode emits trust downgrade signal
- all reroutes require trace continuity and reason code

## Recovery
- health quorum restore
- replay sync
- drift re-check
- mode promotion only with verification evidence.