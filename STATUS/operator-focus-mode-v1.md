# Operator Focus Mode v1

Updated (UTC): 2026-05-14T03:52:44Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: MICKIEWICZ
Claim level: VERIFIED

## Reduced-noise runtime mode
- hide non-critical modules by default
- show only P0/P1 incidents, freeze state, release state, drift status

## Incident-first visibility
- incident panel pinned to top
- incident severity colors always visible
- quick actions inline: escalate / freeze / rollback-prepare

## Cognitive overload reduction
- max 6 critical signals above fold
- one-line status per module
- auto-collapse verbose logs

## Alert prioritization
- CRITICAL immediate pop + sound/vibration (mobile)
- MAJOR sticky banner
- MINOR in queue
- INFO muted feed
