import { DIDLite } from '@unionai/shared';
export class DIDRegistry {
  private dids: Map<string, DIDLite & { trust_score: number }> = new Map();
  register(did: DIDLite, initial_trust_score: number = 0): void {
    if (this.dids.has(did.did)) throw new Error(`DID już zarejestrowany: ${did.did}`);
    this.dids.set(did.did, { ...did, trust_score: initial_trust_score });
  }
  lookup(did: string): DIDLite | undefined { return this.dids.get(did); }
  getTrustScore(did: string): number { return this.dids.get(did)?.trust_score ?? 0; }
  updateTrustScore(did: string, delta: number): void {
    const entry = this.dids.get(did);
    if (!entry) throw new Error(`DID nie znaleziony: ${did}`);
    entry.trust_score = Math.max(0, Math.min(1000, entry.trust_score + delta));
  }
  list(): Array<DIDLite & { trust_score: number }> { return Array.from(this.dids.values()); }
}
