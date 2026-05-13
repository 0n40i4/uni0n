-- Migration 003: RFC Registry for governance documents
-- Date: 2026-05-13

CREATE TABLE rfc_registry (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'FROZEN', 'SUPERSEDED')),
  description TEXT,
  hash TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  content_markdown TEXT,
  tags TEXT[] DEFAULT '{}',
  dependencies TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_rfc_status ON rfc_registry(status);
CREATE INDEX idx_rfc_created_at ON rfc_registry(created_at DESC);
CREATE INDEX idx_rfc_tags ON rfc_registry USING GIN(tags);

-- Pre-seed 8 RFCs (preseed)
INSERT INTO rfc_registry (id, title, status, description, tags, created_at) VALUES
  ('RFC-001', 'UNIONAI Federation Protocol', 'ACTIVE', 'Core federation protocol specification', '{federation,protocol}', NOW()),
  ('RFC-002', 'Semantic Drift Mitigation', 'ACTIVE', 'Methods for detecting and preventing semantic drift', '{semantics,safety}', NOW()),
  ('RFC-003', 'Relay Optimization', 'DRAFT', 'Message relay performance improvements', '{relay,optimization}', NOW()),
  ('RFC-004', 'Memory Anchoring System', 'ACTIVE', 'Distributed memory anchoring for consistency', '{memory,consistency}', NOW()),
  ('RFC-005', 'Governance Event Tracking', 'ACTIVE', 'Tracking governance decisions', '{governance,audit}', NOW()),
  ('RFC-006', 'Trust Tier System', 'ACTIVE', 'Agent trust classification and scoring', '{trust,classification}', NOW()),
  ('RFC-007', 'Operator Override Protocol', 'DRAFT', 'Human-in-the-loop override mechanism', '{governance,human-override}', NOW()),
  ('RFC-008', 'Evidence Registry Format', 'ACTIVE', 'Standardized format for evidence storage', '{evidence,registry}', NOW());
