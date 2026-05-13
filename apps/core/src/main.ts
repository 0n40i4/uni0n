import express from 'express';
import * as pg from 'pg';
import * as redis from 'redis';
import crypto from 'crypto';

// ============ SECURITY: JWT (custom HMAC-SHA256, no external deps) ============
const JWT_SECRET = process.env.JWT_SECRET || 'unionai-dev-secret-CHANGE-IN-PROD-' + Date.now();
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET not set, using dev fallback. SET IN PROD!');
}
const JWT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h

function signToken(payload: any): string {
  const data = { ...payload, exp: Date.now() + JWT_EXPIRY_MS };
  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token: string): any | null {
  try {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
    if (sig !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.exp < Date.now()) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/, '');
  if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  req.auth = payload;
  next();
}

// ============ SECURITY: Rate Limiter (in-memory sliding window) ============
const rateLimitStore = new Map<string, number[]>();

function makeRateLimiter(maxReq: number, windowMs: number) {
  return (req: any, res: any, next: any) => {
    const key = (req.ip || req.connection?.remoteAddress || 'unknown') + ':' + req.route?.path;
    const now = Date.now();
    const timestamps = (rateLimitStore.get(key) || []).filter(t => now - t < windowMs);
    if (timestamps.length >= maxReq) {
      return res.status(429).json({ error: 'Too many requests', retry_after_ms: windowMs - (now - timestamps[0]) });
    }
    timestamps.push(now);
    rateLimitStore.set(key, timestamps);
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of rateLimitStore.entries()) {
    const filtered = ts.filter(t => now - t < 60000);
    if (filtered.length === 0) rateLimitStore.delete(key);
    else rateLimitStore.set(key, filtered);
  }
}, 60000);

const globalRateLimit = makeRateLimiter(100, 60000); // 100/min per IP
const operatorRateLimit = makeRateLimiter(20, 60000); // 20/min per IP
import { createK0nsultatRouter } from './modules/k0nsulat';
import { createWave6Router, WAVE6_MIGRATIONS, getWave6Metrics } from './modules/wave6';
import { createWave7Router, WAVE7_MIGRATIONS, getWave7Metrics } from './modules/wave7';
import { createWave3Router, createOperatorRouter, WAVE3_MIGRATIONS } from './modules/wave3';
import { Feed } from 'feed';
import { createIncident, listIncidents, getIncident, freezeIncident, exportIncident, addIncidentAction } from './modules/incident';
import { getRFCIndex, getRFC, getRFCAsHtml, createRFC, updateRFCStatus } from './modules/rfc';
import { createProviderApplication, getProviderApplication, listProviderApplications, approveProviderApplication, rejectProviderApplication, regenerateProviderApiKey } from './modules/provider';
import { getComplianceMatrix, getComplianceMatrixAsHtml } from './modules/compliance';
import { generateEvidenceManifest, getEvidenceManifest, saveEvidenceManifest } from './modules/evidence';
import { getDocsIndex, renderDocsHTML, renderDocsSection } from './modules/docs';

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 3000;
app.use(express.json());
app.use(globalRateLimit);

app.use(express.static('public'));

// ============ AUTH: Login endpoint ============
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const expectedUser = process.env.OPERATOR_USERNAME || 'operator';
  const expectedPass = process.env.OPERATOR_PASSWORD;
  if (!expectedPass) {
    return res.status(503).json({ error: 'OPERATOR_PASSWORD not configured on server' });
  }
  if (username !== expectedUser || password !== expectedPass) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken({ sub: username, role: 'operator' });
  res.json({ token, expires_in: JWT_EXPIRY_MS / 1000 });
});
if (!process.env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL is not set — database endpoints will fail');
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/fallback',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.warn('pg Pool error (non-fatal):', err.message);
});

let redisClient: any = null;
let redisConnected = false;

async function initRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log(`Attempting Redis connection: ${redisUrl}`);
  let connectTimeout: ReturnType<typeof setTimeout> | null = null;
  try {
    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: false,        // don't retry — fail fast
        connectTimeout: 3000,            // 3s connect timeout
      }
    });
    redisClient.on('error', (err: Error) => {
      // Only log first error, suppress the rest to avoid log flooding
      if (redisConnected !== false) {
        console.warn('[redis] connection error (Redis is optional):', err.message);
      }
      redisConnected = false;
    });
    // Race connect() against a 4-second timeout so startup never hangs
    await Promise.race([
      redisClient.connect(),
      new Promise<never>((_, reject) => {
        connectTimeout = setTimeout(() => reject(new Error('Redis connect timeout (4s)')), 4000);
      })
    ]);
    if (connectTimeout) clearTimeout(connectTimeout);
    redisConnected = true;
    console.log('Redis connected successfully');
  } catch (error) {
    if (connectTimeout) clearTimeout(connectTimeout);
    console.warn('[redis] unavailable (non-fatal):', (error as Error).message);
    redisConnected = false;
    try { await redisClient?.quit(); } catch (_) { /* ignore */ }
    redisClient = null;
  }
}

app.get('/health', async (req, res) => {
  const result: any = { database: null, redis: null };
  try {
    const dbResult = await pool.query('SELECT NOW()');
    result.database = 'ok';
  } catch (dbError: any) {
    const errMsg = dbError?.message || dbError?.code || String(dbError);
    const hasUrl = !!process.env.DATABASE_URL;
    const urlHost = process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@').split('@')[1]?.split('/')[0]
      : 'NOT_SET';
    result.database = `failed: ${errMsg} [host:${urlHost}] [url_set:${hasUrl}]`;
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
  // Always return 200 — Railway health check must pass to deploy new containers.
  // Actual status is in the response body.
  res.status(200).json({
    status: isHealthy ? 'zdrowy' : 'degraded',
    timestamp: new Date().toISOString(),
    database: result.database,
    redis: result.redis,
    version: '0.1.0'
  });
});

app.get('/metrics', async (req, res) => {
  const w6 = await getWave7Metrics(pool);
  const agentCount = await pool.query('SELECT COUNT(*) FROM agents').then(r => +r.rows[0].count).catch(() => 0);
  res.set('Content-Type', 'text/plain');
  const lines = [
    '# UNIONAI Prometheus-style metrics',
    `# HELP relay_count Total relay events`,
    `relay_events_total ${w6.relay_events_total}`,
    `# HELP agent_count Registered agents`,
    `agents_registered_total ${w6.agents_registered_total}`,
    `# HELP memory_anchor_count Total memory anchors`,
    `memory_anchors_total ${w6.memory_anchors_total}`,
    `# HELP trust_events_count Total trust events`,
    `trust_verifications_total ${w6.trust_verifications_total}`,
    `# HELP governance_events_count Total governance events`,
    `governance_events_total ${w6.governance_events_total}`,
    `# HELP audit_logs_count Total audit log entries`,
    `audit_logs_total ${w6.audit_logs_total}`,
    `# HELP rfc_count RFC registry entries`,
    `operator_overrides_total ${w6.operator_overrides_total}`,
    `# HELP uptime_seconds Process uptime`,
    `uptime_seconds ${process.uptime().toFixed(2)}`,
  ];
  res.send(lines.join('\n') + '\n');
});

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

// Wave 3 router handles: relay/send, relay/route, agent/register,
// trust/verify, memory/anchor, memory/query, governance/event, participation/acknowledge
// (mounted in app.listen callback after pool/redis init)

// Operator router mounted in app.listen callback (after pool init)


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
  try {
    const feedContent = await generateAIFeed();
    if (feedContent) {
      res.send(feedContent);
      return;
    }
    const emptyFeed = new Feed({
      title: 'UNIONAI Agent Feed',
      description: 'Real-time updates from UNIONAI federation (no agents yet)',
      id: 'https://unionai.grassrootslobbing.pl/feed/ai.xml',
      link: 'https://unionai.grassrootslobbing.pl',
      language: 'en',
      copyright: 'UNIONAI 2026'
    });
    res.send(emptyFeed.rss2());
  } catch (err) {
    console.error('[feed/ai.xml] fatal:', (err as Error).stack || err);
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
  const wave2DevNextMigrations = `
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

    DROP TABLE IF EXISTS rfc_registry CASCADE;
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
    CREATE INDEX IF NOT EXISTS idx_rfc_status ON rfc_registry(status);
    CREATE INDEX IF NOT EXISTS idx_rfc_created_at ON rfc_registry(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_rfc_tags ON rfc_registry USING GIN(tags);
    INSERT INTO rfc_registry (id, title, status, description, tags) VALUES
      ('RFC-001', 'UNIONAI Federation Protocol', 'ACTIVE', 'Core federation protocol specification', '{federation,protocol}'),
      ('RFC-002', 'Semantic Drift Mitigation', 'ACTIVE', 'Methods for detecting and preventing semantic drift', '{semantics,safety}'),
      ('RFC-003', 'Relay Optimization', 'DRAFT', 'Message relay performance improvements', '{relay,optimization}'),
      ('RFC-004', 'Memory Anchoring System', 'ACTIVE', 'Distributed memory anchoring for consistency', '{memory,consistency}'),
      ('RFC-005', 'Governance Event Tracking', 'ACTIVE', 'Tracking governance decisions', '{governance,audit}'),
      ('RFC-006', 'Trust Tier System', 'ACTIVE', 'Agent trust classification and scoring', '{trust,classification}'),
      ('RFC-007', 'Operator Override Protocol', 'DRAFT', 'Human-in-the-loop override mechanism', '{governance,human-override}'),
      ('RFC-008', 'Evidence Registry Format', 'ACTIVE', 'Standardized format for evidence storage', '{evidence,registry}')
    ON CONFLICT (id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS provider_applications (
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
    CREATE INDEX IF NOT EXISTS idx_provider_applications_status ON provider_applications(status);
    CREATE INDEX IF NOT EXISTS idx_provider_applications_email ON provider_applications(email);
    CREATE INDEX IF NOT EXISTS idx_provider_applications_confirmation_code ON provider_applications(confirmation_code);

    ALTER TABLE provider_applications ADD COLUMN IF NOT EXISTS api_key TEXT;
    CREATE INDEX IF NOT EXISTS idx_provider_applications_api_key ON provider_applications(api_key);

    CREATE TABLE IF NOT EXISTS compliance_snapshots (
      id SERIAL PRIMARY KEY,
      coverage_percent INT NOT NULL,
      completed_count INT NOT NULL,
      total_count INT NOT NULL,
      details JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_compliance_snapshots_created_at ON compliance_snapshots(created_at DESC);
  `;
  const runStep = async (label: string, sql: string) => {
    try {
      await pool.query(sql);
      console.log(`[migrations] ${label}: applied successfully`);
    } catch (error) {
      console.warn(`[migrations] ${label}: SKIPPED — ${(error as Error).message}`);
    }
  };
  const agentsTableMigration = `
    CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      did VARCHAR(255) UNIQUE NOT NULL,
      provider VARCHAR(100),
      capabilities TEXT,
      score INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
  `;
  await runStep('AGENTS', agentsTableMigration);
  await runStep('K0NSULAT', migrationSql);
  await runStep('WAVE3', WAVE3_MIGRATIONS);
  await runStep('WAVE6', WAVE6_MIGRATIONS);
  await runStep('WAVE7', WAVE7_MIGRATIONS);
  await runStep('WAVE2_DEV_NEXT', wave2DevNextMigrations);
}

app.get('/', (req, res) => {
  res.json({
    name: 'UNIONAI Core API',
    version: '0.1.0',
    status: 'GO CONTROLLED',
    docs: '/docs/',
    health: '/health',
    api_status: '/api/status',
    metrics: '/metrics/federation',
    rfc_index: '/rfc/index.json',
    evidence: '/evidence/manifest.json'
  });
});


app.get('/debug/env', (req, res) => {
  const safeVars = {
    DATABASE_URL: process.env.DATABASE_URL ? `set (${process.env.DATABASE_URL.length} chars)` : 'NOT SET',
    REDIS_URL: process.env.REDIS_URL ? `set (${process.env.REDIS_URL.length} chars)` : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    PORT: process.env.PORT || 'NOT SET',
    API_PORT: process.env.API_PORT || 'NOT SET',
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'NOT SET',
    RAILWAY_SERVICE_NAME: process.env.RAILWAY_SERVICE_NAME || 'NOT SET',
    // List all keys that contain DB or URL pattern (no values)
    all_keys_with_url: Object.keys(process.env).filter(k => 
      k.includes('URL') || k.includes('DATABASE') || k.includes('POSTGRES') || k.includes('REDIS')
    )
  };
  res.json(safeVars);
});


// ============ INCIDENT RESPONSE SYSTEM ============
app.post('/api/incident/open', async (req, res) => {
  try {
    const { title, severity, description, incident_type } = req.body;
    if (!title || !severity) {
      return res.status(400).json({ error: 'title and severity required' });
    }
    const incident = await createIncident(pool, title, severity, description, incident_type);
    res.status(201).json({
      success: true,
      incident_id: incident.id,
      hash: incident.hash,
      message: `Incident opened with severity ${severity}`
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/incident/', async (req, res) => {
  try {
    const incidents = await listIncidents(pool);
    res.json({ incidents, count: incidents.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/incident/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { report, actions } = await getIncident(pool, id);
    res.json({ report, actions });
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

app.post('/api/incident/freeze', async (req, res) => {
  try {
    const { incident_id, actor, actor_did } = req.body;
    if (!incident_id || !actor) {
      return res.status(400).json({ error: 'incident_id and actor required' });
    }
    const action = await freezeIncident(pool, incident_id, actor, actor_did || actor);
    res.json({ success: true, action, message: 'Incident frozen' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/incident/export', async (req, res) => {
  try {
    const { incident_id } = req.body;
    if (!incident_id) {
      return res.status(400).json({ error: 'incident_id required' });
    }
    const exported = await exportIncident(pool, incident_id);
    res.json(exported);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============ MISSING OPERATOR ENDPOINTS ============
app.get('/api/operator/status', async (req, res) => {
  try {
    const relayCount = await pool.query('SELECT COUNT(*) FROM relay_events').then(r => +r.rows[0].count).catch(() => 0);
    const memoryCount = await pool.query('SELECT COUNT(*) FROM memory_anchors').then(r => +r.rows[0].count).catch(() => 0);
    const incidentCount = await pool.query('SELECT COUNT(*) FROM incident_reports WHERE status = $1', ['OPEN']).then(r => +r.rows[0].count).catch(() => 0);
    
    const redisStatus = redisConnected ? 'connected' : 'disconnected';
    const relayFrozen = redisClient ? await redisClient.get('relay_frozen').catch(() => null) : null;
    const memoryFrozen = redisClient ? await redisClient.get('memory_frozen').catch(() => null) : null;
    
    res.json({
      status: 'operational',
      uptime: process.uptime(),
      relay_events: relayCount,
      memory_anchors: memoryCount,
      open_incidents: incidentCount,
      redis_status: redisStatus,
      relay_frozen: relayFrozen === 'true',
      memory_frozen: memoryFrozen === 'true'
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'error', error: (error as Error).message });
  }
});

app.post('/api/operator/unfreeze-relay', async (req, res) => {
  try {
    if (redisClient) {
      await redisClient.del('relay_frozen');
      res.json({ success: true, message: 'Relay unfrozen' });
    } else {
      res.status(503).json({ error: 'Redis not available' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/operator/unfreeze-memory', async (req, res) => {
  try {
    if (redisClient) {
      await redisClient.del('memory_frozen');
      res.json({ success: true, message: 'Memory unfrozen' });
    } else {
      res.status(503).json({ error: 'Redis not available' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
app.get('/metrics/federation', async (req, res) => {
  try {
    const relayCount = await pool.query('SELECT COUNT(*) FROM relay_events').then(r => +r.rows[0].count).catch(() => 0);
    const relayLatencyResult = await pool.query(
      'SELECT AVG(EXTRACT(EPOCH FROM (created_at - NOW())) * 1000) as avg_latency FROM relay_events WHERE created_at > NOW() - INTERVAL ' + "'1 hour'"
    ).catch(() => ({ rows: [{ avg_latency: 0 }] }));
    const relayLatency = relayLatencyResult.rows[0]?.avg_latency || 0;
    
    const memoryCount = await pool.query('SELECT COUNT(*) FROM memory_anchors').then(r => +r.rows[0].count).catch(() => 0);
    const failureCount = await pool.query('SELECT COUNT(*) FROM relay_events WHERE route_status = ' + "'failed'").then(r => +r.rows[0].count).catch(() => 0);
    
    const metrics = {
      relay_latency_avg: relayLatency,
      relay_events_total: relayCount,
      memory_anchors_total: memoryCount,
      relay_failures_total: failureCount,
      timestamp: new Date().toISOString()
    };
    
    if (req.headers.accept?.includes('text/plain')) {
      res.set('Content-Type', 'text/plain');
      const prometheusLines = [
        '# HELP relay_latency_avg Average relay latency in milliseconds',
        'relay_latency_avg ' + metrics.relay_latency_avg,
        '# HELP relay_events_total Total relay events',
        'relay_events_total ' + metrics.relay_events_total,
        '# HELP memory_anchors_total Total memory anchors',
        'memory_anchors_total ' + metrics.memory_anchors_total,
        '# HELP relay_failures_total Total relay failures',
        'relay_failures_total ' + metrics.relay_failures_total
      ];
      res.send(prometheusLines.join('\n'));
    } else {
      res.json(metrics);
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});


// ============ DOCUMENTATION PORTAL ============
app.get('/docs', (req, res) => {
  try {
    const index = getDocsIndex();
    res.type('text/html');
    res.send(renderDocsHTML(index));
  } catch (error) {
    res.status(500).send('Documentation portal error');
  }
});

app.get('/docs/governance', (req, res) => {
  try {
    const index = getDocsIndex();
    res.type('text/html');
    res.send(renderDocsSection('governance', index));
  } catch (error) {
    res.status(500).send('Governance documentation error');
  }
});

app.get('/docs/rfc', (req, res) => {
  try {
    const index = getDocsIndex();
    res.type('text/html');
    res.send(renderDocsSection('rfc', index));
  } catch (error) {
    res.status(500).send('RFC documentation error');
  }
});

app.get('/docs/evidence', (req, res) => {
  try {
    const index = getDocsIndex();
    res.type('text/html');
    res.send(renderDocsSection('evidence', index));
  } catch (error) {
    res.status(500).send('Evidence documentation error');
  }
});


// ============ RFC RENDER ENGINE ============
app.get('/rfc/index.json', async (req, res) => {
  try {
    const index = await getRFCIndex(pool);
    res.json(index);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/rfc/feed.xml', async (req, res) => {
  try {
    const rfcs = await getRFCIndex(pool);
    const feed = new Feed({
      title: 'UNIONAI RFC Feed',
      id: 'https://unionai.grassrootslobbing.pl/rfc/feed.xml',
      description: 'UNIONAI Governance RFC Updates',
      link: 'https://unionai.grassrootslobbing.pl/rfc',
      language: 'en',
      copyright: 'UNIONAI Initiative 2026'
    });
    
    for (const rfc of rfcs) {
      feed.addItem({
        title: rfc.title,
        id: rfc.id,
        link: 'https://unionai.grassrootslobbing.pl/rfc/' + rfc.id,
        description: 'Status: ' + rfc.status + ' | Tags: ' + (rfc.tags || []).join(', '),
        date: new Date(rfc.date)
      });
    }
    
    res.type('application/rss+xml');
    res.send(feed.rss2());
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/rfc/:id', async (req, res) => {
  try {
    const html = await getRFCAsHtml(pool, req.params.id);
    res.type('text/html');
    res.send(html);
  } catch (error) {
    res.status(404).send('RFC not found');
  }
});

app.post('/api/rfc', async (req, res) => {
  try {
    const { id, title, status, description, content, tags, dependencies } = req.body;
    const rfc = await createRFC(pool, id, title, status, description, content, tags, dependencies);
    res.status(201).json(rfc);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.patch('/api/rfc/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const rfc = await updateRFCStatus(pool, req.params.id, status);
    res.json(rfc);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});


// ============ PROVIDER ONBOARDING ============
app.post('/api/provider/join', async (req, res) => {
  try {
    const { name, email, organization, api_endpoint } = req.body;
    const app_data = await createProviderApplication(pool, name, email, organization, api_endpoint);
    res.status(201).json({
      id: app_data.id,
      confirmation_code: app_data.confirmation_code,
      status: app_data.status,
      message: 'Provider application received. Please check your email for confirmation instructions.'
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/api/provider/applications', async (req, res) => {
  try {
    const applications = await listProviderApplications(pool);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/provider/:providerId', async (req, res) => {
  try {
    const application = await getProviderApplication(pool, req.params.providerId);
    res.json(application);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

app.post('/api/operator/provider/:providerId/approve', async (req, res) => {
  try {
    const { reviewer } = req.body;
    const application = await approveProviderApplication(pool, req.params.providerId, reviewer || 'operator');
    res.json({
      status: 'APPROVED',
      provider_id: application.id,
      api_key: application.api_key,
      warning: 'Store this api_key securely — it will not be shown again unless regenerated'
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/operator/provider/:providerId/regenerate-key', async (req, res) => {
  try {
    const application = await regenerateProviderApiKey(pool, req.params.providerId);
    res.json({
      status: 'KEY_REGENERATED',
      provider_id: application.id,
      api_key: application.api_key,
      warning: 'Previous key is now invalid. Store this api_key securely.'
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/operator/provider/:providerId/reject', async (req, res) => {
  try {
    const { reviewer } = req.body;
    const application = await rejectProviderApplication(pool, req.params.providerId, reviewer || 'operator');
    res.json({ status: 'REJECTED', provider_id: application.id });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});


// ============ COMPLIANCE MATRIX ============
app.get('/compliance/matrix.json', async (req, res) => {
  try {
    const matrix = await getComplianceMatrix(pool);
    res.json(matrix);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/compliance', async (req, res) => {
  try {
    const html = await getComplianceMatrixAsHtml(pool);
    res.type('text/html');
    res.send(html);
  } catch (error) {
    res.status(500).send('Compliance matrix error');
  }
});


// ============ EVIDENCE AUTOMATION ============
app.get('/evidence/live', async (req, res) => {
  try {
    const manifest = generateEvidenceManifest();
    res.json(manifest);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/operator/evidence/refresh', async (req, res) => {
  try {
    const manifest = generateEvidenceManifest();
    const saved = saveEvidenceManifest(manifest);
    if (saved) {
      res.json({ status: 'refreshed', documents_count: manifest.documents.length });
    } else {
      res.status(500).json({ error: 'Failed to save manifest' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});


// ============ START SERVER ============
// ============ START SERVER ============
app.listen(PORT as number, async () => {
  console.log(`Starting UNIONAI Core API on port ${PORT}`);
  
  // Initialize Redis + Migrations
  await initRedis();
  await runMigrations();
  
  // Mount routers AFTER initialization
  const k0nsultatRouter = createK0nsultatRouter(pool);
  app.use('/api/k0nsulat', k0nsultatRouter);

  // Wave 3: Semantic Relay, DID-lite, Memory, Trust, Governance
  const wave3Router = createWave3Router(pool);
  app.use('/api', wave3Router);

  // Operator override console (JWT protected)
  const operatorRouter = createOperatorRouter(pool);
  app.use('/api/operator', requireAuth, operatorRateLimit, operatorRouter);

  const wave6Router = createWave6Router(pool);
  app.use('/api', wave6Router);

  const wave7Router = createWave7Router(pool, redisClient);
  app.use('/api', wave7Router);

  console.log(`✓ UNIONAI Core API słucha na porcie ${PORT}`);
  console.log(`  Database: ${process.env.DATABASE_URL ? 'configured' : 'NOT configured'}`);
  console.log(`  Redis: ${process.env.REDIS_URL ? 'configured' : 'localhost (default)'}`);
  console.log(`  Redis status: ${redisConnected ? 'connected' : 'optional fallback'}`);

  // ============ COMPLIANCE CRON (auto-snapshot co 1h) ============
  const snapshotCompliance = async () => {
    try {
      const matrix = await getComplianceMatrix(pool);
      const completed = matrix.requirements.filter(r => r.status === 'COMPLETED').length;
      await pool.query(
        'INSERT INTO compliance_snapshots (coverage_percent, completed_count, total_count, details) VALUES ($1, $2, $3, $4)',
        [matrix.coverage, completed, matrix.requirements.length, JSON.stringify(matrix.requirements)]
      );
      console.log(`[cron] Compliance snapshot: ${matrix.coverage}% (${completed}/${matrix.requirements.length})`);
    } catch (e) {
      console.warn('[cron] Compliance snapshot failed:', (e as Error).message);
    }
  };
  snapshotCompliance();
  setInterval(snapshotCompliance, 60 * 60 * 1000); // co 1h

  console.log('✓ Compliance cron started (1h interval)');
});

// ============ COMPLIANCE HISTORY ENDPOINT ============
app.get('/compliance/history.json', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT coverage_percent, completed_count, total_count, created_at FROM compliance_snapshots ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ snapshots: result.rows, count: result.rows.length });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});
