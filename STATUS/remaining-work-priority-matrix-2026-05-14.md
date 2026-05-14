Updated (UTC): 2026-05-14T04:18:44Z
Commit/hash: `97d4814` / `97d48145011155bdde8f551ee36eceda83b57c93`
Mode: GO CONTROLLED+++ IMPLEMENTATION READINESS REVIEW

# Remaining Work Priority Matrix — 2026-05-14

## P0
| Task | Owner | Dependency | Blocker | Complexity | Runtime risk | Frontend-dependent |
| --- | --- | --- | --- | --- | --- | --- |
| Attach `chat.k0nsult.cloud` source repo | CORE | repo URL + access | Missing repo URL | S | High | Yes |
| Confirm target branch + frontend path | CORE | repo attached | Missing branch/path | S | High | Yes |
| Confirm deploy method + Fly mapping + runtime stack | CORE | infra/runtime access | Missing deployment inputs | M | High | Yes |
| Implement PHASE 1 live surfaces (top bar, execution board, replay lookup, incident stream) | CORE + MICKIEWICZ | full 6/6 package | Frontend source absent | L | High | Yes |

## P1
| Task | Owner | Dependency | Blocker | Complexity | Runtime risk | Frontend-dependent |
| --- | --- | --- | --- | --- | --- | --- |
| Governance overlays live implementation | KOPERNIK + CORE | PHASE 1 complete | No live frontend layer | M | Medium | Yes |
| Federation visibility map live implementation | LEM + CORE | PHASE 1 complete | No live frontend layer | M | Medium | Yes |
| Operator one-click actions UI (smoke/replay/release/rollback/freeze) | MICKIEWICZ + CORE | PHASE 1 + auth hooks | No live frontend layer | L | High | Yes |

## P2
| Task | Owner | Dependency | Blocker | Complexity | Runtime risk | Frontend-dependent |
| --- | --- | --- | --- | --- | --- | --- |
| Grafana/alert visualization surface wiring | CORE | repo + observability access | UI wiring not implemented | M | Medium | Yes |
| Incident console controls (freeze/preserve/escalation/replay pack) | CORE + MICKIEWICZ | PHASE 1 data channels | No live incident UI | M | High | Yes |
| Auth/role visibility UI | CORE + KOPERNIK | auth/session model exposure | No frontend implementation | M | Medium | Yes |

## P3
| Task | Owner | Dependency | Blocker | Complexity | Runtime risk | Frontend-dependent |
| --- | --- | --- | --- | --- | --- | --- |
| Mobile continuity + emergency mode | MICKIEWICZ + CORE | PHASE 1/2 done | Live UI layer missing | M | Medium | Yes |
| Multi-table orchestration UI | ORACLE + CORE | prior phases done | Live shared-table base missing | L | Medium | Yes |
| Collaborative team/user mode | ORACLE + CORE | auth roles + UI surfaces | No live collaboration UI | L | Medium | Yes |

## Maintenance work (continue while blocked)
- smoke/replay verification, observability monitoring, runtime maintenance, repo cleanup, incident readiness, blocker tracking.
