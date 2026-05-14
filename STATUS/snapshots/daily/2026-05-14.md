# Runtime Snapshot — TEMPLATE

snapshot_type: DAILY | RELEASE | INCIDENT
timestamp_utc: YYYY-MM-DDTHH:MM:SSZ
owner: CORE
reviewer: KOPERNIK
claim_level: VERIFIED | SELF-ASSERTED | BLOCKED | ROADMAP
status: GO | GO_CONTROLLED++ | DEGRADED | BLOCKED

## 1) Runtime State
- environment: prod | staging | testnet
- active_version: <git_sha_or_release_tag>
- runtime_mode: single | federated
- uptime_hint: <from /health or platform>

## 2) Deploy Status
- deploy_state: deployed | pending | failed | rolled_back
- deploy_timestamp_utc: <timestamp>
- deploy_actor: CORE | operator
- release_notes_ref: <path/url>

## 3) Relay Health
- endpoint: /api/relay/health (or equivalent)
- route_success_rate: <value>
- fallback_rate: <value>
- queue_depth: <value>
- replay_log_status: healthy | delayed | blocked

## 4) Smoke Tests (evidence)
- /health => <code/result>
- /api/k0nsulat/status => <code/result>
- /rfc/index.json => <code/result>
- /api/agent/register => <code/result>
- /api/relay/send => <code/result>
- evidence_links:
  - <EVIDENCE/path-1>
  - <EVIDENCE/path-2>

## 5) Blockers
- blocker_id: <id>
  severity: S0|S1|S2
  summary: <text>
  owner: CORE|KOPERNIK|LEM|MICKIEWICZ
  eta: <timestamp or unknown>

## 6) Release Timestamps
- last_successful_release_utc: <timestamp>
- previous_release_utc: <timestamp>
- next_planned_release_utc: <timestamp>

## 7) Rollback Status
- rollback_ready: yes | no
- rollback_target: <sha/tag>
- rollback_procedure_ref: <path>
- rollback_last_tested_utc: <timestamp>

## 8) Federation Notes
- governance_notes: <text>
- trust_hierarchy_notes: <text>
- semantic_drift_notes: <text>
- memory_governance_notes: <text>

## 9) Claim Register
- claim: <text>
  level: VERIFIED | SELF-ASSERTED | BLOCKED | ROADMAP
  evidence: <path/url or n/a>
  owner: <role>
