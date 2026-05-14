# Systemic Risk Evaluation Baseline v1

Updated (UTC): 2026-05-14T03:52:44Z
Commit/hash: `97d48145011155bdde8f551ee36eceda83b57c93`
Owner: ORACLE
Claim level: VERIFIED

## Risk tracks
1. Operational risk
   - runtime uptime, incident frequency, rollback readiness
2. Governance drift
   - claim mismatches, unverified promotions, freeze discipline breaches
3. Replay reliability
   - replay availability, replay completeness, trace integrity
4. Federation instability
   - quorum loss, failover churn, partition events
5. Operator overload
   - alert saturation, action latency, unresolved critical queues

## Baseline scoring
- 0-2: stable
- 3-5: controlled risk
- 6-8: high risk
- 9-10: blocked state trigger

## Output requirement
- publish top-5 risks with owner, claim level, mitigation action.
