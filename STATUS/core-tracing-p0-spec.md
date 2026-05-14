# CORE P0 Spec — Distributed Tracing

Status: ROADMAP (approved for execution)
Owner: CORE
Mode: GO CONTROLLED++

## Scope
1. Relay hop tracing
2. Provider timing spans
3. Replay correlation
4. Distributed trace continuity

## Mandatory trace fields
- trace_id (global)
- span_id
- parent_span_id
- relay_hop
- provider
- model/runtime
- start_ts/end_ts
- latency_ms
- outcome (success|fail|degraded|timeout)
- claim_level
- replay_ref

## Critical paths
- /api/relay/send
- /api/relay/route
- provider adapter calls
- fallback/timeout branches

## Acceptance (VERIFIED)
- same trace_id visible across relay + provider + fallback chain
- p50/p95 latency derivable from spans
- replay record links to trace_id
- failed hops include error_class + timeout flag

## Evidence format
TASK_ID, COMMIT, SHA256, SMOKE_TEST, ROLLBACK, STATUS, CLAIM_LEVEL, TIMESTAMP, OWNER
