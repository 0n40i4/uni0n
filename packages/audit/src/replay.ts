export interface ReplayEvent { trace_id: string; event_type: string; timestamp: string; payload_hash: string; }
export class ReplayEngine {
  private events: Map<string, ReplayEvent[]> = new Map();
  registerEvents(traceId: string, events: ReplayEvent[]): void { this.events.set(traceId, events); }
  replay(traceId: string, fromTimestamp?: string): ReplayEvent[] {
    const events = this.events.get(traceId) || [];
    if (!fromTimestamp) return events;
    return events.filter(e => new Date(e.timestamp) >= new Date(fromTimestamp));
  }
  export(traceId: string): string { return JSON.stringify(this.events.get(traceId) || [], null, 2); }
}
