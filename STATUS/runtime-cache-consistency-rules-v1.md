# Runtime Cache Consistency Rules v1

Updated (UTC): 2026-05-14T03:52:44Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: CORE
Claim level: VERIFIED

## Cache domains
- Redis cache (runtime status + flags)
- Replay cache
- Semantic cache
- Failover cache

## Invalidation rules
- Trace-scoped events invalidate matching replay/semantic entries.
- Incident state change invalidates runtime + failover summary keys.
- Release freeze/unfreeze invalidates operator action cache.
- TTL expiry is fallback only, not primary consistency mechanism.

## Replay safety
- Replay cache keys include `trace_id` + fingerprint/version.
- If fingerprint mismatch: cache bypass + fresh source read.
- Replay unavailable => return BLOCKED, no stale replay substitution.

## Degraded behavior
- Redis unavailable => switch to source-of-truth reads + status DEGRADED.
- Semantic cache unavailable => route with live compute and confidence penalty marker.
- Failover cache unavailable => show failover state BLOCKED until source read succeeds.

## Consistency guarantees
- Strong consistency for freeze/preserve/rollback state.
- Eventual consistency (<=30s) for aggregate counters/metrics.
- Any unknown consistency state => BLOCKED badge.
