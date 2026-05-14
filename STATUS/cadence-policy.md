# STATUS Cadence Policy

Updated: 2026-05-14
Applies to: UNIONAI Ω∞ operational federation reporting

## Required snapshot types
1. Daily snapshot
   - Frequency: every day (UTC)
   - Purpose: baseline runtime + governance continuity
2. Release snapshot
   - Trigger: every deploy/release event
   - Purpose: release traceability + rollback readiness
3. Incident snapshot
   - Trigger: any S0/S1 outage, degraded relay, security event, blocked critical path
   - Purpose: live incident evidence + decision continuity

## File placement
- `STATUS/snapshots/daily/YYYY-MM-DD.md`
- `STATUS/snapshots/release/YYYY-MM-DDTHHMMSSZ-<release>.md`
- `STATUS/snapshots/incident/YYYY-MM-DDTHHMMSSZ-<incident-id>.md`

## Mandatory fields
Every snapshot MUST include:
- runtime state
- deploy status
- relay health
- blockers
- smoke tests
- release timestamps
- claim level
- rollback status
- federation notes

Template source:
- `STATUS/templates/runtime-snapshot-template.md`
