# UNIONAI Execution Pack — Sprint 2 tygodnie

Updated (UTC): 2026-05-15
Mode: GO CONTROLLED / FEDERATION MVP

## A) Sprint board (14 dni)

| TASK_ID | Task | Owner | Deadline | Status | Claim | Blocker class | Evidence |
|---|---|---|---|---|---|---|---|
| P0-1 | Runtime Demo Flow (join→route→evidence→status) | CORE + FRONTEND | D+3 | 0% | SELF-ASSERTED | impl | trace + smoke + screenshot |
| P0-2 | AI Inventory Dashboard | FRONTEND + OBSERVABILITY | D+4 | 0% | SELF-ASSERTED | impl | /status cards + timestamps |
| P0-3 | Claim Hygiene Badges | KOPERNIK + FRONTEND | D+3 | 0% | SELF-ASSERTED | impl | component→claim mapping |
| P0-4 | Limitations Page | GOVERNANCE + COMPLIANCE | D+2 | 0% | SELF-ASSERTED | impl | public page URL |
| P0-5 | Evidence Pack Demo (1-click) | BACKEND + COMPLIANCE | D+4 | 0% | SELF-ASSERTED | impl | artifact + checksum |
| SEC-1 | Relay API auth hardening | CORE | D+1 | 0% | BLOCKED | impl | 401/403 retest matrix |
| OBS-1 | Runtime telemetry baseline | OBSERVABILITY | D+5 | 0% | ROADMAP | env | metrics snapshot |
| GOV-1 | AI Act matrix baseline | COMPLIANCE | D+6 | 0% | ROADMAP | impl | matrix doc |
| FED-1 | Agent join demo (9-agent pretest) | LEM + CORE | D+7 | 0% | ROADMAP | env | join logs |
| OPS-1 | Execution board operator surface | CORE + MICKIEWICZ | D+6 | 0% | ROADMAP | impl | UI + row evidence links |

## B) 10 tickets developerskich (copy-paste)

1. SEC-1: Enforce auth middleware on `/api/relay/send` and `/api/relay/route`; reject no-token and invalid-token with 401/403.
2. SEC-2: Add `src_did` allowlist + trust-tier checks post-auth; return 403 for unauthorized DID.
3. RUNTIME-1: Implement Runtime Demo Flow API path with trace_id propagation and replay linkage.
4. UI-1: Build AI Inventory Dashboard (agent list, owner, runtime state, claim level, last_update).
5. UI-2: Add Claim Hygiene badges across dashboard views (VERIFIED/SELF-ASSERTED/BLOCKED/ROADMAP).
6. GOV-1: Publish Limitations Page with explicit non-guarantees and known constraints.
7. EVID-1: Implement one-click Evidence Pack export (status + trace + hash + timestamp).
8. OBS-1: Add runtime telemetry panel and degraded/blocked thresholds.
9. OPS-1: Build Execution Board table (task_id/owner/status/claim/replay_ref/deadline/notes).
10. FED-1: Deliver 9-agent join pretest flow and evidence snapshot.

## C) Daily status format
`TASK_ID | OWNER | STATUS% | CLAIM | BLOCKER(env/impl) | ETA | EVIDENCE_LINK`
