-- UNIONAI Ω∞ Schema (P0)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  did VARCHAR(255) UNIQUE NOT NULL,
  zone VARCHAR(50) NOT NULL,
  provider VARCHAR(100),
  runtime_type VARCHAR(100),
  operator_did VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  trust_score INT DEFAULT 0,
  trust_tier VARCHAR(10) DEFAULT 'T0',
  public_key TEXT,
  capability_manifest JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);

-- relay_events table
CREATE TABLE relay_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intent_id UUID NOT NULL,
  src_did VARCHAR(255) NOT NULL,
  dst_did VARCHAR(255) NOT NULL,
  route_status VARCHAR(50),
  semantic_score FLOAT,
  fallback_used BOOLEAN DEFAULT FALSE,
  trace_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- memory_anchors table
CREATE TABLE memory_anchors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anchor_id VARCHAR(255) UNIQUE NOT NULL,
  scope VARCHAR(50) DEFAULT 'PUBLIC',
  source_did VARCHAR(255),
  semantic_hash VARCHAR(255),
  delta_hash VARCHAR(255),
  trust_tier_required VARCHAR(10),
  validation_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- trust_events table
CREATE TABLE trust_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  did VARCHAR(255) NOT NULL,
  event_type VARCHAR(100),
  previous_score INT,
  new_score INT,
  reason TEXT,
  signature TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- governance_events table
CREATE TABLE governance_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trace_id VARCHAR(255),
  event_type VARCHAR(100),
  operator_did VARCHAR(255),
  target VARCHAR(255),
  action VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trace_id VARCHAR(255),
  event_type VARCHAR(100),
  payload_hash VARCHAR(255),
  jsonl_path VARCHAR(500),
  signature TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- rfc_registry table
CREATE TABLE rfc_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfc_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500),
  status VARCHAR(50),
  version VARCHAR(50),
  owner VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agents_did ON agents(did);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_relay_events_intent_id ON relay_events(intent_id);
CREATE INDEX idx_relay_events_trace_id ON relay_events(trace_id);
CREATE INDEX idx_memory_anchors_anchor_id ON memory_anchors(anchor_id);
CREATE INDEX idx_memory_anchors_scope ON memory_anchors(scope);
CREATE INDEX idx_trust_events_did ON trust_events(did);
CREATE INDEX idx_governance_events_trace_id ON governance_events(trace_id);
CREATE INDEX idx_audit_logs_trace_id ON audit_logs(trace_id);
