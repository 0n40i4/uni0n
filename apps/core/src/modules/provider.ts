import { Pool } from 'pg';
import crypto from 'crypto';

export interface ProviderApplication {
  id: string;
  name: string;
  email: string;
  organization: string;
  api_endpoint?: string;
  confirmation_code: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  reviewed_at?: string;
  reviewer?: string;
}

export async function createProviderApplication(
  pool: Pool,
  name: string,
  email: string,
  organization: string,
  apiEndpoint?: string
): Promise<ProviderApplication> {
  const id = 'PROV-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  const confirmationCode = 'CONFIRM-' + crypto.randomBytes(16).toString('hex').toUpperCase();
  
  const result = await pool.query(
    'INSERT INTO provider_applications (id, name, email, organization, api_endpoint, confirmation_code, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [id, name, email, organization, apiEndpoint || null, confirmationCode, 'PENDING']
  );
  
  return result.rows[0] as ProviderApplication;
}

export async function getProviderApplication(pool: Pool, providerId: string): Promise<ProviderApplication> {
  const result = await pool.query(
    'SELECT * FROM provider_applications WHERE id = $1',
    [providerId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Provider application ' + providerId + ' not found');
  }
  
  return result.rows[0] as ProviderApplication;
}

export async function listProviderApplications(pool: Pool): Promise<ProviderApplication[]> {
  const result = await pool.query(
    'SELECT * FROM provider_applications ORDER BY created_at DESC'
  );
  
  return result.rows as ProviderApplication[];
}

export async function approveProviderApplication(
  pool: Pool,
  providerId: string,
  reviewer: string
): Promise<ProviderApplication> {
  const result = await pool.query(
    'UPDATE provider_applications SET status = $1, reviewed_at = NOW(), reviewer = $2 WHERE id = $3 RETURNING *',
    ['APPROVED', reviewer, providerId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Provider application ' + providerId + ' not found');
  }
  
  return result.rows[0] as ProviderApplication;
}

export async function rejectProviderApplication(
  pool: Pool,
  providerId: string,
  reviewer: string
): Promise<ProviderApplication> {
  const result = await pool.query(
    'UPDATE provider_applications SET status = $1, reviewed_at = NOW(), reviewer = $2 WHERE id = $3 RETURNING *',
    ['REJECTED', reviewer, providerId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Provider application ' + providerId + ' not found');
  }
  
  return result.rows[0] as ProviderApplication;
}
