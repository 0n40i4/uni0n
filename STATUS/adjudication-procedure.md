# Memory Adjudication Procedure (KONSULAT Veto Path)

Updated: 2026-05-14
Owner: KOPERNIK (process), KONSULAT (final authority)

## Purpose
Resolve governance-memory conflicts with replayable, authority-consistent decisions.

## Procedure
1. Detect conflict
   - Mark conflict as `MEMORY_CONFLICT_OPEN`.
   - Open register entry from template: `STATUS/templates/memory-conflict-register.md`.

2. Collect claims
   - Capture Claim A / Claim B exactly as stated.
   - Attach evidence references and authority references.

3. Apply hierarchy check
   - Use `CANONICAL/memory-governance-policy.md` authority hierarchy.
   - If higher authority is clear, prepare recommendation.
   - If not clear, escalate without recommendation.

4. Escalate for adjudication
   - Submit packet to KONSULAT (or designated delegated owner).
   - Include conflict_id, claims, evidence refs, policy basis, recommendation(optional).

5. Record decision
   - Write decision fields in register entry.
   - Include rationale + required actions + timestamp.

6. Execute overwrite/update
   - Perform memory overwrite only per adjudicated decision.
   - No silent or implicit overwrite.

7. Publish closure
   - Set status `MEMORY_CONFLICT_RESOLVED` (or REJECTED).
   - Link closure to STATUS snapshot + evidence pack.

## Enforcement Rules
- No public promotion from ROADMAP to runtime fact.
- SELF-ASSERTED cannot override VERIFIED without explicit authority decision.
- Any unresolved high/critical conflict blocks claim promotion.
