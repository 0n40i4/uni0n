# Runtime Evidence Standard (P0)

Required fields for every runtime/deploy evidence entry:

1. `TASK_ID`
2. `COMMIT`
3. `SHA256`
4. `SMOKE_TEST`
5. `ROLLBACK`
6. `STATUS`
7. `CLAIM_LEVEL` (`VERIFIED` | `SELF-ASSERTED`)
8. `TIMESTAMP` (ISO-8601, UTC)
9. `OWNER`

## Minimal example
```yaml
TASK_ID: LEM-L001
COMMIT: 97d4814
SHA256: 1efc303500dfc33a282ed06545bd3d26748863c7aa816142575b2d429af035f0
SMOKE_TEST:
  - "GET /health => 200"
  - "POST /api/agent/register => 200|201"
ROLLBACK: "git revert <commit> OR deploy previous image tag"
STATUS: "GO_CONTROLLED"
CLAIM_LEVEL: "VERIFIED"
TIMESTAMP: "2026-05-14T00:00:00Z"
OWNER: "CORE"
```
