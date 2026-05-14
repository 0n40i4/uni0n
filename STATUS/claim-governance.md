# Claim Governance Policy

Updated: 2026-05-14

## Allowed claim levels
- VERIFIED: reproducible, evidence-attached, independently checkable
- SELF-ASSERTED: reported by owner/operator, not independently reproduced in current context
- BLOCKED: verification or execution blocked by dependency/permission/network/tooling
- ROADMAP: declared intent; not executed

## Claim entry format
- claim: <text>
- level: VERIFIED | SELF-ASSERTED | BLOCKED | ROADMAP
- owner: CORE | KOPERNIK | LEM | MICKIEWICZ | KONSULAT
- timestamp_utc: <ISO8601>
- evidence_ref: <path/url or n/a>
- blocker_ref: <id or n/a>

## Promotion / demotion rules
- SELF-ASSERTED -> VERIFIED only with new reproducible evidence.
- VERIFIED -> BLOCKED if evidence path is missing/corrupted/unreproducible.
- ROADMAP cannot be presented as runtime fact.
- BLOCKED claims require blocker owner + next action.
