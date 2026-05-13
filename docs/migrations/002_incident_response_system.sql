-- Migration 002: Incident Response System tables
-- Date: 2026-05-13

CREATE TABLE IF NOT EXISTS incident_reports (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MAJOR', 'CRITICAL')),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FROZEN', 'RESOLVED', 'EXPORTED')),
  description TEXT,
  incident_type VARCHAR(100),
  hash TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incident_actions (
  id SERIAL PRIMARY KEY,
  incident_id INT NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  action VARCHAR(200) NOT NULL,
  actor VARCHAR(255),
  actor_did VARCHAR(255),
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_severity ON incident_reports(severity);
CREATE INDEX IF NOT EXISTS idx_incident_reports_hash ON incident_reports(hash);
CREATE INDEX IF NOT EXISTS idx_incident_actions_incident_id ON incident_actions(incident_id);
