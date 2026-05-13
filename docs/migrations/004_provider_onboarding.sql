-- Migration 004: Provider Onboarding System
-- Date: 2026-05-13

CREATE TABLE provider_applications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT NOT NULL,
  api_endpoint TEXT,
  confirmation_code TEXT UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewer TEXT
);

CREATE INDEX idx_provider_applications_status ON provider_applications(status);
CREATE INDEX idx_provider_applications_email ON provider_applications(email);
CREATE INDEX idx_provider_applications_confirmation_code ON provider_applications(confirmation_code);
