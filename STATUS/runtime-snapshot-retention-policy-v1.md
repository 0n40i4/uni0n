# Runtime Snapshot Retention Policy v1

Updated (UTC): 2026-05-14T03:52:44Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: CORE
Claim level: VERIFIED

## Snapshot cadence
- runtime snapshots: every 15 min
- governance snapshots: every 60 min
- incident snapshots: on create/update/close + every 10 min while active
- release snapshots: at gate open, pre-release, post-release, rollback

## Retention windows
- routine runtime snapshots: 30d
- governance snapshots: 180d
- incident/release snapshots: 365d minimum

## Preserve overrides
- preserve flag forces no deletion until explicit authority clear.
- preserve scope can be trace/incident/release/global.

## Incident retention
- all incident-linked snapshots kept with incident replay pack.
- critical incidents require immutable archive copy.

## Replay-linked snapshots
- each snapshot stores replay linkage metadata (`trace_id`, `replay_ref`).
- missing replay linkage on required classes => BLOCKED compliance state.
