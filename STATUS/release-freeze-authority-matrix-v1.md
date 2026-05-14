# Release Freeze Authority Matrix v1

Updated (UTC): 2026-05-14T03:52:44Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: KOPERNIK
Claim level: VERIFIED

| Action | Primary authority | Secondary authority | Escalation chain | Evidence required | Replay required |
| --- | --- | --- | --- | --- | --- |
| Freeze release | CORE incident owner | KOPERNIK governance lead | Operator -> CORE -> KOPERNIK -> KONSULAT | incident state + blocker reason + trace refs | yes |
| Unfreeze release | CORE + KOPERNIK joint | KONSULAT final veto | CORE -> KOPERNIK -> KONSULAT | smoke PASS + replay PASS + rollback readiness | yes |
| Emergency freeze | Operator (immediate trigger) | CORE confirms | Operator -> CORE -> KOPERNIK | freeze action log + incident id | yes |
| Emergency rollback-prep | CORE | Operator request | Operator -> CORE | rollback checklist + artifact refs | yes |

## Rules
- No unfreeze without evidence pack completeness.
- Any missing replay linkage => remain BLOCKED.
