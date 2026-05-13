import { Pool } from 'pg';

export interface FederationMetrics {
  semantic_drift_score: number;
  relay_latency_avg: number;
  memory_poison_rate: number;
  trust_distribution: Record<string, number>;
  governance_concentration: number;
  override_events_total: number;
  relay_failures_total: number;
  timestamp: string;
}

export async function getFederationMetrics(
  pool: Pool,
  redisClient?: any
): Promise<FederationMetrics> {
  try {
    const relayLatencyResult = await pool.query(
      'SELECT AVG(EXTRACT(EPOCH FROM (created_at - NOW())) * 1000) as avg_latency FROM relay_events WHERE created_at > NOW() - INTERVAL ' + "'1 hour'"
    ).catch(() => ({ rows: [{ avg_latency: 0 }] }));
    const relay_latency_avg = relayLatencyResult.rows[0]?.avg_latency || 0;

    const trustResult = await pool.query(
      'SELECT trust_tier, COUNT(*) as count FROM agents GROUP BY trust_tier'
    ).catch(() => ({ rows: [] }));
    const trust_distribution: Record<string, number> = {};
    trustResult.rows.forEach(row => {
      trust_distribution[row.trust_tier] = row.count;
    });

    const overrideResult = await pool.query(
      'SELECT COUNT(*) FROM operator_overrides'
    ).catch(() => ({ rows: [{ count: 0 }] }));
    const override_events_total = parseInt(overrideResult.rows[0]?.count || '0');

    const failureResult = await pool.query(
      'SELECT COUNT(*) FROM relay_events WHERE route_status = ' + "'failed'"
    ).catch(() => ({ rows: [{ count: 0 }] }));
    const relay_failures_total = parseInt(failureResult.rows[0]?.count || '0');

    let semantic_drift_score = 0;
    if (redisClient) {
      try {
        const drift = await redisClient.get('semantic_drift_score');
        semantic_drift_score = drift ? parseFloat(drift) : 0;
      } catch (e) {
        semantic_drift_score = 0;
      }
    }

    const memory_poison_rate = 0;
    const governance_concentration = 0;

    return {
      semantic_drift_score,
      relay_latency_avg,
      memory_poison_rate,
      trust_distribution,
      governance_concentration,
      override_events_total,
      relay_failures_total,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching federation metrics:', error);
    throw error;
  }
}
