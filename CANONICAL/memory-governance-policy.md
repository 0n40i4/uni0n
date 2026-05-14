# Memory Governance Policy (P0)

Updated: 2026-05-14
Owner: KOPERNIK (governance), KONSULAT (final veto)

## 1) Authority hierarchy
1. KONSULAT approvals/veto
2. CANONICAL docs
3. STATUS snapshots with evidence
4. Runtime logs/events
5. Working notes / chat-level context

Higher authority always overrides lower authority.

## 2) Overwrite rules
- Memory overwrite MUST include:
  - reason
  - authority source
  - timestamp
  - replaced reference
- No silent overwrite of higher-authority records.
- Conflicting same-level records remain dual until adjudicated.

## 3) Conflict resolution
When conflict detected:
1. mark as `MEMORY_CONFLICT_OPEN`
2. attach both claims + evidence refs
3. request authority decision (KONSULAT or designated owner)
4. write adjudication note and close as `MEMORY_CONFLICT_RESOLVED`

## 4) Semantic drift control
- Any terminology change affecting governance/trust/federation requires drift note in STATUS.
- Public narrative must keep LIVE vs TESTNET clarity.

## 5) Replayability consistency
- Every governance-changing memory decision must be replayable from:
  - canonical policy
  - timestamped status snapshot
  - evidence path
