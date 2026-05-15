/**
 * Integration tests — supertest against the exported Express app.
 *
 * IMPORTANT: main.ts was minimally refactored to:
 *   - export `const app`
 *   - export JWT helpers (signToken / verifyToken)
 *   - guard `app.listen(...)` with `if (require.main === module)`
 *   - mount routers (k0nsulat, wave3, wave6, operator) at MODULE LOAD time
 *     so supertest can hit /api/relay/* without a running server.
 *   - wave7 router still mounts inside listen-callback (needs redis client),
 *     so endpoints starting with /api/wave7 are NOT covered here.
 *
 * DB-coupled endpoints (e.g. /health) will return their `degraded` branch
 * because no DATABASE_URL is set in this test process; we assert shape
 * rather than `status === 'zdrowy'`.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../main';

describe('GET /health', () => {
  it('returns 200 with shape { status, version, database, redis }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('database');
    expect(res.body).toHaveProperty('redis');
    // status is 'zdrowy' when DB is up, 'degraded' when not — both are acceptable
    expect(['zdrowy', 'degraded']).toContain(res.body.status);
  });
});

describe('GET /.well-known/agent.json', () => {
  it('returns 200 with name + did + capabilities', async () => {
    const res = await request(app).get('/.well-known/agent.json');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name');
    expect(res.body.name).toBe('UNIONAI Core');
    expect(res.body).toHaveProperty('did');
    expect(Array.isArray(res.body.capabilities)).toBe(true);
  });
});

describe('GET /llms.txt', () => {
  it('returns 200 text/plain with UNIONAI banner', async () => {
    const res = await request(app).get('/llms.txt');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toMatch(/UNIONAI/);
  });
});

describe('POST /api/relay/send', () => {
  it('empty body returns 400 with MVSS_INVALID error code', async () => {
    const res = await request(app).post('/api/relay/send').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'MVSS_INVALID');
  });

  it('missing src_did returns 400 with Missing required field: src_did', async () => {
    const res = await request(app)
      .post('/api/relay/send')
      .send({
        protocol: 'UNIONAI-WIRE-v0',
        intent_id: 'i-1',
        dst_did: 'did:unionai:test:bob',
        intent: { type: 'query', summary: 'hi' },
      });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'MVSS_INVALID');
    expect(res.body.message).toMatch(/Missing required field: src_did/);
  });
});

describe('POST /api/relay/route', () => {
  it('empty body returns 400', async () => {
    const res = await request(app).post('/api/relay/route').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
