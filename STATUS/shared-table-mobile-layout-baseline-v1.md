# Shared Table Mobile Layout Baseline v1

Updated (UTC): 2026-05-14T03:49:23Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: MICKIEWICZ
Claim level: VERIFIED

## Mobile-first layout
- stacked panels in order:
  1) runtime top bar
  2) incidents
  3) execution board
  4) replay lookup
  5) federation status

## Priority visibility
- always visible: health, smoke, incident count, release state, degradation state

## Emergency quick actions
- freeze
- incident escalate
- rollback prepare
- smoke run

## Low bandwidth mode
- disable auto-heavy charts
- refresh cadence relaxed (30-60s)
- text-first status summaries
