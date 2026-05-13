import { Router, Request, Response } from 'express';
import * as pg from 'pg';
import * as crypto from 'crypto';
import { ensureCollection, upsertIntent, searchSimilarIntents, keywordVector } from './qdrant';

// === WAVE 7 MIGRATION PATCH ===

export const WAVE7_MIGRATIONS = `
  -- Add scope CHECK constraint (safe: ignore if already exists)
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'memory_anchors_scope_check'
        AND table_name = 'memory_anchors'
    ) THEN
      ALTER TABLE memory_anchors
        ADD CONSTRAINT memory_anchors_scope_check
        CHECK (scope IN ('PUBLIC','FEDERATION','PRIVATE','EPHEMERAL'));
    END IF;
  END $$;

  -- operator_overrides counter table
  CREATE TABLE IF NOT EXISTS operator_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_did VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    reason TEXT,
    trace_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

// === TRUST TIER PERMISSIONS ===

const TIER_LEVEL: Record<string,number> = { T0:0, T1:1, T2:2, T3:3, T4:4 };
const SCOPE_MIN_TIER: Record<string,number> = {
  PUBLIC: 0, FEDERATION: 1, PRIVATE: 3, EPHEMERAL: 0
};
const VALID_SCOPES = ['PUBLIC','FEDERATION','PRIVATE','EPHEMERAL'];

function checkTierPermission(scope: string, callerTier: string): { ok: boolean; reason?: string } {
  const required = SCOPE_MIN_TIER[scope] ?? 0;
  const caller = TIER_LEVEL[callerTier] ?? 0;
  if (caller < required) {
    return { ok: false, reason: `scope ${scope} requires tier T${required}, caller has ${callerTier}` };
  }
  return { ok: true };
}

// === REDIS FLAGS (persistent freeze state) ===

const REDIS_KEY_RELAY = 'unionai:freeze:relay';
const REDIS_KEY_MEMORY = 'unionai:freeze:memory';

async function getFlag(redis: any, key: string): Promise<boolean> {
  if (!redis) return false;
  try {
    const v = await redis.get(key);
    return v === '1';
  } catch { return false; }
}

async function setFlag(redis: any, key: string, value: boolean): Promise<void> {
  if (!redis) return;
  try { await redis.set(key, value ? '1' : '0'); } catch {}
}

// === ROUTER ===

export function createWave7Router(pool: pg.Pool, redis?: any): Router {
  const router = Router();

  // MEMORY/ANCHOR — with scope CHECK + trust tier validation
  router.post('/memory/anchor', async (req: Request, res: Response) => {
    if (await getFlag(redis, REDIS_KEY_MEMORY)) {
      return void res.status(503).json({ error: 'memory_frozen', message: 'Memory zamrozony przez operatora' });
    }
    const { anchor_id, scope, source_did, semantic_hash, delta_hash, trust_tier_required, payload } = req.body;
    if (!anchor_id || !scope || !source_did) {
      return void res.status(400).json({ error: 'missing_fields', required: ['anchor_id','scope','source_did'] });
    }
    if (!VALID_SCOPES.includes(scope)) {
      return void res.status(400).json({ error: 'invalid_scope', valid: VALID_SCOPES });
    }
    const callerTier = trust_tier_required || 'T0';
    const perm = checkTierPermission(scope, callerTier);
    if (!perm.ok) return void res.status(403).json({ error: 'insufficient_tier', reason: perm.reason });

    const payloadStr = JSON.stringify(payload || {});
    const sHash = semantic_hash || crypto.createHash('sha256').update(payloadStr).digest('hex');
    const dHash = delta_hash || crypto.createHash('sha256').update(`${anchor_id}:${scope}`).digest('hex');

    try {
      await pool.query(
        `INSERT INTO memory_anchors (anchor_id,scope,source_did,semantic_hash,delta_hash,trust_tier_required,validation_status)
         VALUES ($1,$2,$3,$4,$5,$6,'validated')
         ON CONFLICT (anchor_id) DO UPDATE SET
           scope=EXCLUDED.scope, semantic_hash=EXCLUDED.semantic_hash,
           delta_hash=EXCLUDED.delta_hash, validation_status='updated'`,
        [anchor_id, scope, source_did, sHash, dHash, callerTier]
      );
      res.status(201).json({ anchor_id, status: 'ok', validation_status: 'validated', scope, semantic_hash: sHash, delta_hash: dHash });
    } catch (e: any) { res.status(500).json({ error: 'db_error', message: e.message }); }
  });

  // MEMORY/QUERY — with permission check
  router.post('/memory/query', async (req: Request, res: Response) => {
    if (await getFlag(redis, REDIS_KEY_MEMORY)) {
      return void res.status(503).json({ error: 'memory_frozen' });
    }
    const { scope, source_did, filters, limit = 20, caller_tier = 'T0' } = req.body;
    if (!scope) return void res.status(400).json({ error: 'missing_fields', required: ['scope'] });
    if (scope !== '*' && !VALID_SCOPES.includes(scope)) {
      return void res.status(400).json({ error: 'invalid_scope', valid: VALID_SCOPES });
    }
    const perm = checkTierPermission(scope === '*' ? 'PUBLIC' : scope, caller_tier);
    if (!perm.ok) return void res.status(403).json({ error: 'insufficient_tier', reason: perm.reason });

    try {
      const params: any[] = [];
      const conds: string[] = [];
      if (scope !== '*') { params.push(scope); conds.push(`scope=$${params.length}`); }
      if (source_did) { params.push(source_did); conds.push(`source_did=$${params.length}`); }
      if (filters?.validation_status) { params.push(filters.validation_status); conds.push(`validation_status=$${params.length}`); }
      params.push(Math.min(Number(limit), 100));
      const where = conds.length ? ' WHERE ' + conds.join(' AND ') : '';
      const r = await pool.query(
        `SELECT id,anchor_id,scope,source_did,semantic_hash,delta_hash,trust_tier_required,validation_status,created_at
         FROM memory_anchors${where} ORDER BY created_at DESC LIMIT $${params.length}`,
        params
      );
      res.json({ anchors: r.rows, count: r.rows.length, scope, caller_tier });
    } catch (e: any) { res.status(500).json({ error: 'db_error', message: e.message }); }
  });

  // RELAY/ROUTE — with Qdrant semantic matching
  router.post('/relay/route', async (req: Request, res: Response) => {
    if (await getFlag(redis, REDIS_KEY_RELAY)) {
      return void res.status(503).json({ error: 'relay_frozen' });
    }
    const { protocol, intent_id, src_did, dst_did, intent, timestamp } = req.body;
    if (!protocol || !intent_id || !src_did || !dst_did || !intent) {
      return void res.status(400).json({ error: 'invalid_wire', message: 'Missing required WIRE-v0 fields' });
    }

    let strategy = 'keyword-fallback';
    let score = Math.min(1.0, intent.split(' ').length * 0.15);
    let candidates: any[] = [];

    // Try Qdrant semantic matching
    try {
      const qVec = keywordVector(intent);
      const results = await searchSimilarIntents(qVec, 3);
      if (results.length > 0) {
        strategy = 'qdrant-semantic';
        score = results[0].score;
        candidates = results;
      }
    } catch { /* fallback to keyword */ }

    res.json({
      intent_id,
      route: {
        strategy,
        target: dst_did,
        confidence: score,
        fallback_used: strategy === 'keyword-fallback' && score < 0.3,
        candidates: candidates.slice(0, 3)
      },
      semantic_score: score
    });
  });

  // OPERATOR/OVERRIDE — persistent + DB record
  router.post('/operator/override', async (req: Request, res: Response) => {
    const { operator_did = 'operator', reason, target } = req.body;
    const traceId = crypto.randomUUID();
    await setFlag(redis, REDIS_KEY_RELAY, true);
    try {
      await pool.query(
        `INSERT INTO operator_overrides (operator_did,action,reason,trace_id) VALUES ($1,'emergency_override',$2,$3)`,
        [operator_did, reason || null, traceId]
      );
      await pool.query(
        `INSERT INTO governance_events (trace_id,event_type,operator_did,target,action,status)
         VALUES ($1,'emergency_override',$2,$3,'override','executed')`,
        [traceId, operator_did, target || '*']
      );
    } catch {}
    res.json({ status: 'STOPPED', trace_id: traceId, operator_did, target, timestamp: new Date().toISOString() });
  });

  // OPERATOR/FREEZE-RELAY
  router.post('/operator/freeze-relay', async (req: Request, res: Response) => {
    const { operator_did = 'operator', reason } = req.body;
    await setFlag(redis, REDIS_KEY_RELAY, true);
    await pool.query(
      `INSERT INTO operator_overrides (operator_did,action,reason) VALUES ($1,'freeze-relay',$2)`,
      [operator_did, reason || null]
    ).catch(() => {});
    res.json({ status: 'FROZEN', service: 'relay', operator_did, timestamp: new Date().toISOString() });
  });

  // OPERATOR/FREEZE-MEMORY
  router.post('/operator/freeze-memory', async (req: Request, res: Response) => {
    const { operator_did = 'operator', reason } = req.body;
    await setFlag(redis, REDIS_KEY_MEMORY, true);
    await pool.query(
      `INSERT INTO operator_overrides (operator_did,action,reason) VALUES ($1,'freeze-memory',$2)`,
      [operator_did, reason || null]
    ).catch(() => {});
    res.json({ status: 'FROZEN', service: 'memory', operator_did, timestamp: new Date().toISOString() });
  });

  // OPERATOR/EXPORT-AUDIT
  router.post('/operator/export-audit', async (req: Request, res: Response) => {
    const { operator_did = 'operator', from, to, limit = 500 } = req.body;
    try {
      const params: any[] = [];
      const conds: string[] = [];
      if (from) { params.push(from); conds.push(`created_at >= $${params.length}`); }
      if (to)   { params.push(to);   conds.push(`created_at <= $${params.length}`); }
      params.push(Math.min(Number(limit), 1000));
      const where = conds.length ? ' WHERE ' + conds.join(' AND ') : '';
      const r = await pool.query(`SELECT * FROM audit_logs${where} ORDER BY created_at ASC LIMIT $${params.length}`, params);
      const exportHash = crypto.createHash('sha256').update(JSON.stringify(r.rows)).digest('hex');
      res.json({ logs: r.rows, count: r.rows.length, hash: exportHash, exported_at: new Date().toISOString() });
    } catch (e: any) { res.status(500).json({ error: 'db_error', message: e.message }); }
  });

  return router;
}

// === WAVE 7 METRICS ===

export async function getWave7Metrics(pool: pg.Pool): Promise<Record<string,number>> {
  const m: Record<string,number> = {
    relay_events_total: 0, trust_verifications_total: 0, memory_anchors_total: 0,
    governance_events_total: 0, audit_logs_total: 0, agents_registered_total: 0,
    operator_overrides_total: 0
  };
  await Promise.all([
    pool.query('SELECT COUNT(*) FROM relay_events').then(r => { m.relay_events_total = +r.rows[0].count; }).catch(() => {}),
    pool.query("SELECT COUNT(*) FROM trust_events WHERE event_type='verification'").then(r => { m.trust_verifications_total = +r.rows[0].count; }).catch(() => {}),
    pool.query('SELECT COUNT(*) FROM memory_anchors').then(r => { m.memory_anchors_total = +r.rows[0].count; }).catch(() => {}),
    pool.query('SELECT COUNT(*) FROM governance_events').then(r => { m.governance_events_total = +r.rows[0].count; }).catch(() => {}),
    pool.query('SELECT COUNT(*) FROM audit_logs').then(r => { m.audit_logs_total = +r.rows[0].count; }).catch(() => {}),
    pool.query('SELECT COUNT(*) FROM agents').then(r => { m.agents_registered_total = +r.rows[0].count; }).catch(() => {}),
    pool.query('SELECT COUNT(*) FROM operator_overrides').then(r => { m.operator_overrides_total = +r.rows[0].count; }).catch(() => {}),
  ]);
  return m;
}
