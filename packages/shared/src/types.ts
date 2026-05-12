export type TrustTier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';

export interface DIDLite {
  did: string;
  zone: string;
  provider?: string;
  public_key: string;
}

export interface AgentCapability {
  name: string;
  permissions: string[];
  trust_tier_required: TrustTier;
}

export interface TrustScore {
  did: string;
  score: number;
  tier: TrustTier;
  attestation: string;
  updated_at: string;
}

export interface RelayEvent {
  intent_id: string;
  src_did: string;
  dst_did: string;
  route_status: string;
  semantic_score: number;
  fallback_used: boolean;
  trace_id: string;
  created_at: string;
}

export interface GovernanceEvent {
  trace_id: string;
  event_type: 'emergency_stop' | 'relay_freeze' | 'memory_freeze' | 'audit_export';
  operator_did: string;
  target: string;
  action: string;
  status: 'pending' | 'executed' | 'cancelled';
}
