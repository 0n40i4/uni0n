# Semantic Relay Observability v1

Status: GO-CONTROLLED
Owner: LEM
Timestamp: 2026-05-14
Claim_Level: ROADMAP

## Telemetry baseline
- relay hop visibility (hop_id, provider, latency)
- semantic confidence score
- drift_ratio timeline
- provider chain + failover reason
- trace_id continuity end-to-end

## Required views
- success/fail by provider
- degraded fallback rate
- semantic vs syntactic split
- replay lag and reconciliation status

## Validation refs (required for VERIFIED)
- metrics snapshots
- trace samples
- incident sample with rollback reference.