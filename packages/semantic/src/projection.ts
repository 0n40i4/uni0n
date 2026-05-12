import { UnionaiWireMessage } from '@unionai/shared';
export class SemanticProjection {
  projectToSMV(message: UnionaiWireMessage) {
    const weights: Record<string, number> = { 'memory_write': 0.9, 'route_query': 0.85, 'trust_verify': 0.8, 'governance_event': 0.75 };
    const similarity = weights[message.intent.type] || 0.5;
    return { projection: 'smv-v0', similarity, fallback_used: similarity < 0.7 };
  }
  detectDrift(previous: number[], current: number[]): number {
    let drift = 0;
    for (let i = 0; i < previous.length; i++) drift += Math.abs(previous[i] - current[i]);
    return drift / previous.length;
  }
}
