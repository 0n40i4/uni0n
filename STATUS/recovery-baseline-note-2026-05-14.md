Updated (UTC): 2026-05-14T04:56:15Z
Commit/hash: `64f51da` / `64f51da5a93a6f9f84aef2176f3d24e289e92931`
Mode: GO CONTROLLED+++ BASELINE PROTECTION

# Recovery Baseline Note — 2026-05-14

## Tag reference
- Baseline tag: `baseline-live-internal-2026-05-14`
- Branch: `feat/wave3-relay-register-l001`

## Rollback command
```bash
git fetch --all --tags
git checkout feat/wave3-relay-register-l001
git reset --hard baseline-live-internal-2026-05-14
```

## Deploy reference
- Frozen baseline commit: `64f51da5a93a6f9f84aef2176f3d24e289e92931`
- Continuity: remote branch + remote tag verified.

## Smoke refs
- `STATUS/runtime-verification-snapshot-2026-05-14.md`
- `/api/system/smoke` (verified runtime signal)

## Replay refs
- Replay integrity anchor: verified SHA-256 (runtime snapshot lineage)
- `STATUS/runtime-verification-evidence-index-2026-05-14.md`

## Known blockers
- P0: missing frontend implementation package for `chat.k0nsult.cloud`.

## Recovery sequence
1. Restore baseline tag.
2. Verify commit/tag integrity (`git rev-parse`, `git tag --points-at HEAD`).
3. Run runtime checks (`/health`, `/api/system/smoke`, `/api/qdrant/health`, `/metrics/federation`).
4. Validate replay anchor integrity.
5. If any check fails: classify `BLOCKED`, preserve evidence, hold deploy.
