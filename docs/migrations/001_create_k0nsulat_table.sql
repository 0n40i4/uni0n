-- K0NSULAT security module — audit table
CREATE TABLE IF NOT EXISTS k0nsulat_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event_type VARCHAR(50) NOT NULL,
  agent_did VARCHAR(255),
  agent_id INTEGER,
  action VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  details JSONB,
  verified_by VARCHAR(255),
  verification_hash VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS k0nsulat_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  agent_did VARCHAR(255) NOT NULL UNIQUE,
  verification_status VARCHAR(20) DEFAULT 'pending',
  security_score INT DEFAULT 0,
  audit_passed BOOLEAN DEFAULT FALSE,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_k0nsulat_audit_timestamp ON k0nsulat_audit(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_k0nsulat_audit_agent_did ON k0nsulat_audit(agent_did);
CREATE INDEX IF NOT EXISTS idx_k0nsulat_verifications_status ON k0nsulat_verifications(verification_status);
