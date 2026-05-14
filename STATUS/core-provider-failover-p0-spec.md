# CORE P0 Spec — Provider Failover

Status: ROADMAP (approved for execution)
Owner: CORE

## Scope
1. Timeout reroute
2. Degraded fallback
3. Retry discipline
4. Provider health awareness

## Policy
- hard timeout per provider leg
- max retry budget per request
- no infinite retries
- circuit-breaker style temporary suppression for unhealthy provider

## Mandatory decision log fields
- trace_id
- provider_primary
- provider_fallback
- decision_reason
- retry_count
- timeout_ms
- health_snapshot
- final_outcome
- claim_level

## Acceptance (VERIFIED)
- timeout on primary triggers reroute within policy window
- degraded response explicitly tagged
- retries capped and auditable
- health table influences routing decisions

## Guardrails
- Do not present degraded fallback as semantic-equivalent success.
- Preserve claim level separation: VERIFIED / SELF-ASSERTED / BLOCKED / ROADMAP.
