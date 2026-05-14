Updated (UTC): 2026-05-14T04:53:47Z
Baseline commit: `64f51da5a93a6f9f84aef2176f3d24e289e92931`
Baseline tag: `baseline-live-internal-2026-05-14`
Mode: GO CONTROLLED+++ RECOVERY NOTES

# Minimal Deployment Recovery Notes — 2026-05-14

## 1) Restore exact baseline
```bash
git fetch --all --tags
git checkout feat/wave3-relay-register-l001
git reset --hard baseline-live-internal-2026-05-14
```

## 2) Verify baseline integrity
```bash
git rev-parse --short HEAD
git rev-parse HEAD
git tag --points-at HEAD
```
Expected:
- HEAD = `64f51da5a93a6f9f84aef2176f3d24e289e92931`
- tag includes `baseline-live-internal-2026-05-14`

## 3) Runtime health checks
```bash
curl -sS http://localhost:3000/health
curl -sS http://localhost:3000/api/system/smoke
curl -sS http://localhost:3000/api/qdrant/health
curl -sS http://localhost:3000/metrics/federation
```

## 4) Replay integrity quick check
- Validate latest replay anchor hash against stored reference.
- If mismatch: classify as `BLOCKED`, preserve logs, open incident.

## 5) Rollback trigger rule
Rollback immediately when one of:
- smoke < expected threshold,
- replay integrity mismatch,
- health degraded + incident active,
- operator freeze required.

## Claim hygiene
- Runtime continuity state: **VERIFIED**
- Failover destructive test: **SELF_ASSERTED** (not yet promoted)
