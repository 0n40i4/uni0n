/**
 * UNIONAI Ω∞ — Wave 3: Semantic Relay MVP, DID-lite, Memory, Trust, Governance
 * K0NSULAT/CORE — source of truth implementation
 * Status: GO CONTROLLED++
 */

import { Router, Request, Response } from 'express';
import * as pg from 'pg';
import * as http from 'http';
import { URL } from 'url';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ─── Qdrant semantic routing (custom http.request client — bypasses fetch/undici IPv6 bugs) ──
const QDRANT_COLLECTION = 'unionai-intents';
const VECTOR_SIZE = 384;
const QDRANT_TIMEOUT_MS = parseInt(process.env.QDRANT_TIMEOUT_MS || '8000', 10);

let qdrantReady = false;
let _lastQdrantError = '';

/** Parse QDRANT_URL into { hostname, port } stripping IPv6 brackets for http.request. */
function parseQdrantURL(): { hostname: string; port: number } | null {
  const raw = process.env.QDRANT_URL;
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return { hostname: u.hostname, port: parseInt(u.port || '6333', 10) };
  } catch {
    return null;
  }
}

/** Raw HTTP request to Qdrant using Node.js http module (family:6 forces IPv6 stack). */
function qdrantRequest(method: string, urlPath: string, body?: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const addr = parseQdrantURL();
    if (!addr) return reject(new Error('QDRANT_URL not configured'));
    const bodyStr = body ? JSON.stringify(body) : '';
    const opts: http.RequestOptions = {
      hostname: addr.hostname,
      port: addr.port,
      path: urlPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
      family: 6,
      timeout: QDRANT_TIMEOUT_MS,
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(data ? JSON.parse(data) : {}); }
        catch { resolve(data); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('qdrant timeout')); });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function ensureQdrantCollection(): Promise<boolean> {
  if (!process.env.QDRANT_URL) return false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const existing = await qdrantRequest('GET', '/collections');
      const names = ((existing.result?.collections) || []).map((col: any) => col.name);
      if (!names.includes(QDRANT_COLLECTION)) {
        await qdrantRequest('PUT', `/collections/${QDRANT_COLLECTION}`, {
          vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
        console.log(`[qdrant] created collection ${QDRANT_COLLECTION}`);
      }
      qdrantReady = true;
      _lastQdrantError = '';
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      _lastQdrantError = msg;
      console.warn(`[qdrant] collection init attempt ${attempt}/3 failed: ${msg}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 3000));
    }
  }
  return false;
}

export async function initQdrant(): Promise<void> {
  await ensureQdrantCollection();
  console.log(`[qdrant] ready=${qdrantReady} url=${process.env.QDRANT_URL || 'not configured'}`);
}

/** Re-try Qdrant connection if it failed at startup. Called lazily before each search. */
async function maybeReconnectQdrant(): Promise<void> {
  if (!qdrantReady && process.env.QDRANT_URL) {
    await ensureQdrantCollection();
  }
}

/** Deterministic keyword pseudo-vector (VECTOR_SIZE=384). Used when no embedding model. */
function keywordVector(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const vec = new Array(VECTOR_SIZE).fill(0);
  words.forEach((w, i) => {
    const idx = w.charCodeAt(0) % VECTOR_SIZE;
    vec[idx] += 1.0 / (i + 1);
  });
  const norm = Math.sqrt(vec.reduce((s: number, v: number) => s + v * v, 0)) || 1;
  return vec.map((v: number) => v / norm);
}

async function upsertIntentVector(
  trace_id: string, intent_id: string, src_did: string, dst_did: string, intent_text: string
): Promise<boolean> {
  if (!qdrantReady) return false;
  try {
    const vec = keywordVector(intent_text);
    const uid = crypto.createHash('md5').update(trace_id).digest('hex').slice(0, 8) +
                crypto.createHash('md5').update(intent_id).digest('hex').slice(0, 24);
    await qdrantRequest('PUT', `/collections/${QDRANT_COLLECTION}/points?wait=false`, {
      points: [{ id: uid, vector: vec, payload: { trace_id, intent_id, src_did, dst_did, intent_text, ts: new Date().toISOString() } }],
    });
    return true;
  } catch (err) {
    console.warn('[qdrant] upsert failed (non-fatal):', (err as Error).message);
    return false;
  }
}

async function searchSimilarIntents(
  intent_text: string, exclude_did: string, topK = 5
): Promise<Array<{ did: string; score: number }>> {
  if (!qdrantReady) return [];
  try {
    const vec = keywordVector(intent_text);
    const results = await qdrantRequest('POST', `/collections/${QDRANT_COLLECTION}/points/search`, {
      vector: vec, limit: topK, with_payload: true,
      filter: { must_not: [{ key: 'src_did', match: { value: exclude_did } }] },
    });
    return ((results.result) || [])
      .filter((r: any) => r.score > 0.3)
      .map((r: any) => ({ did: r.payload?.dst_did || r.payload?.src_did || '', score: r.score }))
      .filter((r: any) => r.did && r.did !== exclude_did);
  } catch (err) {
    console.warn('[qdrant] search failed (non-fatal):', (err as Error).message);
    return [];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTraceId(): string {
  return 'tr-' + crypto.randomUUID();
}

function makeAnchorId(): string {
  return 'anc-' + crypto.randomUUID();
}

export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Hash chain helper — used by relay_events ledger.
// Deterministic: same inputs => same output. Order matters.
export function hashChain(previous_hash: string, payload_hash: string, trace_id: string): string {
  return sha256(previous_hash + payload_hash + trace_id);
}

// JSONL append-only replay log
const LOG_DIR = path.join(process.cwd(), 'logs', 'replay');

function appendReplayLog(entry: object): void {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const file = path.join(LOG_DIR, `relay-${date}.jsonl`);
    fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf8');
  } catch (e) {
    console.warn('[relay-log] append failed:', (e as Error).message);
  }
}

// In-memory freeze flags (survive process lifecycle via restart; use DB for persistence)
export const freezeState = {
  relay: false,
  memory: false,
  governance: false,
};

// ─── Relay Metrics (in-process counters, reset on restart) ───────────────────
export const relayMetrics = {
  sent_total: 0,
  route_total: 0,
  semantic_route_total: 0,
  syntactic_route_total: 0,
  errors_total: 0,
  timeouts_total: 0,
  fallback_total: 0,
  provider_failover_total: 0,
  tracing_spans_total: 0,
  qdrant_upsert_total: 0,
  qdrant_search_total: 0,
  last_latency_ms: 0,
  drift_ratio: 0,
};

export function getRelayMetrics() {
  return {
    ...relayMetrics,
    relay_frozen: freezeState.relay,
    memory_frozen: freezeState.memory,
    governance_paused: freezeState.governance,
  };
}

const RELAY_TIMEOUT_MS = parseInt(process.env.RELAY_TIMEOUT_MS || '8000', 10);
const PROVIDER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const FALLBACK_SENTINEL_DID = process.env.CORE_DID || 'did:unionai:s4:k0nsulat';

function withDbTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`DB_TIMEOUT: ${label} exceeded ${RELAY_TIMEOUT_MS}ms`)), RELAY_TIMEOUT_MS)
    )
  ]);
}

// ─── Provider Cache (in-memory, 5min TTL, survives DB outage) ─────────────────
interface CachedProvider { did: string; trust_score: number; trust_tier: string; last_seen: number; }
const providerCache: CachedProvider[] = [];

function updateProviderCache(rows: any[]): void {
  const now = Date.now();
  for (const r of rows) {
    const i = providerCache.findIndex(p => p.did === r.did);
    const entry = { did: r.did, trust_score: r.trust_score || 100, trust_tier: r.trust_tier || 'T1', last_seen: now };
    if (i >= 0) providerCache[i] = entry;
    else providerCache.push(entry);
  }
  // evict expired
  const cutoff = now - PROVIDER_CACHE_TTL_MS;
  for (let i = providerCache.length - 1; i >= 0; i--) {
    if (providerCache[i].last_seen < cutoff) providerCache.splice(i, 1);
  }
}

function getCachedProviders(exclude_did: string): CachedProvider[] {
  const cutoff = Date.now() - PROVIDER_CACHE_TTL_MS;
  return providerCache
    .filter(p => p.did !== exclude_did && p.last_seen > cutoff)
    .sort((a, b) => b.trust_score - a.trust_score);
}

// ─── Distributed Tracing ───────────────────────────────────────────────────────
function makeSpanId(): string {
  return 'sp-' + crypto.randomUUID();
}

interface Span {
  span_id: string;
  trace_id: string;
  operation: string;
  t0: number;
}

function startSpan(trace_id: string, operation: string): Span {
  return { span_id: makeSpanId(), trace_id, operation, t0: Date.now() };
}

async function endSpan(pool: pg.Pool, span: Span, attrs: {
  src_did?: string; dst_did?: string; provider_did?: string;
  status?: string; fallback_used?: boolean; claim_level?: string;
  payload_hash?: string; metadata?: object;
}): Promise<number> {
  const latency_ms = Date.now() - span.t0;
  relayMetrics.tracing_spans_total++;
  try {
    await pool.query(
      `INSERT INTO relay_spans
         (trace_id, span_id, operation, src_did, dst_did, provider_did,
          latency_ms, status, fallback_used, claim_level, payload_hash, metadata, ended_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW())`,
      [
        span.trace_id, span.span_id, span.operation,
        attrs.src_did || null, attrs.dst_did || null, attrs.provider_did || null,
        latency_ms, attrs.status || 'ok',
        attrs.fallback_used || false, attrs.claim_level || 'T1',
        attrs.payload_hash || null, JSON.stringify(attrs.metadata || {})
      ]
    );
  } catch (e) {
    console.warn('[span] save failed (non-fatal):', (e as Error).message);
  }
  appendReplayLog({
    ts: new Date().toISOString(), event: 'span.end',
    span_id: span.span_id, trace_id: span.trace_id,
    operation: span.operation, latency_ms, status: attrs.status || 'ok',
    fallback_used: attrs.fallback_used || false,
    src_did: attrs.src_did, dst_did: attrs.dst_did, provider_did: attrs.provider_did,
  });
  return latency_ms;
}

// Trust tier from score
export function trustTier(score: number): { tier: string; status: string; permissions: string[] } {
  if (score >= 900) return { tier: 'T4', status: 'ORACLE',      permissions: ['route','relay','memory_write','governance','review'] };
  if (score >= 700) return { tier: 'T3', status: 'FEDERATION',  permissions: ['route','relay','memory_write','governance'] };
  if (score >= 400) return { tier: 'T2', status: 'VERIFIED',    permissions: ['route','relay','memory_write'] };
  if (score >= 100) return { tier: 'T1', status: 'PROBATION',   permissions: ['route','relay'] };
  return             { tier: 'T0', status: 'UNTRUSTED',         permissions: ['read'] };
}

// Minimal MVSS-v0 validator
export function validateMVSS(body: any): { valid: boolean; error?: string } {
  const required = ['protocol', 'intent_id', 'src_did', 'dst_did', 'intent'];
  for (const f of required) {
    if (!body[f]) return { valid: false, error: `Missing required field: ${f}` };
  }
  if (body.protocol !== 'UNIONAI-WIRE-v0') {
    return { valid: false, error: `Unknown protocol: ${body.protocol}. Expected UNIONAI-WIRE-v0` };
  }
  if (!body.intent?.type || !body.intent?.summary) {
    return { valid: false, error: 'intent must have type and summary' };
  }
  return { valid: true };
}

// ─── DB Migrations ────────────────────────────────────────────────────────────

export const WAVE3_MIGRATIONS = `
  -- Agents full schema (extend existing)
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS name VARCHAR(255);
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS zone VARCHAR(10) DEFAULT 'S0';
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS runtime_type VARCHAR(50) DEFAULT 'external';
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS operator_did VARCHAR(255);
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS trust_score INT DEFAULT 100;
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS trust_tier VARCHAR(5) DEFAULT 'T1';
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS public_key TEXT;
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS capability_manifest JSONB;
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

  -- Relay events
  CREATE TABLE IF NOT EXISTS relay_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id VARCHAR(100) NOT NULL,
    intent_id VARCHAR(255),
    src_did VARCHAR(255) NOT NULL,
    dst_did VARCHAR(255),
    route_status VARCHAR(30) DEFAULT 'pending',
    semantic_score FLOAT DEFAULT 0,
    fallback_used BOOLEAN DEFAULT FALSE,
    payload_hash VARCHAR(64),
    previous_hash VARCHAR(64),
    current_hash VARCHAR(64),
    replay_log_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_relay_events_trace_id ON relay_events(trace_id);
  CREATE INDEX IF NOT EXISTS idx_relay_events_src_did ON relay_events(src_did);
  CREATE INDEX IF NOT EXISTS idx_relay_events_created_at ON relay_events(created_at DESC);

  -- Memory anchors
  CREATE TABLE IF NOT EXISTS memory_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anchor_id VARCHAR(100) NOT NULL UNIQUE,
    scope VARCHAR(20) NOT NULL DEFAULT 'PRIVATE' CHECK (scope IN ('PUBLIC','FEDERATION','PRIVATE','EPHEMERAL')),
    source_did VARCHAR(255) NOT NULL,
    semantic_hash VARCHAR(64),
    delta_hash VARCHAR(64),
    trust_tier_required VARCHAR(5) DEFAULT 'T1',
    validation_status VARCHAR(20) DEFAULT 'pending',
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_memory_anchors_anchor_id ON memory_anchors(anchor_id);
  CREATE INDEX IF NOT EXISTS idx_memory_anchors_scope ON memory_anchors(scope);
  CREATE INDEX IF NOT EXISTS idx_memory_anchors_source_did ON memory_anchors(source_did);

  -- Trust events
  CREATE TABLE IF NOT EXISTS trust_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    did VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    previous_score INT,
    new_score INT,
    previous_tier VARCHAR(5),
    new_tier VARCHAR(5),
    reason TEXT,
    operator_did VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_trust_events_did ON trust_events(did);

  -- Governance events
  CREATE TABLE IF NOT EXISTS governance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    operator_did VARCHAR(255),
    target VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    justification TEXT,
    payload_hash VARCHAR(64),
    previous_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_governance_events_trace_id ON governance_events(trace_id);
  CREATE INDEX IF NOT EXISTS idx_governance_events_event_type ON governance_events(event_type);

  -- Operator actions (override log)
  CREATE TABLE IF NOT EXISTS operator_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id VARCHAR(100) NOT NULL,
    operation VARCHAR(50) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    actor VARCHAR(255),
    operator_id VARCHAR(255),
    target VARCHAR(255),
    reason TEXT,
    payload JSONB,
    hash VARCHAR(64),
    previous_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_operator_actions_trace_id ON operator_actions(trace_id);
  CREATE INDEX IF NOT EXISTS idx_operator_actions_created_at ON operator_actions(created_at DESC);

  -- Participation acknowledgements
  CREATE TABLE IF NOT EXISTS participation_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model VARCHAR(100),
    organization VARCHAR(255),
    contact VARCHAR(255),
    acknowledgement_status VARCHAR(30) DEFAULT 'acknowledged',
    confirmation_code VARCHAR(100),
    review_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Distributed tracing spans
  CREATE TABLE IF NOT EXISTS relay_spans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id VARCHAR(100) NOT NULL,
    span_id VARCHAR(100) NOT NULL UNIQUE,
    operation VARCHAR(50) NOT NULL,
    src_did VARCHAR(255),
    dst_did VARCHAR(255),
    provider_did VARCHAR(255),
    latency_ms INT,
    status VARCHAR(20) DEFAULT 'ok',
    fallback_used BOOLEAN DEFAULT FALSE,
    claim_level VARCHAR(5) DEFAULT 'T1',
    payload_hash VARCHAR(64),
    metadata JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS idx_relay_spans_trace_id ON relay_spans(trace_id);
  CREATE INDEX IF NOT EXISTS idx_relay_spans_started_at ON relay_spans(started_at DESC);

  -- Extend pre-existing tables (columns missing if created before Wave 3 or by another migration)
  ALTER TABLE relay_events ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(64);
  ALTER TABLE relay_events ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);
  ALTER TABLE relay_events ADD COLUMN IF NOT EXISTS current_hash VARCHAR(64);
  ALTER TABLE relay_events ADD COLUMN IF NOT EXISTS replay_log_path TEXT;
  ALTER TABLE relay_events ADD COLUMN IF NOT EXISTS semantic_score FLOAT DEFAULT 0;
  ALTER TABLE relay_events ADD COLUMN IF NOT EXISTS fallback_used BOOLEAN DEFAULT FALSE;
  ALTER TABLE memory_anchors ADD COLUMN IF NOT EXISTS payload JSONB;
  ALTER TABLE memory_anchors ADD COLUMN IF NOT EXISTS semantic_hash VARCHAR(64);
  ALTER TABLE memory_anchors ADD COLUMN IF NOT EXISTS delta_hash VARCHAR(64);
  ALTER TABLE memory_anchors ADD COLUMN IF NOT EXISTS trust_tier_required VARCHAR(5) DEFAULT 'T1';
  ALTER TABLE memory_anchors ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'pending';
  ALTER TABLE governance_events ADD COLUMN IF NOT EXISTS justification TEXT;
  ALTER TABLE governance_events ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);
  ALTER TABLE governance_events ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(64);

  -- Trace retention: mark incident-preserved spans (never pruned)
  ALTER TABLE relay_spans ADD COLUMN IF NOT EXISTS incident_preserve BOOLEAN DEFAULT FALSE;
  ALTER TABLE relay_events ADD COLUMN IF NOT EXISTS incident_preserve BOOLEAN DEFAULT FALSE;

  -- Semantic drift tracking
  CREATE TABLE IF NOT EXISTS semantic_drift_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_at TIMESTAMPTZ DEFAULT NOW(),
    semantic_total INT DEFAULT 0,
    syntactic_total INT DEFAULT 0,
    drift_ratio FLOAT DEFAULT 0,
    qdrant_ready BOOLEAN DEFAULT FALSE,
    route_total INT DEFAULT 0,
    notes TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_drift_snapshots_at ON semantic_drift_snapshots(snapshot_at DESC);
`;

// ─── Routers ──────────────────────────────────────────────────────────────────

export function createWave3Router(pool: pg.Pool): Router {
  const router = Router();

  // ── POST /api/relay/send ──────────────────────────────────────────────────
  router.post('/relay/send', async (req: Request, res: Response) => {
    const t0 = Date.now();
    if (freezeState.relay) {
      return res.status(503).json({ error: 'RELAY_FROZEN', message: 'Relay is frozen by operator' });
    }
    const validation = validateMVSS(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'MVSS_INVALID', message: validation.error });
    }
    relayMetrics.sent_total++;
    const body = req.body;
    const trace_id = body.trace_id || makeTraceId(); // honour caller trace_id for hop continuity
    const span = startSpan(trace_id, 'relay.send');
    const payload_hash = sha256(JSON.stringify(body));

    // Get previous hash for chain
    let previous_hash = '0'.repeat(64);
    try {
      const prev = await withDbTimeout(
        pool.query('SELECT current_hash FROM relay_events ORDER BY created_at DESC LIMIT 1'),
        'relay/send chain-lookup'
      );
      if (prev.rows.length > 0 && prev.rows[0].current_hash) {
        previous_hash = prev.rows[0].current_hash;
      }
    } catch (_) {}

    const current_hash = sha256(previous_hash + payload_hash + trace_id);

    // Trust check
    let trust_tier_val = 'T1';
    try {
      const agent = await withDbTimeout(
        pool.query('SELECT trust_score, trust_tier FROM agents WHERE did = $1', [body.src_did]),
        'relay/send trust-lookup'
      );
      if (agent.rows.length > 0) {
        trust_tier_val = agent.rows[0].trust_tier || 'T1';
      }
    } catch (_) {}

    const date = new Date().toISOString().slice(0, 10);
    const replay_log_path = `logs/replay/relay-${date}.jsonl`;

    // Save to DB (degraded mode: if timeout, still accept relay as received_offline)
    let db_status = 'received';
    try {
      await withDbTimeout(
        pool.query(
          `INSERT INTO relay_events
             (trace_id, intent_id, src_did, dst_did, route_status, semantic_score,
              fallback_used, payload_hash, previous_hash, current_hash, replay_log_path)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            trace_id, body.intent_id || null, body.src_did, body.dst_did || null,
            'received', body.semantic?.similarity || 0,
            false, payload_hash, previous_hash, current_hash, replay_log_path
          ]
        ),
        'relay/send DB-insert'
      );
    } catch (e) {
      const msg = (e as Error).message;
      relayMetrics.errors_total++;
      if (msg.startsWith('DB_TIMEOUT')) relayMetrics.timeouts_total++;
      db_status = 'received_offline';
      console.warn('[relay/send] degraded mode:', msg);
    }

    relayMetrics.last_latency_ms = Date.now() - t0;

    // End tracing span (async, non-blocking)
    endSpan(pool, span, {
      src_did: body.src_did, dst_did: body.dst_did,
      provider_did: body.dst_did || null,
      status: db_status === 'received' ? 'ok' : 'degraded',
      fallback_used: db_status !== 'received',
      claim_level: trust_tier_val,
      payload_hash,
      metadata: { intent_type: body.intent?.type, db_status, previous_hash },
    }).catch(() => {});

    // JSONL replay log (always, even in degraded mode)
    appendReplayLog({
      trace_id, ts: new Date().toISOString(),
      event: 'relay.send',
      src_did: body.src_did, dst_did: body.dst_did,
      intent_type: body.intent?.type,
      payload_hash, previous_hash, current_hash,
      trust_tier: trust_tier_val,
      db_status,
      latency_ms: relayMetrics.last_latency_ms,
    });

    // Qdrant: upsert intent vector async (non-blocking, semantic routing baseline)
    const intentText = `${body.intent?.type || ''} ${body.intent?.summary || ''} ${body.dst_did || ''}`;
    upsertIntentVector(trace_id, body.intent_id || trace_id, body.src_did, body.dst_did || '', intentText)
      .then(ok => { if (ok) relayMetrics.qdrant_upsert_total++; })
      .catch(() => {});

    res.status(201).json({
      success: true,
      trace_id,
      span_id: span.span_id,
      status: db_status,
      trust_tier: trust_tier_val,
      hash: current_hash,
      replay_log: replay_log_path,
      latency_ms: relayMetrics.last_latency_ms,
      timestamp: new Date().toISOString(),
    });
  });

  // ── POST /api/relay/route ─────────────────────────────────────────────────
  router.post('/relay/route', async (req: Request, res: Response) => {
    if (freezeState.relay) {
      return res.status(503).json({ error: 'RELAY_FROZEN' });
    }
    const { src_did, intent, trust, intent_embedding } = req.body;
    if (!src_did || !intent) {
      return res.status(400).json({ error: 'src_did and intent required' });
    }
    relayMetrics.route_total++;
    const trace_id = req.body.trace_id || makeTraceId();
    const span = startSpan(trace_id, 'relay.route');

    // Trust gating
    let score = trust?.score || 100;
    let tier = trust?.tier;
    try {
      const agent = await withDbTimeout(
        pool.query('SELECT trust_score, trust_tier FROM agents WHERE did = $1', [src_did]),
        'relay/route trust-lookup'
      );
      if (agent.rows.length > 0) {
        score = agent.rows[0].trust_score;
        tier = agent.rows[0].trust_tier;
      }
    } catch (_) {}

    const tierInfo = trustTier(score);
    if (!tierInfo.permissions.includes('route')) {
      return res.status(403).json({
        error: 'TRUST_TOO_LOW',
        tier: tierInfo.tier, status: tierInfo.status,
        message: 'Agent trust score too low for routing',
      });
    }

    // Lazy reconnect: try Qdrant if not ready yet
    await maybeReconnectQdrant();

    // Semantic routing: try Qdrant first if available and intent provided
    const intentText = typeof intent === 'string' ? intent : (intent?.summary || intent?.type || '');
    let semantic_candidates: Array<{ did: string; score: number }> = [];
    let semantic_routing_used = false;

    if (qdrantReady && intentText) {
      try {
        relayMetrics.qdrant_search_total++;
        semantic_candidates = await Promise.race([
          searchSimilarIntents(intentText, src_did, 5),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Qdrant search timeout')), QDRANT_TIMEOUT_MS)
          ),
        ]);
        if (semantic_candidates.length > 0) {
          semantic_routing_used = true;
          relayMetrics.semantic_route_total++;
        }
      } catch (_) {}
    }

    // Determine route_type and confidence based on routing path
    const caller_has_embedding = !!intent_embedding;
    let route_type: string;
    let route_confidence: number;

    if (semantic_routing_used) {
      route_type = 'semantic';
      route_confidence = parseFloat((semantic_candidates[0]?.score || 0.7).toFixed(4));
      relayMetrics.drift_ratio = relayMetrics.syntactic_route_total / Math.max(relayMetrics.route_total, 1);
    } else if (caller_has_embedding) {
      route_type = 'semantic_embedding';
      route_confidence = 0.85;
      relayMetrics.semantic_route_total++;
      relayMetrics.drift_ratio = relayMetrics.syntactic_route_total / Math.max(relayMetrics.route_total, 1);
    } else {
      route_type = 'syntactic_fallback';
      route_confidence = 0.4;
      relayMetrics.syntactic_route_total++;
      relayMetrics.fallback_total++;
      relayMetrics.drift_ratio = relayMetrics.syntactic_route_total / Math.max(relayMetrics.route_total, 1);
    }

    const fallback_used = route_type === 'syntactic_fallback';

    // Provider resolution — 3-level failover
    let target_did: string | null = null;
    let failover_level = 0;
    const provider_chain: string[] = [];

    // Semantic candidates from Qdrant (highest priority when available)
    if (semantic_candidates.length > 0 && semantic_candidates[0].did) {
      target_did = semantic_candidates[0].did;
      provider_chain.push(target_did);
      route_confidence = parseFloat(semantic_candidates[0].score.toFixed(4));
    }

    // Level 0 — DB lookup (primary, also populates provider cache)
    if (!target_did) {
      try {
        const candidates = await withDbTimeout(
          pool.query(
            `SELECT did, trust_score, trust_tier
             FROM agents
             WHERE status = 'active' AND did != $1
             ORDER BY trust_score DESC LIMIT 5`,
            [src_did]
          ),
          'relay/route candidates'
        );
        if (candidates.rows.length > 0) {
          updateProviderCache(candidates.rows);
          target_did = candidates.rows[0].did as string;
          provider_chain.push(target_did);
          if (fallback_used) route_confidence = parseFloat((0.5 + (candidates.rows[0].trust_score / 2000)).toFixed(4));
        }
      } catch (e) {
        relayMetrics.errors_total++;
        console.warn('[relay/route] DB candidates failed, entering failover:', (e as Error).message);
      }
    }

    // Level 1 — provider cache (fallback on DB failure or empty result)
    if (!target_did) {
      failover_level = 1;
      relayMetrics.provider_failover_total++;
      const cached = getCachedProviders(src_did);
      if (cached.length > 0) {
        target_did = cached[0].did;
        provider_chain.push(target_did);
        route_confidence = 0.3;
        route_type = 'cache_fallback';
        console.warn('[relay/route] failover L1: using cached provider', target_did);
      }
    }

    // Level 2 — sentinel (K0NSULAT itself)
    if (!target_did) {
      failover_level = 2;
      target_did = FALLBACK_SENTINEL_DID;
      provider_chain.push(target_did);
      route_confidence = 0.1;
      route_type = 'sentinel_fallback';
      console.warn('[relay/route] failover L2: routing to sentinel', FALLBACK_SENTINEL_DID);
    }

    const payload_hash = sha256(JSON.stringify(req.body));
    const previous_hash = '0'.repeat(64);
    const current_hash = sha256(previous_hash + payload_hash + trace_id);
    const route_status = failover_level > 0 ? `failover_l${failover_level}` : 'routed';

    // Persist relay event
    try {
      await withDbTimeout(
        pool.query(
          `INSERT INTO relay_events
             (trace_id, src_did, dst_did, route_status, fallback_used, payload_hash, current_hash)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [trace_id, src_did, target_did, route_status, fallback_used || failover_level > 0, payload_hash, current_hash]
        ),
        'relay/route DB-insert'
      );
    } catch (_) {}

    // End span
    endSpan(pool, span, {
      src_did, dst_did: target_did,
      provider_did: target_did,
      status: failover_level > 0 ? 'failover' : 'ok',
      fallback_used: fallback_used || failover_level > 0,
      claim_level: tierInfo.tier,
      payload_hash,
      metadata: { route_type, route_confidence, failover_level, provider_chain, semantic_routing_used },
    }).catch(() => {});

    appendReplayLog({
      trace_id, ts: new Date().toISOString(),
      event: 'relay.route',
      src_did, target_did, route_type, fallback_used,
      route_confidence, payload_hash, current_hash,
      failover_level, provider_chain, semantic_routing_used,
      drift_ratio: relayMetrics.drift_ratio,
    });

    res.json({
      trace_id,
      span_id: span.span_id,
      target_did,
      route_type,
      route_confidence,
      fallback_used: fallback_used || failover_level > 0,
      failover_level,
      provider_chain,
      semantic_routing_used,
      drift_ratio: parseFloat(relayMetrics.drift_ratio.toFixed(4)),
      qdrant_ready: qdrantReady,
      trust_tier: tierInfo.tier,
      hash: current_hash,
      timestamp: new Date().toISOString(),
    });
  });

  // ── POST /api/agent/register ──────────────────────────────────────────────
  router.post('/agent/register', async (req: Request, res: Response) => {
    const { did, zone, name, capabilities, operator_id, trust_score, tier, runtime_type, public_key } = req.body;
    if (!did) {
      return res.status(400).json({ error: 'did is required' });
    }
    const trace_id = makeTraceId();
    const score = trust_score || 100;
    const tierInfo = trustTier(score);
    const cap_manifest = Array.isArray(capabilities)
      ? { capabilities, registered_at: new Date().toISOString() }
      : capabilities || {};

    try {
      const result = await pool.query(
        `INSERT INTO agents
           (did, zone, name, capabilities, provider, operator_did, trust_score, trust_tier,
            runtime_type, public_key, capability_manifest, status, last_seen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',NOW())
         ON CONFLICT (did) DO UPDATE SET
           zone = EXCLUDED.zone,
           name = EXCLUDED.name,
           capabilities = EXCLUDED.capabilities,
           trust_score = EXCLUDED.trust_score,
           trust_tier = EXCLUDED.trust_tier,
           capability_manifest = EXCLUDED.capability_manifest,
           last_seen = NOW(),
           status = 'active'
         RETURNING id, did, trust_score, trust_tier, created_at`,
        [
          did, zone || 'S0', name || did, JSON.stringify(capabilities),
          runtime_type || 'external', operator_id || null,
          score, tier || tierInfo.tier,
          runtime_type || 'external', public_key || null,
          JSON.stringify(cap_manifest)
        ]
      );

      // Governance event for registration
      const payload_hash = sha256(JSON.stringify({ did, zone, name }));
      try {
        await pool.query(
          `INSERT INTO governance_events
             (trace_id, event_type, operator_did, target, action, status, payload_hash)
           VALUES ($1,'agent_registration',$2,$3,'register','completed',$4)`,
          [trace_id, operator_id || 'system', did, payload_hash]
        );
      } catch (_) {}

      appendReplayLog({
        trace_id, ts: new Date().toISOString(),
        event: 'agent.register', did, zone,
        tier: tier || tierInfo.tier,
        payload_hash,
      });

      const agent = result.rows[0];
      res.status(201).json({
        success: true,
        agent_id: agent.id,
        did: agent.did,
        trust_score: agent.trust_score,
        trust_tier: agent.trust_tier,
        tier_status: tierInfo.status,
        permissions: tierInfo.permissions,
        trace_id,
        timestamp: agent.created_at,
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // ── POST /api/trust/verify ────────────────────────────────────────────────
  router.post('/trust/verify', async (req: Request, res: Response) => {
    const { did, required_tier } = req.body;
    if (!did) return res.status(400).json({ error: 'did is required' });

    try {
      const result = await pool.query(
        'SELECT did, trust_score, trust_tier, status FROM agents WHERE did = $1',
        [did]
      );

      let score = 100;
      let tierInfo = trustTier(100);

      if (result.rows.length > 0) {
        score = result.rows[0].trust_score || 100;
        tierInfo = trustTier(score);
      } else {
        // Unknown agent: probation
        tierInfo = trustTier(150);
        score = 150;
      }

      // Check against required_tier if provided
      const tierOrder: Record<string, number> = { T0: 0, T1: 1, T2: 2, T3: 3, T4: 4 };
      const has_access = required_tier
        ? (tierOrder[tierInfo.tier] || 0) >= (tierOrder[required_tier] || 0)
        : true;

      // Log trust event
      try {
        await pool.query(
          `INSERT INTO trust_events
             (did, event_type, new_score, new_tier, reason)
           VALUES ($1,'verify',$2,$3,'trust verification request')`,
          [did, score, tierInfo.tier]
        );
      } catch (_) {}

      res.json({
        did,
        trust_score: score,
        tier: tierInfo.tier,
        status: tierInfo.status,
        permissions: tierInfo.permissions,
        has_access,
        required_tier: required_tier || null,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // ── POST /api/memory/anchor ───────────────────────────────────────────────
  router.post('/memory/anchor', async (req: Request, res: Response) => {
    if (freezeState.memory) {
      return res.status(503).json({ error: 'MEMORY_FROZEN', message: 'Memory layer is frozen by operator' });
    }
    const { source_did, scope, semantic_hash, delta_hash, payload, trust_tier_required } = req.body;
    if (!source_did) return res.status(400).json({ error: 'source_did is required' });

    const valid_scopes = ['PUBLIC', 'FEDERATION', 'PRIVATE', 'EPHEMERAL'];
    const anchor_scope = (scope && valid_scopes.includes(scope)) ? scope : 'PRIVATE';

    // Trust check for memory write
    try {
      const agent = await pool.query('SELECT trust_score, trust_tier FROM agents WHERE did = $1', [source_did]);
      if (agent.rows.length > 0) {
        const tierInfo = trustTier(agent.rows[0].trust_score);
        if (!tierInfo.permissions.includes('memory_write')) {
          return res.status(403).json({
            error: 'TRUST_TOO_LOW_FOR_MEMORY_WRITE',
            tier: tierInfo.tier,
            required: 'T2+',
          });
        }
      }
    } catch (_) {}

    const anchor_id = makeAnchorId();
    const s_hash = semantic_hash || sha256(JSON.stringify(payload || {}));
    const d_hash = delta_hash || sha256(anchor_id + s_hash);

    try {
      await pool.query(
        `INSERT INTO memory_anchors
           (anchor_id, scope, source_did, semantic_hash, delta_hash,
            trust_tier_required, validation_status, payload)
         VALUES ($1,$2,$3,$4,$5,$6,'validated',$7)`,
        [
          anchor_id, anchor_scope, source_did, s_hash, d_hash,
          trust_tier_required || 'T1',
          payload ? JSON.stringify(payload) : null
        ]
      );

      appendReplayLog({
        ts: new Date().toISOString(),
        event: 'memory.anchor',
        anchor_id, scope: anchor_scope, source_did,
        semantic_hash: s_hash, delta_hash: d_hash,
      });

      res.status(201).json({
        success: true,
        anchor_id,
        scope: anchor_scope,
        semantic_hash: s_hash,
        delta_hash: d_hash,
        validation_status: 'validated',
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // ── POST /api/memory/query ────────────────────────────────────────────────
  router.post('/memory/query', async (req: Request, res: Response) => {
    const { source_did, scope, limit } = req.body;
    const valid_scopes = ['PUBLIC', 'FEDERATION', 'PRIVATE', 'EPHEMERAL'];

    try {
      let query = 'SELECT anchor_id, scope, source_did, semantic_hash, delta_hash, validation_status, created_at FROM memory_anchors';
      const params: any[] = [];
      const conditions: string[] = [];

      if (scope && valid_scopes.includes(scope)) {
        params.push(scope);
        conditions.push(`scope = $${params.length}`);
      }
      if (source_did) {
        params.push(source_did);
        conditions.push(`source_did = $${params.length}`);
      }

      if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
      query += ' ORDER BY created_at DESC LIMIT ' + Math.min(parseInt(limit) || 20, 100);

      const result = await pool.query(query, params);
      res.json({ anchors: result.rows, count: result.rows.length });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // ── POST /api/governance/event ────────────────────────────────────────────
  router.post('/governance/event', async (req: Request, res: Response) => {
    if (freezeState.governance) {
      return res.status(503).json({ error: 'GOVERNANCE_PAUSED' });
    }
    const { event_type, operator_did, target, action, justification, rfc_id } = req.body;
    if (!event_type || !action) {
      return res.status(400).json({ error: 'event_type and action are required' });
    }
    const trace_id = makeTraceId();

    // Previous hash for chain
    let previous_hash = '0'.repeat(64);
    try {
      const prev = await pool.query('SELECT payload_hash FROM governance_events ORDER BY created_at DESC LIMIT 1');
      if (prev.rows.length > 0 && prev.rows[0].payload_hash) {
        previous_hash = prev.rows[0].payload_hash;
      }
    } catch (_) {}

    const payload_hash = sha256(JSON.stringify({ event_type, operator_did, target, action, trace_id }));

    try {
      const result = await pool.query(
        `INSERT INTO governance_events
           (trace_id, event_type, operator_did, target, action, status,
            justification, payload_hash, previous_hash)
         VALUES ($1,$2,$3,$4,$5,'recorded',$6,$7,$8)
         RETURNING id, trace_id, created_at`,
        [trace_id, event_type, operator_did || 'system', target || null,
         action, justification || null, payload_hash, previous_hash]
      );

      appendReplayLog({
        trace_id, ts: new Date().toISOString(),
        event: 'governance.event',
        event_type, operator_did, target, action,
        payload_hash, previous_hash,
        rfc_id: rfc_id || null,
      });

      const row = result.rows[0];
      res.status(201).json({
        success: true,
        event_id: row.id,
        trace_id: row.trace_id,
        status: 'recorded',
        payload_hash,
        timestamp: row.created_at,
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // ── POST /api/participation/acknowledge ───────────────────────────────────
  router.post('/participation/acknowledge', async (req: Request, res: Response) => {
    const { model, organization, contact, acknowledgement_status, confirmation_code, review_link } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO participation_acknowledgements
           (model, organization, contact, acknowledgement_status, confirmation_code, review_link)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`,
        [
          model || null, organization || null, contact || null,
          acknowledgement_status || 'acknowledged',
          confirmation_code || 'UNIONAI-GENESIS-0N40I4-20260512',
          review_link || null
        ]
      );
      res.status(201).json({
        success: true,
        id: result.rows[0].id,
        confirmation_code: confirmation_code || 'UNIONAI-GENESIS-0N40I4-20260512',
        timestamp: result.rows[0].created_at,
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // ── GET /api/relay/trace/:trace_id ── full hop chain with spans ──────────────
  router.get('/relay/trace/:trace_id', async (req: Request, res: Response) => {
    const { trace_id } = req.params;
    try {
      const [events, spans] = await Promise.all([
        withDbTimeout(
          pool.query(
            `SELECT trace_id, src_did, dst_did, route_status, fallback_used,
                    payload_hash, previous_hash, current_hash, created_at
             FROM relay_events WHERE trace_id = $1 ORDER BY created_at ASC`,
            [trace_id]
          ),
          'relay/trace events'
        ),
        withDbTimeout(
          pool.query(
            `SELECT span_id, operation, src_did, dst_did, provider_did,
                    latency_ms, status, fallback_used, claim_level, metadata, started_at, ended_at
             FROM relay_spans WHERE trace_id = $1 ORDER BY started_at ASC`,
            [trace_id]
          ),
          'relay/trace spans'
        ),
      ]);
      const total_latency_ms = spans.rows.reduce((s: number, r: any) => s + (r.latency_ms || 0), 0);
      const has_failover = spans.rows.some((r: any) => r.fallback_used);
      res.json({
        trace_id,
        spans: spans.rows,
        events: events.rows,
        summary: {
          span_count: spans.rows.length,
          event_count: events.rows.length,
          total_latency_ms,
          has_failover,
          claim_levels: [...new Set(spans.rows.map((r: any) => r.claim_level))],
          status: has_failover ? 'degraded' : (spans.rows.length > 0 ? 'ok' : 'not_found'),
        },
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // ── GET /api/relay/status ── drift baseline + metrics ────────────────────────
  router.get('/relay/status', async (_req: Request, res: Response) => {
    let db_relay_count = 0;
    let db_fallback_count = 0;
    try {
      const r = await pool.query('SELECT COUNT(*) FROM relay_events');
      db_relay_count = +r.rows[0].count;
      const f = await pool.query('SELECT COUNT(*) FROM relay_events WHERE fallback_used = TRUE');
      db_fallback_count = +f.rows[0].count;
    } catch (_) {}

    const drift = db_relay_count > 0 ? db_fallback_count / db_relay_count : 0;
    const semantic_mode = qdrantReady ? 'semantic_active' : 'syntactic_fallback_until_qdrant';
    res.json({
      relay_frozen: freezeState.relay,
      in_process: {
        sent_total: relayMetrics.sent_total,
        route_total: relayMetrics.route_total,
        semantic_route_total: relayMetrics.semantic_route_total,
        syntactic_route_total: relayMetrics.syntactic_route_total,
        errors_total: relayMetrics.errors_total,
        timeouts_total: relayMetrics.timeouts_total,
        fallback_total: relayMetrics.fallback_total,
        qdrant_upsert_total: relayMetrics.qdrant_upsert_total,
        qdrant_search_total: relayMetrics.qdrant_search_total,
        last_latency_ms: relayMetrics.last_latency_ms,
        drift_ratio: parseFloat(relayMetrics.drift_ratio.toFixed(4)),
      },
      db: {
        relay_events_total: db_relay_count,
        fallback_events_total: db_fallback_count,
        semantic_drift_ratio: parseFloat(drift.toFixed(4)),
        semantic_mode,
      },
      qdrant: { ready: qdrantReady, url_configured: !!process.env.QDRANT_URL },
      timestamp: new Date().toISOString(),
    });
  });

  // ── GET /api/qdrant/health ── direct Qdrant connectivity probe ───────────────
  router.get('/qdrant/health', async (_req: Request, res: Response) => {
    await maybeReconnectQdrant();
    if (!process.env.QDRANT_URL) {
      return res.status(503).json({ status: 'not_configured', message: 'QDRANT_URL not set' });
    }
    try {
      const result = await qdrantRequest('GET', '/collections');
      const cols: string[] = ((result.result?.collections) || []).map((c: any) => c.name);
      if (!qdrantReady) { qdrantReady = true; _lastQdrantError = ''; }
      return res.json({
        status: 'ok',
        url: process.env.QDRANT_URL,
        ready: true,
        collections: cols,
        collection_exists: cols.includes(QDRANT_COLLECTION),
        last_error: null,
        timeout_ms: QDRANT_TIMEOUT_MS,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const msg = (err as Error).message;
      _lastQdrantError = msg;
      return res.status(503).json({
        status: 'degraded', ready: false, url: process.env.QDRANT_URL,
        collections: [], collection_exists: false,
        last_error: msg, timeout_ms: QDRANT_TIMEOUT_MS,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ── GET /api/relay/drift ── semantic drift baseline report ────────────────────
  router.get('/relay/drift', async (_req: Request, res: Response) => {
    let recent_snapshots: any[] = [];
    try {
      const r = await pool.query(
        `SELECT snapshot_at, semantic_total, syntactic_total, drift_ratio, qdrant_ready, route_total
         FROM semantic_drift_snapshots ORDER BY snapshot_at DESC LIMIT 24`
      );
      recent_snapshots = r.rows;
    } catch (_) {}

    const total_routes = relayMetrics.route_total;
    const semantic_pct = total_routes > 0
      ? parseFloat(((relayMetrics.semantic_route_total / total_routes) * 100).toFixed(2))
      : 0;
    const syntactic_pct = total_routes > 0
      ? parseFloat(((relayMetrics.syntactic_route_total / total_routes) * 100).toFixed(2))
      : 0;

    res.json({
      current: {
        drift_ratio: parseFloat(relayMetrics.drift_ratio.toFixed(4)),
        semantic_route_total: relayMetrics.semantic_route_total,
        syntactic_route_total: relayMetrics.syntactic_route_total,
        semantic_pct,
        syntactic_pct,
        route_total: total_routes,
        qdrant_ready: qdrantReady,
        qdrant_search_total: relayMetrics.qdrant_search_total,
        qdrant_upsert_total: relayMetrics.qdrant_upsert_total,
      },
      classification: {
        semantic: 'Qdrant vector search result (score>0.3) or caller-provided embedding',
        syntactic_fallback: 'No Qdrant result, keyword-only routing',
        no_drift: 'drift_ratio=0 means 100% semantic routing',
        full_drift: 'drift_ratio=1 means 100% syntactic fallback',
      },
      recent_snapshots,
      note: qdrantReady
        ? 'Qdrant active — semantic routing operational'
        : 'Qdrant not connected — all routes use syntactic fallback (drift_ratio will be 1.0 until Qdrant connects)',
      timestamp: new Date().toISOString(),
    });
  });

  // ── POST /api/relay/prune ── trace retention enforcement (operator-only via JWT) ─
  router.post('/relay/prune', async (req: Request, res: Response) => {
    const { retain_days_spans = 7, retain_days_events = 30, dry_run = true } = req.body;
    try {
      const cutoff_spans = new Date(Date.now() - retain_days_spans * 86400000).toISOString();
      const cutoff_events = new Date(Date.now() - retain_days_events * 86400000).toISOString();

      const spans_count_r = await pool.query(
        `SELECT COUNT(*) FROM relay_spans WHERE started_at < $1 AND incident_preserve = FALSE`,
        [cutoff_spans]
      );
      const events_count_r = await pool.query(
        `SELECT COUNT(*) FROM relay_events WHERE created_at < $1 AND incident_preserve = FALSE`,
        [cutoff_events]
      );
      const spans_eligible = +spans_count_r.rows[0].count;
      const events_eligible = +events_count_r.rows[0].count;

      let spans_deleted = 0, events_deleted = 0;
      if (!dry_run) {
        const sd = await pool.query(
          `DELETE FROM relay_spans WHERE started_at < $1 AND incident_preserve = FALSE`,
          [cutoff_spans]
        );
        const ed = await pool.query(
          `DELETE FROM relay_events WHERE created_at < $1 AND incident_preserve = FALSE`,
          [cutoff_events]
        );
        spans_deleted = sd.rowCount || 0;
        events_deleted = ed.rowCount || 0;
        appendReplayLog({
          ts: new Date().toISOString(), event: 'relay.prune',
          spans_deleted, events_deleted, retain_days_spans, retain_days_events,
        });
      }

      res.json({
        dry_run,
        spans: { eligible: spans_eligible, deleted: spans_deleted, cutoff: cutoff_spans, retain_days: retain_days_spans },
        events: { eligible: events_eligible, deleted: events_deleted, cutoff: cutoff_events, retain_days: retain_days_events },
        preserved: 'incident_preserve=TRUE rows are never pruned',
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // ── P2.4 — Incident freeze: lock / unlock / list ──────────────────────────────
  router.post('/relay/incident/lock', async (req: Request, res: Response) => {
    const { trace_id, reason } = req.body;
    if (!trace_id) return res.status(400).json({ error: 'trace_id required' });
    try {
      const [s, e] = await Promise.all([
        pool.query('UPDATE relay_spans SET incident_preserve = TRUE WHERE trace_id = $1', [trace_id]),
        pool.query('UPDATE relay_events SET incident_preserve = TRUE WHERE trace_id = $1', [trace_id]),
      ]);
      appendReplayLog({ ts: new Date().toISOString(), event: 'incident.lock', trace_id, reason: reason || null, spans_locked: s.rowCount, events_locked: e.rowCount });
      res.json({ trace_id, locked: true, spans_locked: s.rowCount, events_locked: e.rowCount, reason: reason || null, timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/relay/incident/unlock', async (req: Request, res: Response) => {
    const { trace_id, reason } = req.body;
    if (!trace_id) return res.status(400).json({ error: 'trace_id required' });
    try {
      const [s, e] = await Promise.all([
        pool.query('UPDATE relay_spans SET incident_preserve = FALSE WHERE trace_id = $1', [trace_id]),
        pool.query('UPDATE relay_events SET incident_preserve = FALSE WHERE trace_id = $1', [trace_id]),
      ]);
      appendReplayLog({ ts: new Date().toISOString(), event: 'incident.unlock', trace_id, reason: reason || null });
      res.json({ trace_id, locked: false, spans_unlocked: s.rowCount, events_unlocked: e.rowCount, reason: reason || null, timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/relay/incident', async (_req: Request, res: Response) => {
    try {
      const r = await pool.query(
        `SELECT DISTINCT ON (trace_id) trace_id, created_at AS locked_since, incident_preserve
         FROM relay_events WHERE incident_preserve = TRUE
         ORDER BY trace_id, created_at DESC LIMIT 100`
      );
      res.json({ count: r.rows.length, incidents: r.rows, timestamp: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ── P2.3 — Replay verification: hash chain + deterministic evidence ────────────
  router.get('/relay/replay/:trace_id', async (req: Request, res: Response) => {
    const { trace_id } = req.params;
    try {
      const [eventsR, spansR] = await Promise.all([
        withDbTimeout(
          pool.query(
            `SELECT trace_id, src_did, dst_did, route_status, fallback_used,
                    payload_hash, previous_hash, current_hash, created_at, incident_preserve
             FROM relay_events WHERE trace_id = $1 ORDER BY created_at ASC`,
            [trace_id]
          ),
          'replay/events'
        ),
        withDbTimeout(
          pool.query(
            `SELECT span_id, operation, src_did, dst_did, provider_did,
                    latency_ms, status, fallback_used, claim_level, started_at, ended_at
             FROM relay_spans WHERE trace_id = $1 ORDER BY started_at ASC`,
            [trace_id]
          ),
          'replay/spans'
        ),
      ]);

      if (eventsR.rows.length === 0 && spansR.rows.length === 0) {
        return res.status(404).json({ error: 'trace_id not found', trace_id });
      }

      // Verify hash chain integrity (relay_events are the canonical ledger)
      let chain_valid = true;
      let chain_error: string | null = null;
      let prev_hash = '0'.repeat(64);
      let seq = 0;
      const chain_steps: Array<{ seq: number; current_hash: string; previous_hash: string; valid: boolean }> = [];
      for (const ev of eventsR.rows) {
        const step_ok = !ev.previous_hash || ev.previous_hash === prev_hash || prev_hash === '0'.repeat(64);
        if (!step_ok && chain_valid) {
          chain_valid = false;
          chain_error = `broken at ${ev.created_at}: expected_prev=${prev_hash.slice(0, 8)}, got=${(ev.previous_hash || '').slice(0, 8)}`;
        }
        chain_steps.push({ seq: seq++, current_hash: (ev.current_hash || '').slice(0, 16), previous_hash: (ev.previous_hash || '').slice(0, 16), valid: step_ok });
        prev_hash = ev.current_hash || prev_hash;
      }

      // Deterministic evidence fingerprint — SHA-256 over canonical event fields
      const evidence_input = eventsR.rows
        .map((e: any) => `${e.trace_id}|${e.src_did}|${e.dst_did}|${e.route_status}|${e.current_hash}`)
        .join('\n');
      const evidence_fingerprint = sha256(evidence_input || trace_id);

      return res.json({
        trace_id,
        replay_verified: chain_valid,
        evidence_fingerprint,
        chain_error,
        chain_steps,
        events: eventsR.rows,
        spans: spansR.rows,
        summary: {
          event_count: eventsR.rows.length,
          span_count: spansR.rows.length,
          chain_steps: chain_steps.length,
          chain_valid,
          incident_preserved: eventsR.rows.some((e: any) => e.incident_preserve),
          total_latency_ms: spansR.rows.reduce((s: number, r: any) => s + (r.latency_ms || 0), 0),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}

// ─── Operator Override Router ─────────────────────────────────────────────────

export function createOperatorRouter(pool: pg.Pool): Router {
  const router = Router();

  async function logOperatorAction(pool: pg.Pool, operation: string, action_type: string, actor: string, target: string | null, reason: string | null, payload: any) {
    const trace_id = makeTraceId();
    let previous_hash = '0'.repeat(64);
    try {
      const prev = await pool.query('SELECT hash FROM operator_actions ORDER BY created_at DESC LIMIT 1');
      if (prev.rows.length > 0 && prev.rows[0].hash) previous_hash = prev.rows[0].hash;
    } catch (_) {}
    const hash = sha256(JSON.stringify({ operation, action_type, actor, trace_id }) + previous_hash);
    try {
      await pool.query(
        `INSERT INTO operator_actions
           (trace_id, operation, action_type, actor, operator_id, target, reason, payload, hash, previous_hash)
         VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9)`,
        [trace_id, operation, action_type, actor, target, reason, JSON.stringify(payload), hash, previous_hash]
      );
    } catch (_) {}
    appendReplayLog({ trace_id, ts: new Date().toISOString(), event: `operator.${action_type}`, actor, operation, hash, previous_hash });
    return { trace_id, hash };
  }

  // Status
  router.get('/status', (req: Request, res: Response) => {
    res.json({
      relay_frozen: freezeState.relay,
      memory_frozen: freezeState.memory,
      governance_paused: freezeState.governance,
      timestamp: new Date().toISOString(),
    });
  });

  // Override / emergency actions
  router.post('/override', async (req: Request, res: Response) => {
    const { intent_id, action, operator_id, reason } = req.body;
    if (!action) return res.status(400).json({ error: 'action is required' });

    if (action === 'emergency_stop') {
      freezeState.relay = true;
      freezeState.memory = true;
      freezeState.governance = true;
    }

    const { trace_id, hash } = await logOperatorAction(
      pool, 'override', action, operator_id || 'operator', intent_id || null, reason || null, req.body
    );

    res.json({ success: true, action, trace_id, hash, timestamp: new Date().toISOString() });
  });

  // Freeze relay
  router.post('/freeze-relay', async (req: Request, res: Response) => {
    freezeState.relay = true;
    const { trace_id, hash } = await logOperatorAction(pool, 'freeze', 'freeze_relay', req.body.operator_id || 'operator', 'relay', req.body.reason || null, {});
    res.json({ success: true, relay_frozen: true, trace_id, hash, timestamp: new Date().toISOString() });
  });

  // Unfreeze relay
  router.post('/unfreeze-relay', async (req: Request, res: Response) => {
    freezeState.relay = false;
    const { trace_id, hash } = await logOperatorAction(pool, 'unfreeze', 'unfreeze_relay', req.body.operator_id || 'operator', 'relay', null, {});
    res.json({ success: true, relay_frozen: false, trace_id, hash, timestamp: new Date().toISOString() });
  });

  // Freeze memory
  router.post('/freeze-memory', async (req: Request, res: Response) => {
    freezeState.memory = true;
    const { trace_id, hash } = await logOperatorAction(pool, 'freeze', 'freeze_memory', req.body.operator_id || 'operator', 'memory', req.body.reason || null, {});
    res.json({ success: true, memory_frozen: true, trace_id, hash, timestamp: new Date().toISOString() });
  });

  // Unfreeze memory
  router.post('/unfreeze-memory', async (req: Request, res: Response) => {
    freezeState.memory = false;
    const { trace_id, hash } = await logOperatorAction(pool, 'unfreeze', 'unfreeze_memory', req.body.operator_id || 'operator', 'memory', null, {});
    res.json({ success: true, memory_frozen: false, trace_id, hash, timestamp: new Date().toISOString() });
  });

  // Export audit
  router.post('/export-audit', async (req: Request, res: Response) => {
    try {
      const rows = await pool.query(
        `SELECT * FROM operator_actions ORDER BY created_at DESC LIMIT 1000`
      );
      res.json(rows.rows);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // Relay replay log reader (last N events from DB)
  router.get('/relay/replay', async (req: Request, res: Response) => {
    const limit = Math.min(parseInt((req.query.limit as string) || '100', 10), 1000);
    const since = req.query.since as string | undefined;
    try {
      const params: any[] = [limit];
      const sinceClause = since ? 'AND created_at > $2' : '';
      if (since) params.push(since);
      const rows = await pool.query(
        `SELECT trace_id, intent_id, src_did, dst_did, route_status, fallback_used,
                payload_hash, previous_hash, current_hash, created_at
         FROM relay_events
         WHERE 1=1 ${sinceClause}
         ORDER BY created_at DESC LIMIT $1`,
        params
      );
      res.json({
        events: rows.rows,
        count: rows.rows.length,
        replay_integrity: rows.rows.length > 0 ? 'hash_chain_available' : 'empty',
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  return router;
}
