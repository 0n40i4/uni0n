-- ============================================================================
-- UAI-P1-002 — Seed completed audytów (minimum 1 completed audit)
-- ============================================================================
-- Cel: zapewnić, że /api/k0nsulat/status i /api/k0nsulat/audits pokazują
--      minimum 1 completed audit z realnymi danymi (bez polegania na
--      fallbacku genesis w kodzie).
--
-- SCHEMAT TABELI `k0nsulat_audit` (wykryty, NIE zgadywany):
--   Źródło 1: docs/migrations/001_create_k0nsulat_table.sql:2-13
--   Źródło 2: apps/core/src/main.ts:834-845 (runMigrations, identyczny)
--   Kolumny:
--     id              UUID PK DEFAULT gen_random_uuid()
--     timestamp       TIMESTAMPTZ DEFAULT NOW()
--     event_type      VARCHAR(50)  NOT NULL
--     agent_did       VARCHAR(255)
--     agent_id        INTEGER
--     action          VARCHAR(255) NOT NULL
--     status          VARCHAR(20)  DEFAULT 'pending'   -- 'completed' = ukończony
--     details         JSONB
--     verified_by     VARCHAR(255)
--     verification_hash VARCHAR(64)
--
-- Idempotentność: tabela nie ma naturalnego klucza biznesowego (id = losowy
--   UUID), więc używamy strażnika WHERE NOT EXISTS na (event_type, action),
--   aby ponowne uruchomienie nie tworzyło duplikatów seed-audytów.
--
-- URUCHOMIENIE (po ACK operatora, na prod DB):
--   fly postgres connect -a unionai-core-db -f scripts/seed-testnet-audits.sql
--   LUB:
--   psql "$DATABASE_URL" -f scripts/seed-testnet-audits.sql
-- ============================================================================

-- Genesis audit modułu K0NSULAT (completed)
INSERT INTO k0nsulat_audit
  (event_type, agent_did, action, status, details, verified_by, verification_hash)
SELECT
  'module_bootstrap',
  'did:unionai:s4:k0nsulat',
  'K0NSULAT module bootstrap audit',
  'completed',
  '{"seed": true, "verdict": "verified", "note": "Genesis completed audit (UAI-P1-002)"}'::jsonb,
  'did:unionai:s4:k0nsulat',
  'genesis0000000000000000000000000000000000000000000000000000000a'
WHERE NOT EXISTS (
  SELECT 1 FROM k0nsulat_audit
  WHERE event_type = 'module_bootstrap'
    AND action = 'K0NSULAT module bootstrap audit'
);

-- Completed audit weryfikacji agenta testnet (powiązany z seed-testnet-agents.sql)
INSERT INTO k0nsulat_audit
  (event_type, agent_did, action, status, details, verified_by, verification_hash)
SELECT
  'agent_verification',
  'did:unionai:testnet:seed-auditor-01',
  'Agent verified with score 90 — verified',
  'completed',
  '{"seed": true, "security_score": 90, "verification_status": "verified", "audit_passed": true}'::jsonb,
  'did:unionai:s4:k0nsulat',
  'seedaudit01000000000000000000000000000000000000000000000000000b'
WHERE NOT EXISTS (
  SELECT 1 FROM k0nsulat_audit
  WHERE event_type = 'agent_verification'
    AND agent_did = 'did:unionai:testnet:seed-auditor-01'
);

-- Weryfikacja (opcjonalnie, po wykonaniu):
--   SELECT id, event_type, agent_did, status FROM k0nsulat_audit
--   WHERE status = 'completed' ORDER BY timestamp DESC;
