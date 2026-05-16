-- GDPR DSR (Data Subject Request) table
-- Migration: 005_dsr_requests
-- Date: 2026-05-16

CREATE TABLE IF NOT EXISTS dsr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  did TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('access','delete','portability')),
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsr_requests_did ON dsr_requests(did);
CREATE INDEX IF NOT EXISTS idx_dsr_requests_status ON dsr_requests(status);
