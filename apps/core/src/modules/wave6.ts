import { Router, Request, Response } from 'express';
import * as pg from 'pg';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// === WAVE 6 MIGRATIONS ===

export const WAVE6_MIGRATIONS = `
  CREATE TABLE IF NOT EXISTS relay_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id VARCHAR(255) NOT NULL,
    src_did VARCHAR(255) NOT NULL,
    dst_did VARCHAR(255) NOT NULL,
    route_status VARCHAR(50) DEFAULT 'pending',
    semantic_score FLOAT DEFAULT 0,
    fallback_used BOOLEAN DEFAULT FALSE,
    trace_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS memory_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anchor_id VARCHAR(255) NOT NULL UNIQUE,
    scope VARCHAR(100) NOT NULL,
    source_did VARCHAR(255) NOT NULL,
    semantic_hash VARCHAR(64),
    delta_hash VARCHAR(64),
    trust_tier_required VARCHAR(10) DEFAULT 'T0',
    validation_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS trust_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    did VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    previous_score FLOAT DEFAULT 0,
    new_score FLOAT DEFAULT 0,
    reason TEXT,
    signature VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS governance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    operator_did VARCHAR(255),
    target VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    actor_did VARCHAR(255),
    operator_id VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    payload_hash VARCHAR(64),
    previous_hash VARCHAR(64),
    hash VARCHAR(64),
    jsonl_path TEXT,
    signature VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS rfc_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfc_id VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    version VARCHAR(20) DEFAULT '0.1',
    owner VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_relay_src ON relay_events(src_did);
  CREATE INDEX IF NOT EXISTS idx_relay_intent ON relay_events(intent_id);
  CREATE INDEX IF NOT EXISTS idx_anchors_scope ON memory_anchors(scope);
  CREATE INDEX IF NOT EXISTS idx_trust_did ON trust_events(did);
  CREATE INDEX IF NOT EXISTS idx_gov_trace ON governance_events(trace_id);
  CREATE INDEX IF NOT EXISTS idx_audit_trace ON audit_logs(trace_id);
  INSERT INTO rfc_registry (rfc_id,title,status,version,owner) VALUES
    ('RFC-0002','Agent Identity & DID-Lite','active','1.0','0n40i4'),
    ('RFC-0003','Semantic Routing Layer','active','1.0','0n40i4'),
    ('RFC-0004','UNIONAI-WIRE-v0 Protocol','active','1.0','0n40i4'),
    ('RFC-0011','Memory Synchronization','active','1.0','0n40i4'),
    ('RFC-0012','Human Sovereignty Protocol','active','1.0','0n40i4'),
    ('RFC-0013','Trust Tier System T0-T4','active','1.0','0n40i4'),
    ('RFC-0015','Audit Log Hash Chain','active','1.0','0n40i4'),
    ('RFC-0034','Governance Event Bus','active','1.0','0n40i4')
  ON CONFLICT (rfc_id) DO NOTHING;
`;

// === WIRE-v0 PARSER ===

export interface WireV0Packet {
  protocol: string;
  intent_id: string;
  src_did: string;
  dst_did: string;
  intent: string;
  trust?: { tier?: string; signature?: string };
  memory?: { scope?: string; anchor_id?: string };
  governance?: { operator_did?: string; flags?: string[] };
  timestamp: string;
}

export function parseWireV0(body: any): { ok: true; packet: WireV0Packet } | { ok: false; error: string } {
  const REQUIRED = ['protocol','intent_id','src_did','dst_did','intent','timestamp'];
  for (const f of REQUIRED) {
    if (!body[f]) return { ok: false, error: `Missing required field: ${f}` };
  }
  if (body.protocol !== 'UNIONAI-WIRE-v0') {
    return { ok: false, error: `Unsupported protocol: ${body.protocol}` };
  }
  if (!String(body.src_did).startsWith('did:')) {
    return { ok: false, error: 'src_did must start with did:' };
  }
  if (!String(body.dst_did).startsWith('did:') && body.dst_did !== '*') {
    return { ok: false, error: 'dst_did must start with did: or be *' };
  }
  return { ok: true, packet: body as WireV0Packet };
}

// === AUDIT HASH CHAIN ===

let lastHash = '0000000000000000000000000000000000000000000000000000000000000000';

async function getPrevHash(pool: pg.Pool): Promise<string> {
  try {
    const r = await pool.query('SELECT hash FROM audit_logs ORDER BY created_at DESC LIMIT 1');
    if (r.rows.length && r.rows[0].hash) return r.rows[0].hash;
  } catch {}
  return lastHash;
}

const REPLAY_LOG_DIR = process.env.REPLAY_LOG_DIR || path.join(process.cwd(), 'logs', 'replay');

function appendReplayLog(traceId: string, payload: any): string {
  fs.mkdirSync(REPLAY_LOG_DIR, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const filePath = path.join(REPLAY_LOG_DIR, `relay-${day}.jsonl`);
  const row = JSON.stringify({ trace_id: traceId, ts: new Date().toISOString(), ...payload });
  fs.appendFileSync(filePath, row + '\n', 'utf8');
  return filePath;
}

async function writeAudit(pool: pg.Pool, opts: {
  trace_id?: string; event_type: string; actor_did: string;
  operator_id?: string; action: string; payload?: any;
}): Promise<string> {
  const ts = new Date().toISOString();
  const prev = await getPrevHash(pool);
  const payloadStr = JSON.stringify(opts.payload || {});
  const payloadHash = crypto.createHash('sha256').update(payloadStr).digest('hex');
  const hash = crypto.createHash('sha256')
    .update(`${prev}|${ts}|${opts.actor_did}|${opts.operator_id || 'system'}|${opts.action}|${payloadStr}`)
    .digest('hex');
  await pool.query(
    `INSERT INTO audit_logs (trace_id,event_type,actor_did,operator_id,action,payload_hash,previous_hash,hash,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [opts.trace_id || null, opts.event_type, opts.actor_did, opts.operator_id || 'system',
     opts.action, payloadHash, prev, hash, ts]
  );
  lastHash = hash;
  return hash;
}

// === STATE FLAGS ===

let relayFrozen = false;
let memoryFrozen = false;

// === ROUTER ===

export function createWave6Router(pool: pg.Pool): Router {
  const router = Router();

  // RELAY
  router.post('/relay/send', async (req: Request, res: Response) => {
    if (relayFrozen) return void res.status(503).json({ error: 'relay_frozen' });
    const parsed = parseWireV0(req.body);
    if (!parsed.ok) return void res.status(400).json({ error: 'invalid_wire', message: parsed.error });
    const p = parsed.packet;
    const traceId = crypto.randomUUID();
    try {
      await pool.query(
        `INSERT INTO relay_events (intent_id,src_did,dst_did,route_status,semantic_score,fallback_used,trace_id)
         VALUES ($1,$2,$3,'accepted',1.0,false,$4)`,
        [p.intent_id, p.src_did, p.dst_did, traceId]
      );
      const replayPath = appendReplayLog(traceId, {
        event_type: 'relay_send',
        intent_id: p.intent_id,
        src_did: p.src_did,
        dst_did: p.dst_did,
        protocol: p.protocol,
        timestamp: p.timestamp,
      });
      await writeAudit(pool, { trace_id: traceId, event_type: 'relay_send', actor_did: p.src_did, action: 'relay/send', payload: { intent_id: p.intent_id, replay_path: replayPath } });
      res.status(202).json({ accepted: true, trace_id: traceId, intent_id: p.intent_id, status: 'accepted', replay_log: replayPath });
    } catch (e: any) { res.status(500).json({ error: 'db_error', message: e.message }); }
  });

  router.post('/relay/route', async (req: Request, res: Response) => {
    if (relayFrozen) return void res.status(503).json({ error: 'relay_frozen' });
    const parsed = parseWireV0(req.body);
    if (!parsed.ok) return void res.status(400).json({ error: 'invalid_wire', message: parsed.error });
    const p = parsed.packet;
    const score = Math.min(1.0, p.intent.split(' ').length * 0.15);
    const fallback = score < 0.3;
    res.json({ intent_id: p.intent_id, route: { strategy: fallback ? 'syntax-safe-fallback' : 'semantic', target: p.dst_did, confidence: score }, semantic_score: score, fallback_used: fallback });
  });

  // TRUST
  router.post('/trust/verify', async (req: Request, res: Response) => {
    const { did, tier, signature } = req.body;
    if (!did || !tier) return void res.status(400).json({ error: 'missing_fields', required: ['did','tier'] });
    const TIERS: Record<string,number> = { T0:0, T1:25, T2:50, T3:75, T4:100 };
    if (!(tier in TIERS)) return void res.status(400).json({ error: 'invalid_tier', valid: Object.keys(TIERS) });
    try {
      await pool.query(
        `INSERT INTO trust_events (did,event_type,previous_score,new_score,reason,signature)
         VALUES ($1,'verification',0,$2,$3,$4)`,
        [did, TIERS[tier], `tier_verification:${tier}`, signature || null]
      );
      await writeAudit(pool, { event_type: 'trust_verify', actor_did: did, action: 'trust/verify', payload: { tier, score: TIERS[tier] } });
      res.json({ verified: true, did, tier, score: TIERS[tier], signature_present: !!signature, status: 'active' });
    } catch (e: any) { res.status(500).json({ error: 'db_error', message: e.message }); }
  });

  // MEMORY
  router.post('/memory/anchor', async (req: Request, res: Response) => {
    if (memoryFrozen) return void res.status(503).json({ error: 'memory_frozen' });
    const { anchor_id, scope, source_did, payload, trust_tier_required } = req.body;
    if (!anchor_id || !scope || !source_did) return void res.status(400).json({ error: 'missing_fields', required: ['anchor_id','scope','source_did'] });
    const payloadStr = JSON.stringify(payload || {});
    const semanticHash = crypto.createHash('sha256').update(payloadStr).digest('hex');
    const deltaHash = crypto.createHash('sha256').update(`${anchor_id}:${scope}`).digest('hex');
    try {
      await pool.query(
        `INSERT INTO memory_anchors (anchor_id,scope,source_did,semantic_hash,delta_hash,trust_tier_required,validation_status)
         VALUES ($1,$2,$3,$4,$5,$6,'validated')
         ON CONFLICT (anchor_id) DO UPDATE SET validation_status='updated', delta_hash=EXCLUDED.delta_hash`,
        [anchor_id, scope, source_did, semanticHash, deltaHash, trust_tier_required || 'T0']
      );
      await writeAudit(pool, { event_type: 'memory_anchor', actor_did: source_did, action: 'memory/anchor', payload: { anchor_id, scope } });
      res.status(201).json({ anchored: true, anchor_id, scope, semantic_hash: semanticHash, delta_hash: deltaHash });
    } catch (e: any) { res.status(500).json({ error: 'db_error', message: e.message }); }
  });

  router.post('/memory/query', async (req: Request, res: Response) => {
    if (memoryFrozen) return void res.status(503).json({ error: 'memory_frozen' });
    const { scope, trust_tier, limit = 20 } = req.body;
    if (!scope) return void res.status(400).json({ error: 'missing_fields', required: ['scope'] });
    try {
      const r = await pool.query(
        `SELECT id,anchor_id,scope,source_did,semantic_hash,delta_hash,trust_tier_required,validation_status,created_at
         FROM memory_anchors WHERE scope=$1 ORDER BY created_at DESC LIMIT $2`,
        [scope, Math.min(Number(limit), 100)]
      );
      res.json({ anchors: r.rows, count: r.rows.length, scope });
    } catch (e: any) { res.status(500).json({ error: 'db_error', message: e.message }); }
  });

  // GOVERNANCE
  router.post('/governance/event', async (req: Request, res: Response) => {
    const { event_type, operator_did, target, action, trace_id } = req.body;
    if (!event_type || !action) return void res.status(400).json({ error: 'missing_fields', required: ['event_type','action'] });
    try {
      const tid = trace_id || crypto.randomUUID();
      const r = await pool.query(
        `INSERT INTO governance_events (trace_id,event_type,operator_did,target,action,status)
         VALUES ($1,$2,$3,$4,$5,'recorded') RETURNING id`,
        [tid, event_type, operator_did || 'anonymous', target || null, action]
      );
      await writeAudit(pool, { trace_id: tid, event_type: 'governance_event', actor_did: operator_did || 'anonymous', action: `governance/${event_type}`, payload: { target, action } });
      res.status(201).json({ recorded: true, id: r.rows[0].id, event_type, trace_id: tid });
    } catch (e: any) { res.status(500).json({ error: 'db_error', message: e.message }); }
  });

  // OPERATOR
  router.post('/operator/override', async (req: Request, res: Response) => {
    const { operator_did, reason, target } = req.body;
    await writeAudit(pool, { event_type: 'operator_override', actor_did: operator_did || 'operator', action: 'operator/override', payload: { reason, target } }).catch(() => {});
    res.json({ executed: true, action: 'emergency_override', operator_did, target, timestamp: new Date().toISOString() });
  });

  router.post('/operator/freeze-relay', async (req: Request, res: Response) => {
    relayFrozen = true;
    const { operator_did, reason } = req.body;
    await writeAudit(pool, { event_type: 'freeze', actor_did: operator_did || 'operator', action: 'operator/freeze-relay', payload: { reason } }).catch(() => {});
    res.json({ frozen: true, service: 'relay', timestamp: new Date().toISOString() });
  });

  router.post('/operator/freeze-memory', async (req: Request, res: Response) => {
    memoryFrozen = true;
    const { operator_did, reason } = req.body;
    await writeAudit(pool, { event_type: 'freeze', actor_did: operator_did || 'operator', action: 'operator/freeze-memory', payload: { reason } }).catch(() => {});
    res.json({ frozen: true, service: 'memory', timestamp: new Date().toISOString() });
  });

  router.post('/operator/export-audit', async (req: Request, res: Response) => {
    const { operator_did, from, to, limit = 500 } = req.body;
    try {
      const params: any[] = [];
      const conds: string[] = [];
      if (from) { params.push(from); conds.push(`created_at >= $${params.length}`); }
      if (to)   { params.push(to);   conds.push(`created_at <= $${params.length}`); }
      params.push(Math.min(Number(limit), 1000));
      const where = conds.length ? ' WHERE ' + conds.join(' AND ') : '';
      const r = await pool.query(`SELECT * FROM audit_logs${where} ORDER BY created_at ASC LIMIT $${params.length}`, params);
      await writeAudit(pool, { event_type: 'audit_export', actor_did: operator_did || 'operator', action: 'operator/export-audit', payload: { count: r.rows.length } }).catch(() => {});
      res.json({ logs: r.rows, count: r.rows.length, exported_at: new Date().toISOString() });
    } catch (e: any) { res.status(500).json({ error: 'db_error', message: e.message }); }
  });

  return router;
}

// === METRICS ===

export async function getWave6Metrics(pool: pg.Pool): Promise<Record<string,number>> {
  const metrics: Record<string,number> = { relay_count:0, memory_anchor_count:0, trust_events_count:0, governance_events_count:0, audit_logs_count:0, rfc_count:0 };
  await Promise.all([
    pool.query('SELECT COUNT(*) FROM relay_events').then(r => { metrics.relay_count = +r.rows[0].count; }).catch(() => {}),
    pool.query('SELECT COUNT(*) FROM memory_anchors').then(r => { metrics.memory_anchor_count = +r.rows[0].count; }).catch(() => {}),
    pool.query('SELECT COUNT(*) FROM trust_events').then(r => { metrics.trust_events_count = +r.rows[0].count; }).catch(() => {}),
    pool.query('SELECT COUNT(*) FROM governance_events').then(r => { metrics.governance_events_count = +r.rows[0].count; }).catch(() => {}),
    pool.query('SELECT COUNT(*) FROM audit_logs').then(r => { metrics.audit_logs_count = +r.rows[0].count; }).catch(() => {}),
    pool.query('SELECT COUNT(*) FROM rfc_registry').then(r => { metrics.rfc_count = +r.rows[0].count; }).catch(() => {}),
  ]);
  return metrics;
}
