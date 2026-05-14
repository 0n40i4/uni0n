# Runtime Widget Data Contracts v1

Updated (UTC): 2026-05-14T03:49:23Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Claim level: VERIFIED (pre-unblock contract)

## Common envelope (all responses)
```json
{
  "trace_id": "string",
  "timestamp": "ISO-8601",
  "claim_level": "VERIFIED|LIVE_INTERNAL|SELF_ASSERTED|ROADMAP",
  "owner": "CORE|KOPERNIK|LEM|MICKIEWICZ|ORACLE|OPERATOR",
  "status": "PASS|BLOCKED",
  "replay_ref": "string|null",
  "rollback_ref": "string|null",
  "data": {}
}
```

## 1) Runtime status bar schema
`data`:
- `health`: `ok|degraded|down`
- `smoke`: `pass|blocked|unknown`
- `incident_count`: number
- `drift_state`: `clean|warning|blocked`
- `replay_available`: boolean
- `release_state`: `open|frozen|blocked`

## 2) Replay lookup schema
`data`:
- `query_trace_id`: string
- `replay_status`: `found|not_found|blocked`
- `replay_fingerprint`: string|null
- `replay_latency_ms`: number|null
- `replay_link`: string|null

## 3) Incident stream schema
`data`:
- `incidents`: array of
  - `incident_id`: string
  - `severity`: `INFO|MINOR|MAJOR|CRITICAL`
  - `freeze_state`: `on|off`
  - `preserve_state`: `on|off`
  - `escalation_level`: string
  - `owner`: string

## 4) Execution board schema
`data`:
- `tasks`: array of
  - `task_id`: string
  - `owner`: string
  - `status`: `pending|in_progress|blocked|verified|archived`
  - `claim_level`: `VERIFIED|LIVE_INTERNAL|SELF_ASSERTED|ROADMAP`
  - `pass_blocked`: `PASS|BLOCKED`
  - `deadline`: string|null

## 5) Operator action result schema
`data`:
- `action`: `health|replay|drift|incident|freeze|rollback|release|smoke`
- `result`: `accepted|completed|blocked|failed`
- `message`: string

## Error schema (all widgets)
```json
{
  "trace_id": "string",
  "timestamp": "ISO-8601",
  "status": "BLOCKED",
  "error": {
    "code": "AUTH_REQUIRED|SOURCE_UNAVAILABLE|REPLAY_UNAVAILABLE|DRIFT_BLOCKED|INTERNAL_ERROR",
    "message": "string",
    "retryable": true
  },
  "claim_level": "SELF_ASSERTED",
  "replay_ref": null,
  "rollback_ref": "string|null"
}
```