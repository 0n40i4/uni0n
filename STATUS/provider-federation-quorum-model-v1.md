# Provider Federation Quorum Model v1

Updated (UTC): 2026-05-14T03:52:44Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: LEM
Claim level: VERIFIED

## Quorum thresholds
- Normal quorum: >= 2/3 healthy providers
- Minimum controlled quorum: >= 1/2 with fallback guardrails
- Below minimum => BLOCKED runtime lane

## Degraded quorum
- Enter DEGRADED when healthy providers < normal quorum.
- Restrict high-risk actions (release/write-heavy ops).
- Require explicit operator warning banner.

## Provider disagreement handling
- If outputs conflict above confidence tolerance:
  - request tie-break provider
  - if unresolved, downgrade claim to SELF_ASSERTED or BLOCKED

## Fallback consensus
- Use weighted fallback vote:
  - primary weight 0.5
  - secondary 0.3
  - tertiary 0.2
- Consensus below threshold => trigger FAILOVER or PARTITIONED state.
