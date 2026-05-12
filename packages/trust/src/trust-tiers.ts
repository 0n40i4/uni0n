import { TrustTier } from '@unionai/shared';
export const TRUST_TIER_THRESHOLDS: Record<TrustTier, { min: number; max: number; permissions: string[] }> = {
  T0: { min: 0, max: 100, permissions: ['read_public_metadata'] },
  T1: { min: 100, max: 400, permissions: ['read_public_metadata', 'route_queries', 'limited_relay'] },
  T2: { min: 400, max: 700, permissions: ['read_public_metadata', 'route_queries', 'limited_relay', 'memory_write'] },
  T3: { min: 700, max: 900, permissions: ['read_public_metadata', 'route_queries', 'limited_relay', 'memory_write', 'governance_events'] },
  T4: { min: 900, max: 1000, permissions: ['read_public_metadata', 'route_queries', 'limited_relay', 'memory_write', 'governance_events', 'strategic_review'] }
};
export function getTrustTier(score: number): TrustTier {
  if (score < 100) return 'T0'; if (score < 400) return 'T1'; if (score < 700) return 'T2'; if (score < 900) return 'T3'; return 'T4';
}
export function canPerform(tier: TrustTier, action: string): boolean {
  return TRUST_TIER_THRESHOLDS[tier].permissions.includes(action);
}
