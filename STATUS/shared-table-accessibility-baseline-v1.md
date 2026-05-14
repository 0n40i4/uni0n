# Shared Table Accessibility Baseline v1

Updated (UTC): 2026-05-14T03:52:44Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: MICKIEWICZ
Claim level: VERIFIED

## Contrast rules
- PASS/BLOCKED/DEGRADED markers must meet WCAG AA contrast minimum.
- text + badge pairing mandatory (color not sole carrier).

## Mobile readability
- minimum 16px body text in critical panels
- tap targets >= 44px
- compressed cards preserve severity + trace_id visibility

## Degraded/mobile mode
- hide nonessential charts
- prioritize text status + incident controls
- refresh every 30-60s under low bandwidth

## Low-bandwidth operator mode
- text-first payloads
- deferred chart loading
- retry/backoff indicators for failed fetches

## Emergency readability
- dedicated emergency color/label banner
- freeze/rollback actions always reachable within one tap
