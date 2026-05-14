# Governance Overlay State Machine v1

Updated (UTC): 2026-05-14T03:49:23Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: KOPERNIK
Claim level: VERIFIED

## State set
- ROADMAP
- LIVE_INTERNAL
- SELF_ASSERTED
- VERIFIED
- BLOCKED

## Transitions
- ROADMAP -> LIVE_INTERNAL (runtime surface exists)
- LIVE_INTERNAL -> SELF_ASSERTED (data visible, evidence incomplete)
- SELF_ASSERTED -> VERIFIED (evidence + smoke + replay + rollback refs present)
- ANY -> BLOCKED (source missing, runtime failure, auth failure, freeze)
- BLOCKED -> LIVE_INTERNAL (blocker cleared + runtime source restored)

## Overlay outputs
- Badge per widget/message
- Escalation ribbon: `none|minor|major|critical`
- Release freeze overlay:
  - ACTIVE if any critical widget is BLOCKED
  - ACTIVE if incident severity is MAJOR/CRITICAL

## Visibility rules
- VERIFIED: strong highlight
- LIVE_INTERNAL: blue
- BLOCKED: red hard stop
- ROADMAP: muted
