# CORE P0 — Observability Baseline

Updated: 2026-05-14
Owner: CORE

## Required minimum
1. `/metrics` endpoint exposed in controlled scope
2. Request tracing enabled for critical APIs:
   - `/health`
   - `/api/agent/register`
   - `/api/relay/send`
   - `/api/relay/route`
3. Relay visibility dashboard/log view:
   - throughput
   - success/failure counts
   - fallback ratio
4. Latency/error baseline published daily:
   - p50/p95 latency
   - error rate by endpoint

## Claim hygiene for observability
- Metrics/tracing claims are VERIFIED only with exported sample evidence in EVIDENCE/.
- Dashboard-only statements without export are SELF-ASSERTED.
