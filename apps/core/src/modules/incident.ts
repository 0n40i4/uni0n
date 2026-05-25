import { Pool } from 'pg';
import crypto from 'crypto';

export interface IncidentReport {
  id: number;
  title: string;
  severity: 'LOW' | 'MAJOR' | 'CRITICAL';
  status: 'OPEN' | 'FROZEN' | 'RESOLVED' | 'EXPORTED';
  description?: string;
  incident_type?: string;
  hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface IncidentAction {
  id: number;
  incident_id: number;
  action: string;
  actor?: string;
  actor_did?: string;
  timestamp: Date;
}

export async function createIncident(
  pool: Pool,
  title: string,
  severity: 'LOW' | 'MAJOR' | 'CRITICAL',
  description?: string,
  incidentType?: string
): Promise<IncidentReport> {
  // MINOR-14 (pentest RSpace): hash oparty o treść incydentu (deterministyczny,
  // niemanipulowalny przez timing) zamiast title + Date.now().
  const hash = crypto
    .createHash('sha256')
    .update(title + '|' + severity + '|' + (incidentType || '') + '|' + (description || ''))
    .digest('hex');

  const result = await pool.query(
    'INSERT INTO incident_reports (title, severity, description, incident_type, hash, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [title, severity, description, incidentType, hash, 'OPEN']
  );

  return result.rows[0] as IncidentReport;
}

export async function getIncident(pool: Pool, incidentId: number): Promise<{
  report: IncidentReport;
  actions: IncidentAction[];
}> {
  const reportResult = await pool.query(
    'SELECT * FROM incident_reports WHERE id = $1',
    [incidentId]
  );

  if (reportResult.rows.length === 0) {
    throw new Error('Incident ' + incidentId + ' not found');
  }

  const actionsResult = await pool.query(
    'SELECT * FROM incident_actions WHERE incident_id = $1 ORDER BY timestamp DESC',
    [incidentId]
  );

  return {
    report: reportResult.rows[0] as IncidentReport,
    actions: actionsResult.rows as IncidentAction[]
  };
}

export async function listIncidents(pool: Pool): Promise<IncidentReport[]> {
  const result = await pool.query(
    'SELECT * FROM incident_reports ORDER BY created_at DESC'
  );

  return result.rows as IncidentReport[];
}

export async function freezeIncident(
  pool: Pool,
  incidentId: number,
  actor: string,
  actorDid: string
): Promise<IncidentAction> {
  await pool.query(
    'UPDATE incident_reports SET status = $1, updated_at = NOW() WHERE id = $2',
    ['FROZEN', incidentId]
  );

  const actionResult = await pool.query(
    'INSERT INTO incident_actions (incident_id, action, actor, actor_did) VALUES ($1, $2, $3, $4) RETURNING *',
    [incidentId, 'FREEZE', actor, actorDid]
  );

  return actionResult.rows[0] as IncidentAction;
}

export async function exportIncident(
  pool: Pool,
  incidentId: number
): Promise<{
  report: IncidentReport;
  actions: IncidentAction[];
  exported_at: Date;
}> {
  const { report, actions } = await getIncident(pool, incidentId);

  await pool.query(
    'UPDATE incident_reports SET status = $1, updated_at = NOW() WHERE id = $2',
    ['EXPORTED', incidentId]
  );

  return {
    report: { ...report, status: 'EXPORTED' },
    actions,
    exported_at: new Date()
  };
}

export async function addIncidentAction(
  pool: Pool,
  incidentId: number,
  action: string,
  actor: string,
  actorDid?: string
): Promise<IncidentAction> {
  const result = await pool.query(
    'INSERT INTO incident_actions (incident_id, action, actor, actor_did) VALUES ($1, $2, $3, $4) RETURNING *',
    [incidentId, action, actor, actorDid || null]
  );

  return result.rows[0] as IncidentAction;
}
