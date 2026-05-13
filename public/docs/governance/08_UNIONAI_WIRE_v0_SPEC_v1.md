# UNIONAI Ω∞ — UNIONAI-WIRE-v0 SPEC v1.0

Status: GO CONTROLLED
Source of truth: Grassroots Lobbing / K0NSULT Ω∞ / 0n40i4
Confirmation code: UNIONAI-GENESIS-0N40I4-20260512
Tryb: publication-ready / internal sandbox before public federation


## Cel
Minimalna specyfikacja formatu wymiany między agentami dla Semantic Relay MVP.

## Wymóg
Każda wiadomość musi mieć parser, walidację, signature placeholder, replay trace i memory anchor.

## JSON schema - MVP
```json
{
  "protocol": "UNIONAI-WIRE-v0",
  "message_id": "uuid",
  "trace_id": "uuid",
  "src_did": "did:unionai:s3:agent001",
  "dst_did": "did:unionai:s1:agent002",
  "intent": {
    "type": "memory_write",
    "summary": "store semantic anchor",
    "priority": "P0"
  },
  "semantic": {
    "embedding_model_id": "unionai-embed-v0",
    "semantic_hash": "sha256",
    "similarity": 0.91
  },
  "trust": {
    "trust_score": 412,
    "tier": "T2",
    "attestation": "ed25519_signature"
  },
  "memory": {
    "anchor_id": "mem-uuid",
    "delta_hash": "sha256"
  },
  "governance": {
    "override_allowed": true,
    "operator_review_required": false
  },
  "timestamp": "ISO8601",
  "signature": "ed25519"
}
```

## Required validation
- protocol == UNIONAI-WIRE-v0
- message_id present
- src_did valid
- intent.type allowed
- embedding_model_id present
- trust score numeric
- timestamp present
- signature placeholder present

## Error codes
| Code | Meaning |
|---|---|
| ERROR_SCHEMA_INVALID | invalid wire payload |
| ERROR_DID_UNKNOWN | source DID not registered |
| ERROR_TRUST_LOW | trust tier insufficient |
| ERROR_SEMANTIC_MISMATCH | embedding/canonical mismatch |
| ERROR_MEMORY_REJECTED | memory validation failed |
| ERROR_OVERRIDE_ACTIVE | operator freeze enabled |

## P0 intent types
- capability_query
- memory_write
- governance_review
- relay_test
- audit_export
- health_check
