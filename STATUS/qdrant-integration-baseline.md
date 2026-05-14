# Qdrant Integration Baseline

Version: v1
Timestamp: 2026-05-14T00:00:00Z
Owner: LEM
Claim-Level: ROADMAP

## 1) Deployment topology
- Qdrant as dedicated vector service (single-node first, clustered later).
- Isolated namespace per environment: TESTNET/LIVE.

## 2) Collection schema
- `federation_memory`: id, vector, payload(scope, trace_id, source, trust_level, ts).
- `relay_events`: id, vector(optional), payload(route, provider, status, latency).

## 3) Embedding flow
- Input -> normalization -> embedding model -> upsert (idempotent key).
- Preserve mapping: content hash <-> point id.

## 4) Relay integration points
- Pre-route semantic hint lookup.
- Post-route writeback for replay/learning.

## 5) Semantic search baseline
- Top-k retrieval with threshold guard.
- Return score + source metadata + trace_id.

## 6) Fallback semantics
- On Qdrant timeout/unavailable: deterministic fallback route.
- Tag claim/result as degraded path.
