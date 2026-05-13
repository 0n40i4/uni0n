import { Pool } from 'pg';

export interface RFC {
  id: string;
  title: string;
  status: 'DRAFT' | 'ACTIVE' | 'FROZEN' | 'SUPERSEDED';
  description?: string;
  hash?: string;
  content_markdown?: string;
  tags: string[];
  dependencies: string[];
  created_at: string;
  updated_at: string;
}

export interface RFCIndexEntry {
  id: string;
  title: string;
  status: string;
  date: string;
  tags: string[];
}

function parseYamlFrontmatter(content: string): { metadata: any; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: {}, body: content };
  
  const metadata: any = {};
  const yamlLines = match[1].split('\n');
  for (const line of yamlLines) {
    const [key, ...valueParts] = line.split(':');
    if (key) {
      const value = valueParts.join(':').trim();
      metadata[key.trim()] = value.startsWith('[') ? JSON.parse(value) : value;
    }
  }
  return { metadata, body: match[2] };
}

function markdownToHtml(markdown: string): string {
  let html = markdown
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>');
  
  return '<p>' + html + '</p>';
}

export async function getRFCIndex(pool: Pool): Promise<RFCIndexEntry[]> {
  const result = await pool.query(
    'SELECT id, title, status, created_at as date, tags FROM rfc_registry ORDER BY created_at DESC'
  );
  return result.rows as RFCIndexEntry[];
}

export async function getRFC(pool: Pool, rfcId: string): Promise<RFC> {
  const result = await pool.query(
    'SELECT * FROM rfc_registry WHERE id = $1',
    [rfcId]
  );
  if (result.rows.length === 0) {
    throw new Error('RFC ' + rfcId + ' not found');
  }
  return result.rows[0] as RFC;
}

export async function getRFCAsHtml(pool: Pool, rfcId: string): Promise<string> {
  const rfc = await getRFC(pool, rfcId);
  const markdown = rfc.content_markdown || '# ' + rfc.title + '\n\n' + (rfc.description || '');
  const html = markdownToHtml(markdown);
  
  const tagsHtml = rfc.tags && rfc.tags.length > 0 ? '<p><strong>Tags:</strong> ' + rfc.tags.join(', ') + '</p>' : '';
  const depsHtml = rfc.dependencies && rfc.dependencies.length > 0 ? '<p><strong>Depends on:</strong> ' + rfc.dependencies.join(', ') + '</p>' : '';
  
  return '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>' + rfc.title + '</title>\n  <style>\n    body { background: #0a0a0a; color: #00ff41; font-family: monospace; padding: 20px; max-width: 800px; margin: 0 auto; }\n    h1, h2, h3 { color: #00ff41; }\n    a { color: #00ff41; text-decoration: underline; }\n    .metadata { background: #1a1a1a; padding: 10px; margin: 20px 0; border-left: 3px solid #00ff41; }\n    .status { display: inline-block; padding: 4px 8px; background: #00ff41; color: #0a0a0a; border-radius: 2px; font-weight: bold; }\n  </style>\n</head>\n<body>\n  <h1>' + rfc.title + '</h1>\n  <div class="metadata">\n    <p><strong>ID:</strong> ' + rfc.id + '</p>\n    <p><strong>Status:</strong> <span class="status">' + rfc.status + '</span></p>\n    <p><strong>Date:</strong> ' + rfc.created_at + '</p>\n    ' + tagsHtml + '\n    ' + depsHtml + '\n  </div>\n  <div class="content">\n    ' + html + '\n  </div>\n</body>\n</html>';
}

export async function createRFC(
  pool: Pool,
  id: string,
  title: string,
  status: 'DRAFT' | 'ACTIVE' | 'FROZEN' | 'SUPERSEDED',
  description?: string,
  contentMarkdown?: string,
  tags?: string[],
  dependencies?: string[]
): Promise<RFC> {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(id + Date.now()).digest('hex');
  
  const result = await pool.query(
    'INSERT INTO rfc_registry (id, title, status, description, content_markdown, hash, tags, dependencies) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
    [id, title, status, description, contentMarkdown, hash, tags || [], dependencies || []]
  );
  
  return result.rows[0] as RFC;
}

export async function updateRFCStatus(
  pool: Pool,
  rfcId: string,
  newStatus: 'DRAFT' | 'ACTIVE' | 'FROZEN' | 'SUPERSEDED'
): Promise<RFC> {
  const result = await pool.query(
    'UPDATE rfc_registry SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [newStatus, rfcId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('RFC ' + rfcId + ' not found');
  }
  
  return result.rows[0] as RFC;
}
