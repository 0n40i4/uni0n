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

  return router;
}
