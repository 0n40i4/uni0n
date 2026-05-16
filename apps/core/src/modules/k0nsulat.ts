import { Router, Request, Response } from 'express';
import * as pg from 'pg';

export function createK0nsultatRouter(pool: pg.Pool): Router {
  const router = Router();

  router.get('/status', async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) as total_audits,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_audits,
          SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified_agents
        FROM k0nsulat_audit
        FULL OUTER JOIN k0nsulat_verifications ON k0nsulat_audit.agent_did = k0nsulat_verifications.agent_did`
      );

      const stats = result.rows[0] || {};

      res.json({
        module: 'K0NSULAT',
        did: 'did:unionai:s4:k0nsulat',
        status: 'operational',
        timestamp: new Date().toISOString(),
        stats: {
          total_audits: parseInt(stats.total_audits) || 0,
          completed_audits: parseInt(stats.completed_audits) || 0,
          verified_agents: parseInt(stats.verified_agents) || 0
        },
        version: '0.1.0'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Status check failed',
        message: (error as Error).message
      });
    }
  });

  router.post('/audit', async (req: Request, res: Response) => {
    try {
      const { event_type, agent_did, agent_id, action, details } = req.body;

      if (!event_type || !action) {
        return res.status(400).json({
          error: 'Missing required fields: event_type, action'
        });
      }

      const result = await pool.query(
        `INSERT INTO k0nsulat_audit (event_type, agent_did, agent_id, action, details, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING id, timestamp, status`,
        [event_type, agent_did || null, agent_id || null, action, JSON.stringify(details || {})]
      );

      res.status(201).json({
        success: true,
        audit_id: result.rows[0].id,
        timestamp: result.rows[0].timestamp,
        message: 'Audit event recorded'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Audit logging failed',
        message: (error as Error).message
      });
    }
  });

  router.post('/verify', async (req: Request, res: Response) => {
    try {
      const { agent_did, agent_id } = req.body;

      if (!agent_did) {
        return res.status(400).json({
          error: 'Missing required field: agent_did'
        });
      }

      // === REAL VERIFICATION — 5-criterion scoring (20 pts each) ===
      let security_score = 0;
      const criteria: Record<string, boolean> = {};

      // Criterion 1: DID format — must start with "did:"
      criteria.did_format_valid = agent_did.startsWith('did:');
      if (criteria.did_format_valid) security_score += 20;

      // Criterion 2: Agent exists in agents table
      const agentCheck = await pool.query(
        `SELECT id, did, trust_tier, last_seen FROM agents WHERE did = $1`,
        [agent_did]
      );
      criteria.agent_exists = agentCheck.rows.length > 0;
      if (criteria.agent_exists) security_score += 20;

      const agent = agentCheck.rows[0] || null;

      // Criterion 3: trust_tier >= T1 (stored as integer 1, 2, 3... or string 'T1','T2'...)
      if (agent) {
        const tier = agent.trust_tier;
        const tierNum = typeof tier === 'number' ? tier : parseInt(String(tier).replace(/\D/g, ''), 10);
        criteria.trust_tier_ok = !isNaN(tierNum) && tierNum >= 1;
      } else {
        criteria.trust_tier_ok = false;
      }
      if (criteria.trust_tier_ok) security_score += 20;

      // Criterion 4: Agent was active in last 24 hours (last_seen)
      if (agent && agent.last_seen) {
        const lastSeen = new Date(agent.last_seen);
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        criteria.recently_active = lastSeen >= cutoff;
      } else {
        criteria.recently_active = false;
      }
      if (criteria.recently_active) security_score += 20;

      // Criterion 5: No open incidents for this DID
      const incidentCheck = await pool.query(
        `SELECT COUNT(*) as cnt FROM k0nsulat_audit
         WHERE agent_did = $1 AND status = 'incident' AND event_type = 'incident'`,
        [agent_did]
      );
      const openIncidents = parseInt(incidentCheck.rows[0]?.cnt ?? '0', 10);
      criteria.no_open_incidents = openIncidents === 0;
      if (criteria.no_open_incidents) security_score += 20;

      // Derived fields
      const audit_passed = security_score >= 60;
      let verification_status: string;
      if (security_score >= 80) {
        verification_status = 'verified';
      } else if (security_score >= 60) {
        verification_status = 'conditional';
      } else {
        verification_status = 'rejected';
      }

      // Insert or update verification record
      const verifyResult = await pool.query(
        `INSERT INTO k0nsulat_verifications (agent_did, verification_status, security_score, audit_passed)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (agent_did) DO UPDATE SET
           verification_status = $2,
           security_score = $3,
           audit_passed = $4,
           created_at = NOW()
         RETURNING id, verification_status, security_score, audit_passed`,
        [agent_did, verification_status, security_score, audit_passed]
      );

      // Log this verification to audit
      const agentDbId = agent ? agent.id : null;
      await pool.query(
        `INSERT INTO k0nsulat_audit (event_type, agent_did, agent_id, action, status, details)
         VALUES ($1, $2, $3, $4, 'completed', $5)`,
        [
          'agent_verification',
          agent_did,
          agent_id || agentDbId,
          `Agent verified with score ${security_score} — ${verification_status}`,
          JSON.stringify({ security_score, verification_status, audit_passed, criteria })
        ]
      );

      res.json({
        agent_did,
        verification_status: verifyResult.rows[0].verification_status,
        security_score: verifyResult.rows[0].security_score,
        audit_passed: verifyResult.rows[0].audit_passed,
        criteria,
        verified_at: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Verification failed',
        message: (error as Error).message
      });
    }
  });

  return router;
}
