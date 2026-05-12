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

  return router;
}
