Updated (UTC): 2026-05-14T04:28:40Z
Commit/hash: `97d4814` / `97d48145011155bdde8f551ee36eceda83b57c93`
Mode: GO CONTROLLED+++ P0 IMPLEMENTATION

# P0 Public Surface Implementation Checklist (Trust + Status + Claims)

## Scope
Deploy immediately implementable public/operator surfaces without speculative frontend expansion.

## Workstream A — Trust Center (Public)
Owner: CORE + KOPERNIK

- [ ] Create `/trust` page skeleton.
- [ ] Sections: Runtime Status, Governance Model, Methodology, Release State, Evidence Index.
- [ ] Render claim-level legend: `VERIFIED / LIVE_INTERNAL / SELF_ASSERTED / ROADMAP`.
- [ ] Bind only to existing evidence artifacts (no inferred data).
- [ ] Add `last_updated_utc`, `owner`, `source_ref` in each section.
- [ ] Add fallback banner when live data unavailable.

Done criteria:
- page loads publicly,
- claim legend visible,
- each section links to at least one STATUS evidence ref.

## Workstream B — Live Status Page
Owner: CORE + LEM

- [ ] Create `/status` page.
- [ ] Show cards for: `/health`, `/api/system/smoke`, `/api/qdrant/health`, Redis state, replay availability, incidents.
- [ ] Display endpoint state as PASS/BLOCKED/DEGRADED only.
- [ ] Add timestamp per signal.
- [ ] Show latest smoke result (4/4 expected from current verified snapshot).
- [ ] Include explicit "no fake LIVE" guard: unknown signals shown as `BLOCKED` or `NO_DATA`.

Done criteria:
- all required cards visible,
- each card has timestamp + source,
- unknown does not render as healthy.

## Workstream C — Claim Hygiene Public Model
Owner: KOPERNIK

- [ ] Create `/claims` page (or Trust Center section anchor).
- [ ] Define the 4 claim levels with operator-readable examples.
- [ ] Map current system components to claim levels.
- [ ] Include promotion rules `LIVE_INTERNAL -> VERIFIED` only with runtime evidence.
- [ ] Include anti-pattern block: fake LIVE, speculative claims, missing evidence refs.

Done criteria:
- claim matrix visible,
- promotion rule explicit,
- anti-patterns explicitly listed.

## Workstream D — Shared Operations Table Demo (minimal)
Owner: CORE + MICKIEWICZ

- [ ] Build `/ops-demo` with 4 widgets only: runtime bar, execution board, replay lookup, incident panel.
- [ ] Read-only mode first.
- [ ] Execution board rows require: task_id, owner, status, claim_level, replay_ref.
- [ ] Replay lookup requires `trace_id` input + response panel.
- [ ] Incident panel shows active incidents + preserve flag.

Done criteria:
- 4 widgets render,
- data wiring works from current runtime/STATUS sources,
- no speculative controls.

## Workstream E — Execution Board UI (operator surface)
Owner: CORE + MICKIEWICZ

- [ ] Create `/execution-board` table.
- [ ] Columns minimum: Task ID, Owner, Priority, Status, Smoke, Replay, Rollback, Claim Level, Deadline, Notes.
- [ ] Status enum only: `pending / in_progress / blocked / verified / archived`.
- [ ] Add filters: owner, status, claim_level, blocker_class.
- [ ] Add row evidence links.

Done criteria:
- table operational,
- enums enforced,
- evidence links present.

## Cross-cutting non-negotiables
- [ ] No speculative frontend assumptions beyond attached runtime/repo reality.
- [ ] No fake LIVE indicators.
- [ ] Every module shows: timestamp, claim level, source reference, owner.
- [ ] Rollback/fallback note present in each module.

## Priority/sequence
1. Trust Center
2. Live Status
3. Claim Hygiene Public Model
4. Ops Demo
5. Execution Board UI

## Dependencies to start implementation
- repo URL
- branch
- frontend app path
- deploy method
- Fly mapping
- runtime stack

Without full dependency package: implementation remains BLOCKED.
