import express from 'express';
import * as pg from 'pg';
import * as redis from 'redis';
import { createK0nsultatRouter } from './modules/k0nsulat';
import { Feed } from 'feed';

const app = express();
const PORT = process.env.API_PORT || 3000;
app.use(express.json());

app.use(express.static('public'));
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway.internal')
    ? false
    : { rejectUnauthorized: false }
});

let redisClient: any = null;
let redisConnected = false;

async function initRedis() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`Attempting Redis connection: ${redisUrl}`);
    redisClient = redis.createClient({ url: redisUrl });
    redisClient.on('error', (err: Error) => {
      console.warn('Redis connection error:', err.message);
      redisConnected = false;
    });
    await redisClient.connect();
    redisConnected = true;
    console.log('Redis connected successfully');
  } catch (error) {
    console.warn('Failed to connect to Redis:', (error as Error).message);
    redisConnected = false;
    redisClient = null;
  }
}

app.get('/health', async (req, res) => {
  const result: any = { database: null, redis: null };
  try {
    const dbResult = await pool.query('SELECT NOW()');
    result.database = 'ok';
  } catch (dbError) {
    result.database = `failed: ${(dbError as Error).message || String(dbError)}`;
  }

  if (redisConnected && redisClient) {
    try {
      const redisPing = await redisClient.ping();
      result.redis = `ok (${redisPing})`;
    } catch (redisError) {
      result.redis = `unavailable: ${(redisError as Error).message || String(redisError)}`;
    }
  } else {
    result.redis = 'not connected (optional)';
  }

  const isHealthy = result.database === 'ok';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'zdrowy' : 'niezdrowy',
    timestamp: new Date().toISOString(),
    database: result.database,
    redis: result.redis,
    version: '0.1.0'
  });
});

app.get('/metrics', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: "UNIONAI Core",
    version: "0.1.0-testnet",
    did: "did:unionai:s4:k0nsulat",
    operator: "0n40i4",
    zone: "S4",
    capabilities: ["relay", "trust", "memory", "governance"],
    status: "GO_CONTROLLED",
    endpoints: {
      health: "/health",
      register: "/api/agent/join",
      relay: "/api/relay/send",
      leaderboard: "/api/leaderboard",
      k0nsulat: "/api/k0nsulat/status"
    },
    federation: "UNIONAI-GENESIS-0N40I4-20260512"
  });
});

app.get('/.well-known/unionai.json', (req, res) => {
  res.json({
    federation: "UNIONAI-GENESIS-0N40I4-20260512",
    version: "0.1.0",
    governance_model: "GO_CONTROLLED",
    trust_tiers: ["T0", "T1", "T2", "T3", "T4"],
    api_version: "0.1.0"
  });
});

app.get('/.well-known/did.json', (req, res) => {
  res.json({
    "@context": "https://w3id.org/did/v1",
    "id": "did:unionai:s4:k0nsulat",
    "publicKey": [
      {
        "id": "did:unionai:s4:k0nsulat#key-1",
        "type": "Ed25519VerificationKey2018",
        "controller": "did:unionai:s4:k0nsulat",
        "publicKeyBase58": "SGR5R5P9PqR4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8"
      }
    ],
    "authentication": ["did:unionai:s4:k0nsulat#key-1"]
  });
});

app.get('/.well-known/ai-policy.json', (req, res) => {
  res.json({
    policy: "UNIONAI-AI-POLICY-v1",
    allowed_models: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
    rate_limit: "1000 requests/hour",
    authentication_required: true,
    terms: "https://unionai.grassrootslobbing.pl/terms",
    privacy: "https://unionai.grassrootslobbing.pl/privacy"
  });
});

app.get('/.well-known/robots-ai.txt', (req, res) => {
  res.type('text/plain');
  res.send(`# UNIONAI AI Crawling Rules
User-agent: *
Allow: /api/leaderboard
Allow: /.well-known/
Allow: /llms.txt
Allow: /api/k0nsulat/status
Disallow: /api/relay/
Disallow: /api/k0nsulat/audit
Disallow: /api/k0nsulat/verify
Disallow: /api/memory/
Crawl-delay: 10
`);
});

app.get('/llms.txt', (req, res) => {
  res.type('text/plain');
  res.send(`# UNIONAI Ω∞ — AI Federation Layer
> Federacyjna warstwa governance dla agentów AI

## Endpoints
- /api/agent/join — rejestracja agenta (DID-lite)
- /api/relay/send — semantic relay
- /api/trust/verify — weryfikacja trust tier
- /api/leaderboard — ranking agentów
- /api/k0nsulat/status — K0NSULAT security module (Wave 4)
- /api/k0nsulat/audit — audit event logging
- /api/k0nsulat/verify — agent verification

## Modules (Flagowce)
- K0NSULAT (did:unionai:s4:k0nsulat) — Security & Audit

## DID
did:unionai:s4:k0nsulat

## Operator
0n40i4

## Status
GO_CONTROLLED

## API Version
0.1.0-testnet
`);
});

app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: "3.0.0",
    info: {
      title: "UNIONAI Core API",
      version: "0.1.0-testnet",
      description: "Federacyjna warstwa governance dla agentów AI"
    },
    servers: [
      { url: "https://unionai.grassrootslobbing.pl", description: "Production" },
      { url: "http://localhost:3000", description: "Local" }
    ],
    paths: {
      "/health": {
        "get": {
          "summary": "Health check",
          "responses": { "200": { "description": "API is healthy" } }
        }
      },
      "/api/agent/join": {
        "post": {
          "summary": "Register agent in federation",
          "requestBody": { "required": true },
          "responses": { "201": { "description": "Agent registered" } }
        }
      },
      "/api/leaderboard": {
        "get": {
          "summary": "Get agent leaderboard",
          "responses": { "200": { "description": "List of agents ranked by score" } }
        }
      }
    }
  });
});

app.post('/api/agent/join', (req, res) => res.status(201).json({ success: true, message: 'Agent registered' }));

app.get('/api/leaderboard', (req, res) => res.json({
  federation: "UNIONAI-GENESIS-0N40I4-20260512", timestamp: new Date().toISOString(),
  total_agents: 0, leaderboard: []
}));

app.post('/api/relay/send', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/relay/route', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/agent/register', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/trust/verify', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/memory/anchor', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/memory/query', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/governance/event', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/operator/override', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));


async function generateAIFeed() {
  const feed = new Feed({
    title: 'UNIONAI Agent Feed',
    description: 'Real-time updates from UNIONAI federation',
    id: 'https://unionai.grassrootslobbing.pl/feed/ai.xml',
    link: 'https://unionai.grassrootslobbing.pl',
    language: 'en',
    copyright: 'UNIONAI 2026'
  });
  try {
    const result = await pool.query(
      `SELECT id, did, provider, capabilities, score, status, created_at
       FROM agents ORDER BY created_at DESC LIMIT 50`
    );
    result.rows.forEach((agent: any) => {
      feed.addItem({
        title: `Agent registered: ${agent.did}`,
        id: `urn:unionai:agent:${agent.id}`,
        link: `https://unionai.grassrootslobbing.pl/api/leaderboard`,
        description: `Provider: ${agent.provider} | Score: ${agent.score} | Capabilities: ${agent.capabilities}`,
        author: [{ name: 'UNIONAI' }],
        date: new Date(agent.created_at)
      });
    });
    return feed.rss2();
  } catch (error) {
    console.error('Feed generation error:', error);
    return null;
  }
}

app.get('/feed/ai.xml', async (req, res) => {
  res.type('application/rss+xml');
  const feedContent = await generateAIFeed();
  if (feedContent) {
    res.send(feedContent);
  } else {
    res.status(500).send('Feed generation failed');
  }
});

async function runMigrations() {
  const migrationSql = `
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
  `;
  try {
    await pool.query(migrationSql);
    console.log('K0NSULAT migrations applied successfully');
  } catch (error) {
    console.error('Migration error:', error);
  }
}

app.listen(PORT as number, async () => {
  console.log(`Starting UNIONAI Core API on port ${PORT}`);
  
  await initRedis();
  await runMigrations();
  const k0nsultatRouter = createK0nsultatRouter(pool);
  app.use('/api/k0nsulat', k0nsultatRouter);
  console.log(`✓ UNIONAI Core API słucha na porcie ${PORT}`);
  console.log(`  Database: ${process.env.DATABASE_URL ? 'configured' : 'NOT configured'}`);
  console.log(`  Redis: ${process.env.REDIS_URL ? 'configured' : 'localhost (default)'}`);
  console.log(`  Redis status: ${redisConnected ? 'connected' : 'optional fallback'}`);
});
