# Runtime Event Bus Contract v1

Updated (UTC): 2026-05-14T03:52:44Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: CORE
Claim level: VERIFIED (pre-unblock hardening)

## Event envelope schema
```json
{
  "event_id": "uuid",
  "event_class": "runtime|governance|incident|replay|release|federation",
  "event_type": "string",
  "trace_id": "string",
  "parent_trace_id": "string|null",
  "timestamp": "ISO-8601",
  "owner": "CORE|KOPERNIK|LEM|MICKIEWICZ|ORACLE|OPERATOR",
  "claim_level": "VERIFIED|LIVE_INTERNAL|SELF_ASSERTED|ROADMAP",
  "replay_ref": "string|null",
  "incident_id": "string|null",
  "release_id": "string|null",
  "payload": {}
}
```

## Trace continuity
- `trace_id` mandatory for all events.
- `parent_trace_id` mandatory for derived events.
- Missing trace_id => reject event (BLOCKED).

## Replay linkage
- replay class events must include `replay_ref`.
- runtime/governance events should include replay_ref when actionable.

## Incident linkage
- incident/release-impacting events must include `incident_id` when incident is active.

## Retention rules
- runtime events: 30d
- governance events: 180d
- incident/release/replay events: 365d minimum
- preserve override extends retention to legal hold/manual clear

## Ordering guarantees
- Within same `trace_id`: strict monotonic sequence required.
- Global ordering: best-effort by timestamp + event_id tie-break.
- Out-of-order in same trace => integrity warning + audit flag.
