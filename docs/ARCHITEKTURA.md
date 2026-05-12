# UNIONAI Ω∞ Architektura

## Przegląd
UNIONAI Ω∞ MVP implementuje system semantic relay z DID-lite, memory anchors, trust tiers i human override.

## Komponenty
### Core API (Express)
- /health, /metrics
- /api/relay/send, /api/relay/route
- /api/agent/register, /api/trust/verify
- /api/memory/anchor, /api/memory/query
- /api/governance/event, /api/operator/override

### Konsola Dashboard (React + Vite)
- Kontrola zatrzymania awaryjnego
- Kontrola zamrożenia relay/memory
- Widok metryki federacji

### Usługi
- PostgreSQL: agenci, relay events, memory, trust, governance, audit logs
- Redis: routing cache, trust cache
- Qdrant: semantic vectors i intent matching

### Pakiety
- @unionai/shared: types, MVSS-v0 schema
- @unionai/trust: DID-lite, trust tiers, signatures
- @unionai/semantic: embedding, SMV projection
- @unionai/audit: JSONL logging, replay engine
