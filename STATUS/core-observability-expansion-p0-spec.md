# CORE P0 Spec — Observability Expansion

Status: ROADMAP (approved for execution)
Owner: CORE

## Deliverables
1. Runtime dashboards
2. Latency baselines (p50/p95)
3. Relay metrics
4. Incident visibility panel

## Minimum metrics
- requests_total{endpoint,status}
- relay_events_total{route,outcome}
- provider_latency_ms_bucket{provider}
- fallback_events_total{reason}
- incident_open_total{severity}

## Snapshot cadence link
- daily: runtime baseline + top incidents
- release: delta vs previous release
- incident: timeline + affected endpoints + rollback state

## Acceptance (VERIFIED)
- dashboard URLs or exports attached in EVIDENCE
- latency baseline reproducible from captured metrics
- incident record linked to trace_id and rollback status
