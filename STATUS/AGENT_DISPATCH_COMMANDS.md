# AGENT DISPATCH COMMANDS — P0 (CNC core)
generated_utc: 2026-05-22 · owner: K02 · model pracy: issue → branch → PR → test → review → merge
Reguła: brak deploy prod / zmian na main bez GO operatora. claim ≤ proof. Zero sekretów w repo/logach.

## CODEX — P0 backend (repo `0n40i4/k0nsult-chat`)
Branch per task: `feat/p0-cx-00X-<slug>`. Każdy PR: FAKT / ZMIANA / TEST / RYZYKO / ROLLBACK.
- **P0-CX-001** `/api/health` → 200 `{ok,service:'k0nsult-chat',version,timestamp}`
- **P0-CX-002** `/api/chat/message` → tworzy session_id+message_id, zwraca `accepted`
- **P0-CX-003** `/api/session/create` + `/api/chat/history/:session_id` (historia odtwarzalna: autor/czas/source)
- **P0-CX-004** `/api/jobs` + `/api/jobs/:id` (status: draft|queued|running|needs_approval|done|failed|cancelled)
- **P0-CX-005** audit log JSONL/tabela (każda komenda/job/approval; zero tokenów)
- **P0-CX-006** approval gate GO/HOLD/NO-GO (deploy/GitHub write/memory write/public publish)
- **P0-CX-007** command parser (`/status /health /job /go /hold /no-go /audit /codex`)
- **P0-CX-008** fix UI status (online/offline/error z realnego `/api/health`, koniec „łączenie")
- **P0-CX-009** agents.registry.json (GPT, Codex, Claude, Monitor, Evidence, Memory, Discord Relay)
- **P0-CX-010** security middleware (no tokens in logs, rate limit, role operator/dev/viewer)

## CLAUDE CODE — P0 architektura (repo `0n40i4/k0nsult-chat`)
- **P0-CL-001** ARCHITECTURE_MAP.md (mapa modułów)
- **P0-CL-002** gap UI vs Command Chat/Cockpit (lista braków + komponenty)
- **P0-CL-003** db/schema.sql + migracje (sessions/messages/jobs/audit_logs/approvals/agents)
- **P0-CL-004** docs/API_SPEC.md (OpenAPI/Markdown)
- **P0-CL-005** docs/SECURITY_BOUNDARY.md

## LYRA — triage (Haiku 4.5, DID c3d4e5f6)
- Ingest Drive (read-only) + klasyfikacja claim≤proof. Runda 1 (10 źródeł) ✅ — patrz STATUS/TASKS_P0_P1_P2.md.

## OPERATOR — GO gate (wyłącznie człowiek)
- GO/HOLD/NO-GO · zatwierdzenie migracji pamięci · publikacji · deploy prod · **DELETE na Drive**.

## Format raportu agenta (po zadaniu)
`ID · Repo · Branch · Pliki · Testy · Ryzyko · Rollback · Czy wymaga GO · Link PR · Evidence case`
