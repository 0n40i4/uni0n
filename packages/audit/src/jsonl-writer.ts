import * as fs from 'fs'; import * as path from 'path';
export class AuditLogger {
  constructor(private logPath: string = './audit-logs') { if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); }
  log(event: { trace_id: string; event_type: string; payload_hash: string; signature: string; timestamp?: string }): void {
    const timestamp = event.timestamp || new Date().toISOString();
    const filename = path.join(this.logPath, `${event.event_type}-${timestamp.split('T')[0]}.jsonl`);
    fs.appendFileSync(filename, JSON.stringify({ ...event, timestamp }) + '\n');
  }
  replay(filename: string): any[] {
    const filepath = path.join(this.logPath, filename);
    if (!fs.existsSync(filepath)) throw new Error(`Audit log nie znaleziony: ${filename}`);
    return fs.readFileSync(filepath, 'utf-8').trim().split('\n').map(line => JSON.parse(line));
  }
  listLogs(): string[] { return fs.readdirSync(this.logPath); }
}
