import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export interface DocIndex {
  sections: {
    rfc: string[];
    governance: string[];
    evidence: string[];
    testnet: string[];
    operator: string[];
    publications: string[];
  };
}

export function getDocsIndex(): DocIndex {
  const publicDir = path.join(process.cwd(), 'public');
  const sections: DocIndex['sections'] = {
    rfc: [],
    governance: [],
    evidence: [],
    testnet: [],
    operator: [],
    publications: []
  };

  // Governance docs
  try {
    const govPath = path.join(publicDir, 'docs', 'governance');
    if (fs.existsSync(govPath)) {
      const files = fs.readdirSync(govPath).filter(f => f.endsWith('.pdf'));
      sections.governance = files.map(f => '/docs/governance/' + f);
    }
  } catch (e) {
    console.warn('Governance docs not found');
  }

  // Evidence
  try {
    const manifestPath = path.join(publicDir, 'evidence', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      sections.evidence = ['/evidence/manifest.json'];
    }
  } catch (e) {
    console.warn('Evidence manifest not found');
  }

  // Operator docs
  try {
    const opPath = path.join(publicDir, 'operator');
    if (fs.existsSync(opPath)) {
      const files = fs.readdirSync(opPath).filter(f => f.endsWith('.md'));
      sections.operator = files.map(f => '/operator/' + f);
    }
  } catch (e) {
    console.warn('Operator docs not found');
  }

  return { sections };
}

export function renderDocsHTML(index: DocIndex): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UNIONAI Ω∞ — Documentation Portal</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e0e0e0; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    h1 { color: #00ff41; margin: 20px 0; font-size: 2.5em; }
    h2 { color: #00ff41; margin: 30px 0 15px 0; font-size: 1.8em; border-bottom: 2px solid #00ff41; padding-bottom: 10px; }
    .section { margin: 30px 0; }
    .doc-list { list-style: none; }
    .doc-list li { padding: 10px 0; border-bottom: 1px solid #333; }
    .doc-list a { color: #00ff41; text-decoration: none; transition: color 0.3s; }
    .doc-list a:hover { color: #ffff00; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #333; color: #888; font-size: 0.9em; text-align: center; }
    .badge { display: inline-block; padding: 3px 8px; background: #00ff41; color: #0a0a0a; border-radius: 3px; font-size: 0.8em; margin-left: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>UNIONAI Ω∞ Documentation Portal</h1>
    <p>Federacyjna dokumentacja architektury, operacji i governance.</p>

    <div class="section">
      <h2>📋 Governance Documents</h2>
      <ul class="doc-list">
        ${index.sections.governance.map(doc => `<li><a href="${doc}">${doc.split('/').pop()}</a> <span class="badge">PDF</span></li>`).join('')}
      </ul>
    </div>

    <div class="section">
      <h2>📊 Evidence Registry</h2>
      <ul class="doc-list">
        ${index.sections.evidence.map(doc => `<li><a href="${doc}">Evidence Manifest</a></li>`).join('')}
      </ul>
    </div>

    <div class="section">
      <h2>👨‍💼 Operator Documentation</h2>
      <ul class="doc-list">
        ${index.sections.operator.map(doc => `<li><a href="/docs/operator/${doc.split('/').pop()}">${doc.split('/').pop()}</a></li>`).join('')}
      </ul>
    </div>

    <div class="section">
      <h2>🔗 Quick Links</h2>
      <ul class="doc-list">
        <li><a href="/.well-known/agent.json">Agent Discovery</a></li>
        <li><a href="/llms.txt">LLM Discovery Manifest</a></li>
        <li><a href="/openapi.json">OpenAPI Specification</a></li>
        <li><a href="/feed/ai.xml">RSS Feed</a></li>
        <li><a href="/metrics/federation">Federation Metrics</a></li>
      </ul>
    </div>

    <div class="footer">
      <p>UNIONAI Ω∞ — GO_CONTROLLED — 0n40i4 — 2026</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function renderDocsSection(sectionName: string, index: DocIndex): string {
  const sections = {
    'rfc': 'RFC Documents',
    'governance': 'Governance Documents',
    'evidence': 'Evidence Registry',
    'operator': 'Operator Documentation',
  };

  const title = sections[sectionName as keyof typeof sections] || sectionName;
  const docs = index.sections[sectionName as keyof typeof index.sections] || [];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} — UNIONAI Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    h1 { color: #00ff41; margin-bottom: 30px; }
    .doc-item { padding: 15px; background: #1a1a1a; margin: 10px 0; border-left: 3px solid #00ff41; border-radius: 3px; }
    .doc-item a { color: #00ff41; text-decoration: none; }
    .doc-item a:hover { text-decoration: underline; }
    .back-link { color: #888; margin-bottom: 20px; }
    .back-link a { color: #00ff41; }
  </style>
</head>
<body>
  <div class="container">
    <div class="back-link"><a href="/docs">← Back to Documentation</a></div>
    <h1>${title}</h1>
    <div>
      ${docs.map(doc => `<div class="doc-item"><a href="${doc}">${doc}</a></div>`).join('')}
    </div>
  </div>
</body>
</html>
  `.trim();
}
