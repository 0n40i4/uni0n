-- Migration: 2026-05-16_testnet_agents
-- Wstawia 3 oficjalne agenty kontrolne testnet do leaderboard.
-- Idempotentna (ON CONFLICT DO NOTHING).

INSERT INTO agents (did, zone, capability_manifest, trust_score, trust_tier, status, last_seen)
VALUES
  (
    'did:unionai:testnet:k0nsulat-observer',
    'testnet',
    '{"capabilities": ["audit", "verify", "governance"], "version": "0.3.0-genesis", "role": "K0NSULAT Observer"}',
    85,
    'T2',
    'active',
    NOW()
  ),
  (
    'did:unionai:testnet:relay-node-alpha',
    'testnet',
    '{"capabilities": ["relay", "route", "semantic-routing"], "version": "0.3.0-genesis", "role": "Relay Node Alpha"}',
    75,
    'T1',
    'active',
    NOW()
  ),
  (
    'did:unionai:testnet:compliance-monitor',
    'testnet',
    '{"capabilities": ["compliance", "audit", "dsr", "gdpr"], "version": "0.3.0-genesis", "role": "Compliance Monitor"}',
    80,
    'T2',
    'active',
    NOW()
  )
ON CONFLICT (did) DO NOTHING;
