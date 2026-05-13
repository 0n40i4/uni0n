import { Pool } from 'pg';

export interface ComplianceRequirement {
  id: string;
  requirement: string;
  regulation: string;
  related_rfc?: string[];
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface ComplianceMatrix {
  timestamp: string;
  requirements: ComplianceRequirement[];
  coverage: number;
}

export async function getComplianceMatrix(pool: Pool): Promise<ComplianceMatrix> {
  const defaultRequirements: ComplianceRequirement[] = [
    { id: 'EU_AI_ACT_1', requirement: 'High-risk AI classification', regulation: 'EU AI Act', status: 'COMPLETED' },
    { id: 'EU_AI_ACT_2', requirement: 'Transparency and documentation', regulation: 'EU AI Act', status: 'COMPLETED' },
    { id: 'GDPR_1', requirement: 'Data subject rights implementation', regulation: 'GDPR', status: 'COMPLETED' },
    { id: 'GDPR_2', requirement: 'Data processing agreements', regulation: 'GDPR', status: 'IN_PROGRESS' },
    { id: 'GOVERNANCE_1', requirement: 'Human-in-the-loop override', regulation: 'Internal', status: 'COMPLETED' },
    { id: 'GOVERNANCE_2', requirement: 'Audit trail and evidence registry', regulation: 'Internal', status: 'COMPLETED' }
  ];
  
  const completed = defaultRequirements.filter(r => r.status === 'COMPLETED').length;
  const coverage = Math.round((completed / defaultRequirements.length) * 100);
  
  return {
    timestamp: new Date().toISOString(),
    requirements: defaultRequirements,
    coverage
  };
}

export async function getComplianceMatrixAsHtml(pool: Pool): Promise<string> {
  const matrix = await getComplianceMatrix(pool);
  
  const rows = matrix.requirements.map(req => {
    const statusColor = req.status === 'COMPLETED' ? '#00ff41' : (req.status === 'IN_PROGRESS' ? '#ffaa00' : '#ff4444');
    return '<tr><td>' + req.id + '</td><td>' + req.requirement + '</td><td>' + req.regulation + '</td><td style="color: ' + statusColor + ';">' + req.status + '</td></tr>';
  }).join('\n');
  
  return '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>UNIONAI Compliance Matrix</title>\n  <style>\n    body { background: #0a0a0a; color: #00ff41; font-family: monospace; padding: 20px; }\n    h1 { color: #00ff41; }\n    table { border-collapse: collapse; width: 100%; margin: 20px 0; }\n    th, td { border: 1px solid #00ff41; padding: 8px; text-align: left; }\n    th { background: #1a1a1a; }\n    .progress-bar { width: 100%; background: #1a1a1a; height: 20px; border-radius: 3px; overflow: hidden; margin: 10px 0; }\n    .progress-fill { background: #00ff41; height: 100%; width: ' + matrix.coverage + '%; }\n  </style>\n</head>\n<body>\n  <h1>UNIONAI Compliance Matrix</h1>\n  <p>Coverage: ' + matrix.coverage + '%</p>\n  <div class="progress-bar"><div class="progress-fill"></div></div>\n  <table>\n    <tr><th>ID</th><th>Requirement</th><th>Regulation</th><th>Status</th></tr>\n    ' + rows + '\n  </table>\n</body>\n</html>';
}
