-- ============================================================================
-- UAI-P1-001 — Seed agentów testnet (leaderboard >= 3)
-- ============================================================================
-- Cel: zapewnić, że /api/leaderboard zwraca minimum 3 agentów testnet.
--
-- SCHEMAT TABELI `agents` (wykryty, NIE zgadywany):
--   Źródło 1: infra/sql/schema.sql:6-20  -> kolumny:
--     id, did, zone, provider, runtime_type, operator_did, status,
--     trust_score, trust_tier, public_key, capability_manifest,
--     created_at, last_seen
--   Źródło 2: apps/core/src/main.ts:740-744 (/api/leaderboard) SELECTuje:
--     id, did, zone, provider, trust_score, trust_tier, status,
--     created_at, last_seen  -> potwierdza ten sam schemat na live.
--   Źródło 3: apps/core/src/main.ts:975-988 (TESTNET_AGENTS_MIGRATION) wstawia
--     dokładnie te kolumny: did, zone, capability_manifest, trust_score,
--     trust_tier, status, last_seen.
--   (UWAGA: agentsTableMigration w main.ts:951 to uproszczony CREATE TABLE
--    IF NOT EXISTS — nie nadpisuje istniejącej tabeli z schema.sql, więc
--    realny schemat na live to ten z schema.sql.)
--
-- Idempotentność: ON CONFLICT (did) DO NOTHING — `did` ma UNIQUE constraint.
--
-- URUCHOMIENIE (po ACK operatora, na prod DB):
--   fly postgres connect -a unionai-core-db -f scripts/seed-testnet-agents.sql
--   LUB:
--   psql "$DATABASE_URL" -f scripts/seed-testnet-agents.sql
-- ============================================================================

INSERT INTO agents (did, zone, provider, capability_manifest, trust_score, trust_tier, status, last_seen)
VALUES
  ('did:unionai:testnet:seed-auditor-01', 'testnet', 'unionai-core',
   '{"capabilities": ["audit", "verify", "compliance"], "version": "0.3.0", "role": "Seed Auditor 01"}',
   90, 'T2', 'active', NOW()),
  ('did:unionai:testnet:seed-relay-02', 'testnet', 'unionai-core',
   '{"capabilities": ["relay", "route", "semantic-routing"], "version": "0.3.0", "role": "Seed Relay 02"}',
   78, 'T1', 'active', NOW()),
  ('did:unionai:testnet:seed-governor-03', 'testnet', 'unionai-core',
   '{"capabilities": ["governance", "oversight", "audit"], "version": "0.3.0", "role": "Seed Governor 03"}',
   82, 'T2', 'active', NOW())
ON CONFLICT (did) DO NOTHING;

-- Weryfikacja (opcjonalnie, po wykonaniu):
--   SELECT did, zone, trust_score, trust_tier, status FROM agents
--   WHERE did LIKE 'did:unionai:testnet:seed-%' ORDER BY trust_score DESC;
