export interface UnionaiWireMessage {
  protocol: 'UNIONAI-WIRE-v0';
  intent_id: string;
  src_did: string;
  dst_did: string;
  intent: {
    type: 'memory_write' | 'route_query' | 'trust_verify' | 'governance_event';
    summary: string;
  };
  embedding_model_id: string;
  intent_embedding: number[];
  semantic: {
    projection: string;
    similarity: number;
    fallback_used: boolean;
  };
  trust: {
    score: number;
    tier: 'T0' | 'T1' | 'T2' | 'T3' | 'T4';
    attestation: string;
  };
  memory: {
    anchor_id: string;
    delta_hash: string;
    scope: 'PUBLIC' | 'FEDERATION' | 'PRIVATE' | 'EPHEMERAL';
  };
  governance: {
    trace_id: string;
    override_allowed: boolean;
  };
  timestamp: string;
  signature: string;
}
