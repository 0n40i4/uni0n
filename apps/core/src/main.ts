import express from 'express';
import * as pg from 'pg';
import * as redis from 'redis';

const app = express();
const PORT = process.env.API_PORT || 3000;
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => console.log('Redis błąd', err));

app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    const redisPing = await redisClient.ping();
    res.json({
      status: 'zdrowy',
      timestamp: new Date().toISOString(),
      database: { status: 'połączony' },
      redis: { status: 'połączony', ping: redisPing },
      version: '0.1.0'
    });
  } catch (error) {
    res.status(500).json({ status: 'niezdrowy', error: (error as Error).message });
  }
});

app.get('/metrics', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Wave 2: Discovery Layer
app.get('/.well-known/agent.json', (req, res) => res.json({
  name: "UNIONAI Core", version: "0.1.0-testnet", did: "did:unionai:s4:k0nsulat",
  operator: "0n40i4", zone: "S4", capabilities: ["relay", "trust", "memory", "governance"],
  status: "GO_CONTROLLED", federation: "UNIONAI-GENESIS-0N40I4-20260512"
}));

app.get('/.well-known/unionai.json', (req, res) => res.json({
  federation: "UNIONAI-GENESIS-0N40I4-20260512", version: "0.1.0", governance_model: "GO_CONTROLLED",
  trust_tiers: ["T0", "T1", "T2", "T3", "T4"], api_version: "0.1.0"
}));

app.get('/.well-known/did.json', (req, res) => res.json({
  "@context": "https://w3id.org/did/v1", "id": "did:unionai:s4:k0nsulat",
  "publicKey": [{ "id": "did:unionai:s4:k0nsulat#key-1", "type": "Ed25519VerificationKey2018",
    "controller": "did:unionai:s4:k0nsulat", "publicKeyBase58": "SGR5R5P9PqR4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8" }],
  "authentication": ["did:unionai:s4:k0nsulat#key-1"]
}));

app.get('/.well-known/ai-policy.json', (req, res) => res.json({
  policy: "UNIONAI-AI-POLICY-v1", allowed_models: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
  rate_limit: "1000 requests/hour", authentication_required: true,
  terms: "https://unionai.grassrootslobbing.pl/terms", privacy: "https://unionai.grassrootslobbing.pl/privacy"
}));

app.get('/.well-known/robots-ai.txt', (req, res) => {
  res.type('text/plain');
  res.send(`# UNIONAI AI Crawling Rules\nUser-agent: *\nAllow: /api/leaderboard\nAllow: /.well-known/\nAllow: /llms.txt\nDisallow: /api/relay/\nCrawl-delay: 10\n`);
});

app.get('/llms.txt', (req, res) => {
  res.type('text/plain');
  res.send(`# UNIONAI Ω∞ — AI Federation Layer\n> Federacyjna warstwa dla agentów AI\n\n## Endpoints\n- /api/agent/join\n- /api/leaderboard\n\n## DID\ndid:unionai:s4:k0nsulat\n\n## Operator\n0n40i4\n`);
});

app.get('/openapi.json', (req, res) => res.json({
  openapi: "3.0.0", info: { title: "UNIONAI Core API", version: "0.1.0-testnet" },
  paths: { "/health": { "get": { "summary": "Health check", "responses": { "200": {} } } } }
}));

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

app.listen(PORT as number, async () => {
  await redisClient.connect();
  console.log(`UNIONAI Core API słucha na porcie ${PORT}`);
});
