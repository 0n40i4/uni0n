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

      const SERVICE_VERSION = process.env.SERVICE_VERSION || process.env.APP_VERSION || process.env.npm_package_version || 'unknown';

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
        version: SERVICE_VERSION
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

      // Check if agent exists in agents table
      const agentCheck = await pool.query(
        'SELECT id, did, provider, score FROM agents WHERE did = $1',
        [agent_did]
      );

      if (agentCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Agent not found'
        });
      }

      const agent = agentCheck.rows[0];
      let verification_status = 'verified';
      let security_score = 75;

      if (agent.score > 80) {
        security_score = 90;
        verification_status = 'verified_high';
      } else if (agent.score < 30) {
        security_score = 40;
        verification_status = 'suspicious';
      }

      // Insert or update verification record
      const verifyResult = await pool.query(
        `INSERT INTO k0nsulat_verifications (agent_did, verification_status, security_score, audit_passed)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (agent_did) DO UPDATE SET
           verification_status = $2,
           security_score = $3,
           created_at = NOW()
         RETURNING id, verification_status, security_score`,
        [agent_did, verification_status, security_score]
      );

      // Log this verification to audit
      await pool.query(
        `INSERT INTO k0nsulat_audit (event_type, agent_did, agent_id, action, status, details)
         VALUES ($1, $2, $3, $4, 'completed', $5)`,
        [
          'agent_verification',
          agent_did,
          agent_id || agent.id,
          `Agent verified with score ${security_score}`,
          JSON.stringify({ security_score, status: verification_status })
        ]
      );

      res.json({
        agent_did,
        verification_status: verifyResult.rows[0].verification_status,
        security_score: verifyResult.rows[0].security_score,
        audit_passed: true,
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
