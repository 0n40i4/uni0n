/**
 * Contract / unit tests — pure functions, no DB required.
 *
 * Baseline test suite for v0.3.0. Covers:
 *  - JWT sign/verify roundtrip
 *  - Hash chain determinism (relay_events ledger)
 *  - Trust tier boundaries (T0..T4)
 *  - MVSS-v0 intent validation
 *
 * NOTE: importing ../main triggers module-level side-effects
 *  (pg.Pool instance, in-memory rate-limit setInterval, router mounting).
 *  No network/DB I/O happens until a query is actually executed, so unit
 *  tests stay isolated and fast.
 */
import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../main';
import { sha256, hashChain, trustTier, validateMVSS } from '../modules/wave3';

describe('JWT sign/verify roundtrip', () => {
  it('signs and verifies a payload', () => {
    const token = signToken({ sub: 'alice', role: 'operator' });
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(2);
    const verified = verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified.sub).toBe('alice');
    expect(verified.role).toBe('operator');
    expect(typeof verified.exp).toBe('number');
  });

  it('rejects a tampered token', () => {
    const token = signToken({ sub: 'alice' });
    const [body] = token.split('.');
    const tampered = `${body}.badsignature`;
    expect(verifyToken(tampered)).toBeNull();
  });

  it('rejects a malformed token (no dot)', () => {
    expect(verifyToken('not-a-token')).toBeNull();
  });
});

describe('Hash chain helper (relay_events ledger)', () => {
  it('sha256() is deterministic', () => {
    const a = sha256('hello');
    const b = sha256('hello');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('hashChain() is deterministic for same inputs', () => {
    const prev = '0'.repeat(64);
    const payload = sha256(JSON.stringify({ intent_id: 'i-1' }));
    const trace = 'trace-abc';
    const h1 = hashChain(prev, payload, trace);
    const h2 = hashChain(prev, payload, trace);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it('hashChain() differs for different previous_hash', () => {
    const payload = sha256('p');
    const trace = 't-1';
    const h1 = hashChain('0'.repeat(64), payload, trace);
    const h2 = hashChain('1'.repeat(64), payload, trace);
    expect(h1).not.toBe(h2);
  });
});

describe('Trust tier derivation', () => {
  it('score 0 → T0 UNTRUSTED', () => {
    const t = trustTier(0);
    expect(t.tier).toBe('T0');
    expect(t.status).toBe('UNTRUSTED');
  });

  it('score 100 (boundary) → T1 PROBATION', () => {
    expect(trustTier(100).tier).toBe('T1');
  });

  it('score 400 (boundary) → T2 VERIFIED', () => {
    expect(trustTier(400).tier).toBe('T2');
  });

  it('score 700 (boundary) → T3 FEDERATION', () => {
    expect(trustTier(700).tier).toBe('T3');
  });

  it('score 900 (boundary) → T4 ORACLE', () => {
    const t = trustTier(900);
    expect(t.tier).toBe('T4');
    expect(t.status).toBe('ORACLE');
    expect(t.permissions).toContain('governance');
  });

  it('score just below T4 boundary → T3', () => {
    expect(trustTier(899).tier).toBe('T3');
  });
});

describe('MVSS-v0 intent validator', () => {
  const valid = {
    protocol: 'UNIONAI-WIRE-v0',
    intent_id: 'i-1',
    src_did: 'did:unionai:test:alice',
    dst_did: 'did:unionai:test:bob',
    intent: { type: 'query', summary: 'test intent' },
  };

  it('accepts a valid MVSS-v0 payload', () => {
    const r = validateMVSS(valid);
    expect(r.valid).toBe(true);
  });

  it('rejects payload missing src_did', () => {
    const bad = { ...valid, src_did: undefined };
    const r = validateMVSS(bad);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/Missing required field: src_did/);
  });

  it('rejects payload with wrong protocol', () => {
    const bad = { ...valid, protocol: 'WRONG' };
    const r = validateMVSS(bad);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/Unknown protocol/);
  });

  it('rejects payload with intent missing summary', () => {
    const bad = { ...valid, intent: { type: 'query' } as any };
    const r = validateMVSS(bad);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/type and summary/);
  });
});
