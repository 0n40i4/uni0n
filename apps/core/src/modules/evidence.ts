import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface EvidenceEntry {
  id: string;
  title: string;
  url: string;
  type: string;
  date: string;
  sha256?: string;
}

export interface EvidenceManifest {
  initiative: string;
  generated_at: string;
  documents: EvidenceEntry[];
  sha256_index: Record<string, string>;
}

export function calculateFileSha256(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    return '';
  }
}

export function generateEvidenceManifest(): EvidenceManifest {
  const docsDir = path.join(process.cwd(), 'public', 'docs', 'governance');
  const documents: EvidenceEntry[] = [];
  const sha256Index: Record<string, string> = {};
  
  try {
    if (fs.existsSync(docsDir)) {
      const files = fs.readdirSync(docsDir);
      files.forEach((file, index) => {
        const filePath = path.join(docsDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile()) {
          const sha256 = calculateFileSha256(filePath);
          const docId = 'GOV-' + String(index + 1).padStart(3, '0') + '-' + file.split('.')[1].toUpperCase();
          
          documents.push({
            id: docId,
            title: file.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
            url: '/docs/governance/' + file,
            type: 'governance_document',
            date: new Date().toISOString().split('T')[0],
            sha256: sha256
          });
          
          sha256Index[file] = sha256;
        }
      });
    }
  } catch (error) {
    console.error('Error generating evidence manifest:', error);
  }
  
  return {
    initiative: 'UNIONAI Ω∞',
    generated_at: new Date().toISOString(),
    documents,
    sha256_index: sha256Index
  };
}

export function saveEvidenceManifest(manifest: EvidenceManifest): boolean {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'evidence', 'manifest.json');
    const dir = path.dirname(manifestPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving evidence manifest:', error);
    return false;
  }
}

export function getEvidenceManifest(): EvidenceManifest {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'evidence', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading evidence manifest:', error);
  }
  
  return generateEvidenceManifest();
}
