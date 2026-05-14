# Semantic Routing Confidence Model v1

Updated (UTC): 2026-05-14T03:52:44Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: LEM
Claim level: VERIFIED

## Confidence score
- Base score range: 0.0 - 1.0
- High confidence: >= 0.80
- Controlled confidence: 0.60 - 0.79
- Low confidence: < 0.60 (degrade or fallback)

## Drift penalties
- Apply penalty when drift indicators rise:
  - warning drift: -0.10
  - blocked drift: -0.25

## Provider weighting
- weighted score = semantic score * provider reliability weight
- reliability weights from rolling 7-day replay success.

## Replay confidence linkage
- confidence claim must include replay reference when route is executed.
- missing replay linkage => confidence claim cannot exceed SELF_ASSERTED.
