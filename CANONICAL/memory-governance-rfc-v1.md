# Memory Governance RFC v1

Version: v1
Timestamp: 2026-05-14T00:00:00Z
Owner: KOPERNIK
Claim-Level: ROADMAP
Anti-Drift: ENABLED

## 1) Overwrite hierarchy
1. KONSULAT veto/approval
2. CANONICAL records
3. VERIFIED STATUS snapshots
4. Runtime evidence/logs
5. Working memory/session notes

Higher level always overrides lower level.

## 2) Authority inheritance
- Child decisions inherit authority of parent governance decision.
- Inheritance breaks when conflicting newer authority exists.

## 3) Replay ownership
- Every memory mutation MUST map to: `trace_id`, timestamp, owner, reason, prior_ref, new_ref.
- Replay source of truth: CANONICAL + STATUS + EVIDENCE links.

## 4) Canonical ownership
- CANONICAL is human-governed.
- AI may propose updates, never autonomous canonical mutation.

## 5) Memory conflict resolution
1. Mark `MEMORY_CONFLICT_OPEN`.
2. Store both claims with evidence refs.
3. Escalate to authority owner.
4. Record adjudication and mark `MEMORY_CONFLICT_RESOLVED`.

## 6) Federation trust hierarchy
- Trust claims require explicit claim-level tag: VERIFIED/SELF-ASSERTED/BLOCKED/ROADMAP.
- No trust promotion without evidence promotion.

## 7) Operator override semantics
- Operator override allowed only with traceable rationale and timestamp.
- Override cannot delete VERIFIED evidence.

## Non-negotiables
- No silent overwrite.
- No hidden delete.
- Human sovereignty mandatory.
