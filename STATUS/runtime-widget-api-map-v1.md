# Runtime Widget API Map v1

Updated (UTC): 2026-05-14T03:49:23Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Claim level: VERIFIED (pre-unblock mapping)

| Endpoint | Widget | Refresh cadence | Auth | Replay support | Claim source |
| --- | --- | --- | --- | --- | --- |
| `GET /api/operator/status` | Runtime top bar | 15s | JWT required | partial (`trace_id` from server logs) | CORE runtime state |
| `GET /api/status` | Runtime health fallback | 30s | public | none | CORE service health |
| `GET /metrics/federation` | Drift/federation indicators | 30s | public/internal | none | CORE metrics pipeline |
| `POST /api/relay/route` | LEM semantic routing state | on-demand + 30s cache | JWT/internal | yes (`trace_id`/route outputs) | LEM relay engine |
| `POST /api/operator/export-audit` | Replay lookup backend | on-demand | JWT required | yes (audit hash+log rows) | CORE/KOPERNIK audit trail |
| `GET /api/k0nsulat/status` | Governance/release overlays | 30s | public/internal | optional | KOPERNIK governance layer |
| `GET /api/operator/drive/status` (if enabled) | Release evidence status | 60s | JWT required | optional | CORE evidence pipeline |
| `GET /api/execution-board` (target, post-unblock) | Execution board live panel | 15s | JWT required | yes | Shared operations board |
| `GET /api/incidents` (target, post-unblock) | Incident stream | 15s | JWT required | yes | Incident ops |

## Notes
- If endpoint unavailable: widget must render `BLOCKED`, never fake PASS.
- Claim badge source order: VERIFIED > LIVE_INTERNAL > SELF_ASSERTED > ROADMAP.