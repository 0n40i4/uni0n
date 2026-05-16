# UNIONAI Smoke Rerun Report

- Timestamp: 2026-05-16 09:57:29 UTC
- Base URL: https://unionai.grassrootslobbing.pl
- Endpoint suite pass (all HTTP 200): PASS
- Provenance no-unknown: FAIL

## Endpoint Results
- [PASS] `/health` → HTTP 200
- [PASS] `/healthz` → HTTP 200
- [PASS] `/readyz` → HTTP 200
- [PASS] `/version` → HTTP 200
- [PASS] `/.well-known/agent.json` → HTTP 200
- [PASS] `/openapi.json` → HTTP 200
- [PASS] `/rfc/index.json` → HTTP 200
- [PASS] `/api/k0nsulat/status` → HTTP 200
- [PASS] `/api/leaderboard` → HTTP 200

## Provenance Snapshot
- `health_x_build_sha`: `unknown`
- `health_x_service_version`: `unknown`
- `version_build_sha`: `unknown`
- `version_version`: `unknown`
- `version_channel`: `stable`
- `version_build_time`: `2026-05-16T04:13:09.736Z`

## Decision
- P0 smoke + provenance: FAIL
- Open blockers: health_x_build_sha, health_x_service_version, version_build_sha, version_version
