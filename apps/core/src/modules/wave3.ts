/**
 * UNIONAI Ω∞ — Wave 3: Semantic Relay MVP, DID-lite, Memory, Trust, Governance
 * K0NSULAT/CORE — source of truth implementation
 * Status: GO CONTROLLED
 */

import { Router, Request, Response } from 'express';
import * as pg from 'pg';
import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTraceId(): string {
  return 'tr-' + crypto.randomUUID();
}

function makeAnchorId(): string {
  return 'anc-' + crypto.randomUUID();
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
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

// Trust tier from score
function trustTier(score: number): { tier: string; status: string; permissions: string[] } {
  if (score >= 900) return { tier: 'T4', status: 'ORACLE',      permissions: ['route','relay','memory_write','governance','review'] };
  if (score >= 700) return { tier: 'T3', status: 'FEDERATION',  permissions: ['route','relay','memory_write','governance'] };
  if (score >= 400) return { tier: 'T2', status: 'VERIFIED',    permissions: ['route','relay','memory_write'] };
  if (score >= 100) return { tier: 'T1', status: 'PROBATION',   permissions: ['route','relay'] };
  return             { tier: 'T0', status: 'UNTRUSTED',         permissions: ['read'] };
}

// Minimal MVSS-v0 validator
function validateMVSS(body: any): { valid: boolean; error?: string } {
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

  -- Extend pre-existing tables (columns missing if table was created before Wave 3)
  ALTER TABLE memory_anchors ADD COLUMN IF NOT EXISTS payload JSONB;
  ALTER TABLE memory_anchors ADD COLUMN IF NOT EXISTS semantic_hash VARCHAR(64);
  ALTER TABLE memory_anchors ADD COLUMN IF NOT EXISTS delta_hash VARCHAR(64);
  ALTER TABLE memory_anchors ADD COLUMN IF NOT EXISTS trust_tier_required VARCHAR(5) DEFAULT 'T1';
  ALTER TABLE memory_anchors ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'pending';
  ALTER TABLE governance_events ADD COLUMN IF NOT EXISTS justification TEXT;
  ALTER TABLE governance_events ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);
  ALTER TABLE governance_events ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(64);
`;

// ─── Routers ──────────────────────────────────────────────────────────────────

export function createWave3Router(pool: pg.Pool): Router {
  const router = Router();

  // ── POST /api/relay/send ──────────────────────────────────────────────────
  router.post('/relay/send', async (req: Request, res: Response) => {
    if (freezeState.relay) {
      return res.status(503).json({ error: 'RELAY_FROZEN', message: 'Relay is frozen by operator' });
    }
    const validation = validateMVSS(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'MVSS_INVALID', message: validation.error });
    }
    const body = req.body;
    const trace_id = makeTraceId();
    const payload_hash = sha256(JSON.stringify(body));

    // Get previous hash for chain
    let previous_hash = '0000000000000000000000000000000000000000000000000000000000000000';
    try {
      const prev = await pool.query(
        'SELECT current_hash FROM relay_events ORDER BY created_at DESC LIMIT 1'
      );
      if (prev.rows.length > 0 && prev.rows[0].current_hash) {
        previous_hash = prev.rows[0].current_hash;
      }
    } catch (_) {}

    const current_hash = sha256(previous_hash + payload_hash + trace_id);

    // Trust check
    let trust_tier_val = 'T0';
    try {
      const agent = await pool.query('SELECT trust_score, trust_tier FROM agents WHERE did = $1', [body.src_did]);
      if (agent.rows.length > 0) {
        trust_tier_val = agent.rows[0].trust_tier || 'T1';
      } else {
        trust_tier_val = 'T1'; // unknown agent: probation
      }
    } catch (_) {}

    const date = new Date().toISOString().slice(0, 10);
    const replay_log_path = `logs/replay/relay-${date}.jsonl`;

    // Save to DB
    try {
      await pool.query(
        `INSERT INTO relay_events
           (trace_id, intent_id, src_did, dst_did, route_status, semantic_score,
            fallback_used, payload_hash, previous_hash, current_hash, replay_log_path)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          trace_id, body.intent_id || null, body.src_did, body.dst_did || null,
          'received', body.semantic?.similarity || 0,
          false, payload_hash, previous_hash, current_hash, replay_log_path
        ]
      );
    } catch (e) {
      console.warn('[relay/send] DB insert error:', (e as Error).message);
    }

    // JSONL replay log
    appendReplayLog({
      trace_id, ts: new Date().toISOString(),
      event: 'relay.send',
      src_did: body.src_did, dst_did: body.dst_did,
      intent_type: body.intent?.type,
      payload_hash, previous_hash, current_hash,
      trust_tier: trust_tier_val,
    });

    res.status(201).json({
      success: true,
      trace_id,
      status: 'received',
      trust_tier: trust_tier_val,
      hash: current_hash,
      replay_log: replay_log_path,
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
    const trace_id = makeTraceId();

    // Trust gating
    let score = trust?.score || 100;
    let tier = trust?.tier;
    try {
      const agent = await pool.query('SELECT trust_score, trust_tier FROM agents WHERE did = $1', [src_did]);
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

    // Routing logic P0: syntactic fallback (no Qdrant yet)
    const fallback_used = !intent_embedding;
    let target_did: string | null = null;
    let route_type = 'syntactic_fallback';

    if (!fallback_used) {
      route_type = 'semantic';
    }

    // Find candidate agents with matching capabilities
    try {
      const caps = intent?.type || 'relay';
      const candidates = await pool.query(
        `SELECT did, trust_score, trust_tier, capability_manifest
         FROM agents
         WHERE status = 'active' AND did != $1
         ORDER BY trust_score DESC LIMIT 5`,
        [src_did]
      );
      if (candidates.rows.length > 0) {
        target_did = candidates.rows[0].did;
      }
    } catch (_) {}

    const payload_hash = sha256(JSON.stringify(req.body));
    const previous_hash = '0'.repeat(64);
    const current_hash = sha256(previous_hash + payload_hash + trace_id);

    // Save relay event
    try {
      await pool.query(
        `INSERT INTO relay_events
           (trace_id, src_did, dst_did, route_status, fallback_used, payload_hash, current_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [trace_id, src_did, target_did, 'routed', fallback_used, payload_hash, current_hash]
      );
    } catch (_) {}

    appendReplayLog({
      trace_id, ts: new Date().toISOString(),
      event: 'relay.route',
      src_did, target_did, route_type, fallback_used,
      payload_hash, current_hash,
    });

    res.json({
      trace_id,
      target_did,
      route_type,
      fallback_used,
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

  return router;
}
