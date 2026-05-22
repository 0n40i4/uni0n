# TASKS_P0_P1_P2 — K0NSULT / UNIONAI
generated_utc: 2026-05-21 · źródło: CODERS_PACK + task board + audyty Kimi/Moonshot (ingest Lyra) · claim ≤ proof
Status: VERIFIED (dowód) · SELF-ASSERTED (twierdzenie bez dowodu) · BLOCKED · ROADMAP

## P0 — KRYTYCZNE
### Backend / Codex (repo 0n40i4/k0nsult-chat)
| ID | Opis | Status | Dowód |
|---|---|---|---|
| P0-CX-001 | /api/health | ✅ DONE | istnieje server.js L169 |
| P0-CX-002 | /api/chat/message (+session_id) | BLOCKED | brak w kodzie (jest /api/send bez sesji) |
| P0-CX-003 | /api/session/create + history/:id | BLOCKED | brak modelu sesji |
| P0-CX-004 | /api/jobs (+/:id) statusy | BLOCKED | brak job systemu |
| P0-CX-005 | audit_logs (zero sekretów) | BLOCKED | brak; publishLog ≈ częściowy |
| P0-CX-006 | approval gate GO/HOLD/NO-GO | BLOCKED (GO) | OPERATOR_KEY jest, gate brak |
| P0-CX-007 | command parser | BLOCKED | brak |
| P0-CX-008 | fix UI „łączenie" → /api/health | BLOCKED | StatusPanel nie spina realnego health |
| P0-CX-009 | agents.registry.json | 🟡 | /api/registry istnieje (zdarzenia), brak agentów systemowych |
| P0-CX-010 | security middleware | BLOCKED (GO) | brak ról/CORS/helmet |

### Architektura / Claude Code (k0nsult-chat) — ✅ UKOŃCZONE 2026-05-21
| ID | Output | Status |
|---|---|---|
| P0-CL-001 | docs/ARCHITECTURE_MAP.md | ✅ DONE (commit ef962cd) |
| P0-CL-002 | docs/UI_GAP_COCKPIT.md | ✅ DONE |
| P0-CL-003 | db/schema.sql + 001_core_tables.sql | ✅ DONE |
| P0-CL-004 | docs/API_SPEC.md | ✅ DONE |
| P0-CL-005 | docs/SECURITY_BOUNDARY.md | ✅ DONE |

### Drive cleanup / Operator
| ID | Opis | Status |
|---|---|---|
| D-CLEAN-001 | CANONICAL/ (SOURCE_OF_TRUTH/MASTER_INDEX/STATUS/ROADMAP) | BLOCKED — folder pusty |
| D-CLEAN-002 | jedna pamięć per agent | BLOCKED — wiele wersji |
| D-CLEAN-004 | dedup HANDOFF | BLOCKED (GO) — 2 kopie 7443 B |
| D-CLEAN-005 | dedup 1605 AUDYT UNI0N | BLOCKED (GO) — 5 kopii |

## P1 — WYSOKIE
| ID | Opis | Repo | Status |
|---|---|---|---|
| P1-CX-001 | /api/discord/send | k0nsult-chat | BACKLOG (GO) |
| P1-CX-003..010 | 8× FE/API (status page/onboarding/replay/relay) | uni0n | BACKLOG |
| UNION-FRONTEND | odblokować chat.k0nsult.cloud FE | k0nsult-chat | BLOCKED P0 (audyty) |
| UNION-SEMANTIC | semantic routing LIVE_INTERNAL → VERIFIED | uni0n | SELF-ASSERTED (Kimi) |

## P2 — ROADMAP
META router · Source-of-Truth unification · evidence native · federation plane · claim≤proof checks · Council Mode · Delta score · multi-agent judge · public status · marketplace · billing · replay · OpenRepoMemory sync.
