# Release Governance v1

Version: v1
Timestamp: 2026-05-14T00:00:00Z
Owner: ALL FLAGOWCE (governance), CORE (runtime execution)
Claim-Level: ROADMAP
Anti-Drift: ENABLED

## Release lifecycle
1. Scope freeze proposal
2. Evidence readiness check
3. Approval gate (KONSULAT/human)
4. Runtime release execution (CORE)
5. Post-release verification snapshot

## Freeze protocol
- Freeze triggers: unresolved critical blocker, governance conflict, missing evidence.
- During freeze: no silent deploys/hotfixes.

## Rollback governance
- Rollback decision must include rationale, trace_id, owner, impact scope.
- Rollback evidence required in STATUS + EVIDENCE.

## Release evidence requirements
- task IDs, commits, hashes, smoke tests, timestamps, owners, claim levels.

## Incident classification
- SEV-1: availability/data integrity
- SEV-2: degraded critical path
- SEV-3: non-critical regression

## Hotfix governance
- Hotfix allowed only with explicit approval path and post-hotfix evidence reconciliation.
