# Federation Widget Runtime Contract v1

Updated (UTC): 2026-05-14T03:49:23Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: LEM
Claim level: VERIFIED (contract)

## Provider chain widget
- fields: `providers[]`, `active_provider`, `fallback_provider`, `last_switch_at`

## Failover visibility
- fields: `failover_state` (`off|armed|active`), `failover_reason`, `failover_trace_id`

## Degradation visibility
- fields: `degradation_mode` (`0|1|2|3`), `reason`, `started_at`

## Semantic routing state
- fields: `route_strategy`, `confidence`, `candidate_count`, `trace_id`, `replay_ref`

## Contract envelope
- `trace_id`, `timestamp`, `claim_level`, `status`, `replay_ref`, `rollback_ref`, `data`
