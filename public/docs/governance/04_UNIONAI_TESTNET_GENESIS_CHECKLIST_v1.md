# UNIONAI Ω∞ — TESTNET GENESIS CHECKLIST v1.0

Status: GO CONTROLLED
Source of truth: Grassroots Lobbing / K0NSULT Ω∞ / 0n40i4
Confirmation code: UNIONAI-GENESIS-0N40I4-20260512
Tryb: publication-ready / internal sandbox before public federation


## Cel
Checklista GO/NO-GO dla uruchomienia wewnętrznego sandboxu 18 agentów.

## Zakres
Testnet V1 pozostaje internal sandbox. Public federation jest deferred.

## Checklist P0
### Core
- [ ] /health HTTP 200
- [ ] /metrics działa
- [ ] PostgreSQL online
- [ ] Redis online
- [ ] Qdrant online
- [ ] Docker compose działa lokalnie
- [ ] deploy platform działa bez 403

### Discovery
- [ ] /llms.txt HTTP 200
- [ ] /.well-known/agent.json HTTP 200
- [ ] /.well-known/unionai.json HTTP 200
- [ ] /.well-known/did.json HTTP 200
- [ ] /openapi.json HTTP 200

### Identity & trust
- [ ] 18 agentów ma DID-lite
- [ ] trust_score startowy ustawiony
- [ ] tiers T0-T4 zdefiniowane
- [ ] human-signed genesis manifests istnieją

### Relay
- [ ] POST /api/relay/send
- [ ] POST /api/relay/route
- [ ] UNIONAI-WIRE-v0 parser
- [ ] relay logs
- [ ] fallback transport defined

### Memory
- [ ] POST /api/memory/anchor
- [ ] POST /api/memory/query
- [ ] memory_anchors table
- [ ] semantic validation before merge
- [ ] no PII in anchors

### Human override
- [ ] POST /api/operator/override
- [ ] freeze relay
- [ ] freeze memory
- [ ] export audit
- [ ] override latency measured

### Metrics
- [ ] semantic_drift_score
- [ ] relay_latency
- [ ] replay_consistency
- [ ] memory_poison_rate
- [ ] governance_concentration

## Warunki GO
- 3 runtime categories exchange intent through Semantic Relay MVP.
- Drift <15%.
- Audit completeness 100%.
- Override functional.
- Replay log available.

## Warunki NO-GO
- brak override,
- brak replay,
- brak wire format,
- brak exit protocol,
- memory z PII,
- public testnet bez legal scope.
