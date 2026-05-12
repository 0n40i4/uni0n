import express from 'express';
import * as pg from 'pg';
import * as redis from 'redis';

const app = express();
const PORT = process.env.API_PORT || 3000;
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.log('Redis błąd', err));
const dbUrl = process.env.DATABASE_URL ? "set" : "MISSING"; const redisUrl = process.env.REDIS_URL ? "set" : "MISSING"; console.log(`[Startup] DATABASE_URL: ${dbUrl}, REDIS_URL: ${redisUrl}`);

app.get('/health', async (req, res) => {
  const result = { database: null as string | null, redis: null as string | null };
  try {
    const dbResult = await pool.query('SELECT NOW()');
    result.database = 'ok';
  } catch (dbError) {
    result.database = `failed: ${(dbError as Error).message || String(dbError)}`;
  }

  try {
    const redisPing = await redisClient.ping();
    result.redis = `ok (${redisPing})`;
  } catch (redisError) {
    result.redis = `failed: ${(redisError as Error).message || String(redisError)}`;
  }

  const isHealthy = result.database === 'ok' && result.redis && result.redis.startsWith('ok');
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'zdrowy' : 'niezdrowy',
    timestamp: new Date().toISOString(),
    database: result.database,
    redis: result.redis,
    version: '0.1.0'
  });
});

app.get('/metrics', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Wave 2: Discovery Layer
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
      leaderboard: "/api/leaderboard"
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
Allow: /feed/ai.xml
Disallow: /api/relay/
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
- /feed/ai.xml — AI RSS feed
- /.well-known/agent.json — agent discovery
- /.well-known/did.json — DID identity

## DID
did:unionai:s4:k0nsulat

## Operator
0n40i4 | k0nsult.fly.dev

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

app.post('/api/agent/join', async (req, res) => {
  try {
    const { did, provider, capabilities, score } = req.body;

    if (!did || !provider) {
      return res.status(400).json({ error: 'DID and provider required' });
    }

    const result = await pool.query(
      'INSERT INTO agents (did, provider, capabilities, score, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, did, created_at',
      [did, provider, JSON.stringify(capabilities || []), score || 0, 'active']
    );

    res.status(201).json({
      success: true,
      agent: result.rows[0],
      message: 'Agent registered in UNIONAI federation'
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, did, provider, score, capabilities, status FROM agents ORDER BY score DESC LIMIT 100'
    );

    res.json({
      federation: "UNIONAI-GENESIS-0N40I4-20260512",
      timestamp: new Date().toISOString(),
      total_agents: result.rows.length,
      leaderboard: result.rows.map((row: any, index: number) => ({
        rank: index + 1,
        did: row.did,
        provider: row.provider,
        score: row.score,
        capabilities: row.capabilities,
        status: row.status
      }))
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/relay/send', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/relay/route', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/agent/register', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/trust/verify', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/memory/anchor', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/memory/query', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/governance/event', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));
app.post('/api/operator/override', (req, res) => res.status(501).json({ error: 'nie zaimplementowano' }));

app.listen(PORT as number, async () => {
  await redisClient.connect();
  console.log(`UNIONAI Core API słucha na porcie ${PORT}`);
});
