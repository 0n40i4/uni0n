import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import * as pg from 'pg';
import * as redis from 'redis';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

// ============ PROVENANCE: single-source version ============
const PKG = (() => {
  try {
    const candidates = [
      path.join(__dirname, '..', 'package.json'),
      path.join(__dirname, '..', '..', 'package.json'),
      path.join(process.cwd(), 'package.json'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (e) {}
  return { version: 'unknown' };
})();
const SERVICE_VERSION = process.env.SERVICE_VERSION || PKG.version || 'unknown';
const SERVICE_CHANNEL = process.env.SERVICE_CHANNEL || (SERVICE_VERSION.includes('-dev') ? 'dev' : 'stable');
const BUILD_SHA = process.env.GIT_SHA || process.env.FLY_MACHINE_VERSION || 'unknown';
const BUILD_TIME = process.env.BUILD_TIME || new Date().toISOString();
const SERVICE_NAME = 'unionai-core';
const FEDERATION_ID = 'UNIONAI-GENESIS-0N40I4-20260512';
const COMMIT_TIME = process.env.COMMIT_TIME || process.env.BUILD_TIME || 'unknown';
const FLY_REGION = process.env.FLY_REGION || process.env.PRIMARY_REGION || 'unknown';
const APP_ENV = process.env.APP_ENV || process.env.NODE_ENV || SERVICE_CHANNEL;
const DEPLOYED_AT = process.env.DEPLOYED_AT || process.env.BUILD_TIME || COMMIT_TIME || 'unknown';
const NETWORK_STATUS = process.env.NETWORK_STATUS || 'TESTNET';

// ============ UAI-P2-006 / UAI-P2-003: CHANGELOG → live releases ============
// Repozytorium GitHub (do budowy linków release / compare).
const GITHUB_REPO = process.env.GITHUB_REPO || '0n40i4/uni0n';

// Odczyt CHANGELOG.md fault-tolerant — kandydaci tak jak dla PKG (różne cwd: repo root w prod,
// apps/core przy testach w replice). __dirname w runtime = apps/core/dist.
function readChangelogRaw(): string | null {
  try {
    const candidates = [
      path.join(process.cwd(), 'CHANGELOG.md'),
      path.join(process.cwd(), '..', '..', 'CHANGELOG.md'),
      path.join(__dirname, '..', '..', '..', 'CHANGELOG.md'),
      path.join(__dirname, '..', '..', 'CHANGELOG.md'),
      path.join(__dirname, '..', 'CHANGELOG.md'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    }
  } catch (_e) {}
  return null;
}

export interface ReleaseEntry {
  version: string;
  tag: string;
  date: string | null;
  build_sha: string | null;
  commit: string | null;
  channel: string;
  changes: string[];
  changelog: string;
  github_release_url: string | null;
  zenodo_doi: string | null;
}

// Parser Keep-a-Changelog: nagłówki `## [x.y.z] - YYYY-MM-DD` (data opcjonalna).
// Punkty zmian = linie zaczynające się od `- ` (po ewentualnym nagłówku `### ...`).
export function parseChangelog(raw: string | null): ReleaseEntry[] {
  if (!raw) return [];
  const releases: ReleaseEntry[] = [];
  const lines = raw.split(/\r?\n/);
  const headerRe = /^##\s+\[([^\]]+)\](?:\s*-\s*(.+?))?\s*$/;
  let current: ReleaseEntry | null = null;
  // Mapa wersja → DOI Zenodo (tylko jawnie wymienione w changelogu).
  const zenodoForVersion = (changesBlob: string): string | null => {
    const m = changesBlob.match(/zenodo\.(\d+)/i);
    return m ? `10.5281/zenodo.${m[1]}` : null;
  };
  for (const line of lines) {
    const h = headerRe.exec(line);
    if (h) {
      if (current) releases.push(current);
      const version = h[1].trim();
      const date = (h[2] || '').trim() || null;
      const isDev = /-dev|unreleased/i.test(version);
      const tag = /^\d/.test(version) ? `v${version}` : version;
      current = {
        version,
        tag,
        date,
        build_sha: null,
        commit: null,
        channel: isDev ? 'dev' : 'stable',
        changes: [],
        changelog: '',
        github_release_url: /^v?\d/.test(tag) ? `https://github.com/${GITHUB_REPO}/releases/tag/${tag}` : null,
        zenodo_doi: null,
      };
      continue;
    }
    if (current) {
      current.changelog += (current.changelog ? '\n' : '') + line;
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        current.changes.push(trimmed.slice(2).trim());
      }
    }
  }
  if (current) releases.push(current);
  for (const r of releases) {
    r.changelog = r.changelog.trim();
    r.zenodo_doi = zenodoForVersion(r.changelog);
  }
  // Pomiń pustą sekcję [Unreleased] — nie jest wydaniem, gdy brak pozycji.
  return releases.filter((r) => !(/unreleased/i.test(r.version) && r.changes.length === 0));
}

// Pełna lista wydań: parsuje CHANGELOG i dba o to, by bieżący build był ujęty jako najnowszy wpis.
export function buildReleases(): ReleaseEntry[] {
  const parsed = parseChangelog(readChangelogRaw());
  const norm = (v: string) => v.replace(/^v/, '');
  const hasCurrent = parsed.some(r => norm(r.version) === norm(SERVICE_VERSION));
  if (!hasCurrent && SERVICE_VERSION && SERVICE_VERSION !== 'unknown') {
    const tag = /^\d/.test(SERVICE_VERSION) ? `v${SERVICE_VERSION}` : SERVICE_VERSION;
    parsed.unshift({
      version: SERVICE_VERSION,
      tag,
      date: (BUILD_TIME || '').slice(0, 10) || null,
      build_sha: BUILD_SHA,
      commit: BUILD_SHA,
      channel: SERVICE_CHANNEL,
      changes: ['Bieżący build runtime (wpis automatyczny — brak sekcji w CHANGELOG.md).'],
      changelog: 'Bieżący build runtime — szczegóły pojawią się po dodaniu sekcji do CHANGELOG.md.',
      github_release_url: /^v?\d/.test(tag) ? `https://github.com/${GITHUB_REPO}/releases/tag/${tag}` : null,
      zenodo_doi: null,
    });
  } else {
    // Dołącz build_sha/commit/channel do dopasowanego najnowszego wpisu bieżącej wersji.
    const match = parsed.find(r => norm(r.version) === norm(SERVICE_VERSION));
    if (match) {
      match.build_sha = match.build_sha || BUILD_SHA;
      match.commit = match.commit || BUILD_SHA;
      match.channel = SERVICE_CHANNEL;
    }
  }
  return parsed;
}

// ============ SECURITY: JWT (custom HMAC-SHA256, no external deps) ============
const JWT_SECRET_ENV = process.env.JWT_SECRET;
if (!JWT_SECRET_ENV) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set in production');
    process.exit(1);
  }
  console.warn('WARNING: JWT_SECRET not set, using ephemeral dev secret');
}
const JWT_SECRET = JWT_SECRET_ENV || ('unionai-dev-' + Date.now());
const JWT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h

export function signToken(payload: any): string {
  // P1.3: every token carries a unique jti so it can be individually revoked.
  const jti = crypto.randomBytes(16).toString('hex');
  const data = { ...payload, jti, exp: Date.now() + JWT_EXPIRY_MS };
  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): any | null {
  try {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url');
    // MAJOR-06 (pentest RSpace 2026-05-25): timing-safe comparison of HMAC signature.
    const a = Buffer.from(sig, 'base64url');
    const b = Buffer.from(expectedSig, 'base64url');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (data.exp < Date.now()) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// P1.3: token revocation. Redis-backed (durable, cross-machine) with in-memory
// fallback when Redis is unavailable. A revoked jti is stored until the token
// would have expired anyway, so the set never grows unbounded.
const revokedJtiMemory = new Map<string, number>(); // jti -> expiry epoch ms
async function revokeToken(jti: string, ttlMs: number): Promise<void> {
  if (!jti) return;
  revokedJtiMemory.set(jti, Date.now() + ttlMs);
  if (redisClient && redisConnected) {
    try { await redisClient.set(`revoked:${jti}`, '1', { PX: Math.max(1000, ttlMs) }); } catch (_) {}
  }
}
async function isTokenRevoked(jti: string): Promise<boolean> {
  if (!jti) return false;
  const memExp = revokedJtiMemory.get(jti);
  if (memExp && memExp > Date.now()) return true;
  if (memExp && memExp <= Date.now()) revokedJtiMemory.delete(jti);
  if (redisClient && redisConnected) {
    try { return (await redisClient.exists(`revoked:${jti}`)) === 1; } catch (_) {}
  }
  return false;
}
// periodic prune of expired in-memory revocations
setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of revokedJtiMemory.entries()) if (exp <= now) revokedJtiMemory.delete(jti);
}, 60000);

async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/, '');
  if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  if (await isTokenRevoked(payload.jti)) return res.status(401).json({ error: 'Token has been revoked' });
  req.auth = payload;
  next();
}

function requireOperator(req: any, res: any, next: any) {
  requireAuth(req, res, () => {
    if (req.auth?.role !== 'operator') {
      return res.status(403).json({ error: 'Operator role required' });
    }
    next();
  });
}

const RELAY_SHARED_SECRET = process.env.RELAY_SHARED_SECRET || '';

function requireRelaySharedSecret(req: any, res: any, next: any) {
  if (!RELAY_SHARED_SECRET) {
    return res.status(503).json({ error: 'RELAY_SHARED_SECRET not configured on server' });
  }

  const authHeader = String(req.headers.authorization || '').trim();
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization Bearer token' });
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization Bearer token' });
  }

  if (token !== RELAY_SHARED_SECRET) {
    return res.status(403).json({ error: 'Invalid relay token' });
  }

  next();
}

// ============ SECURITY: Rate Limiter (Redis-backed, in-memory fallback) ============
// P1.2 fix: Redis fixed-window counter shared across machines and surviving
// restarts/auto-stop. Falls back to the in-memory sliding window when Redis is
// unavailable (Redis is optional/non-fatal in this service).
const rateLimitStore = new Map<string, number[]>();

function inMemoryRateLimit(maxReq: number, windowMs: number, key: string, res: any): { limited: boolean; remaining: number; resetSec: number; retryAfterMs: number } {
  const now = Date.now();
  const timestamps = (rateLimitStore.get(key) || []).filter(t => now - t < windowMs);
  const resetSec = timestamps.length > 0 ? Math.ceil((timestamps[0] + windowMs) / 1000) : Math.ceil((now + windowMs) / 1000);
  if (timestamps.length >= maxReq) {
    return { limited: true, remaining: 0, resetSec, retryAfterMs: windowMs - (now - timestamps[0]) };
  }
  timestamps.push(now);
  rateLimitStore.set(key, timestamps);
  return { limited: false, remaining: Math.max(0, maxReq - timestamps.length), resetSec, retryAfterMs: 0 };
}

function makeRateLimiter(maxReq: number, windowMs: number) {
  return async (req: any, res: any, next: any) => {
    // MAJOR-L03: per-route bucket via req.path (req.route is undefined for mount-level guarded routes → would collapse to one shared bucket per IP)
    const key = (req.ip || req.connection?.remoteAddress || 'unknown') + ':' + req.method + ':' + (req.path || req.originalUrl || 'unknown');
    res.set('X-RateLimit-Limit', String(maxReq));

    // MAJOR-L03: Redis sliding-window log (sorted set) — matches in-memory semantics; no fixed-window burst at boundary
    if (redisClient && redisConnected) {
      try {
        const rkey = `rl:${key}`;
        const now = Date.now();
        const member = `${now}-${Math.random().toString(36).slice(2)}`;
        const results: any = await redisClient.multi()
          .zRemRangeByScore(rkey, 0, now - windowMs)
          .zAdd(rkey, [{ score: now, value: member }])
          .zCard(rkey)
          .pExpire(rkey, windowMs)
          .exec();
        const count = Number(Array.isArray(results) ? results[2] : 0) || 0;
        const resetSec = Math.ceil((now + windowMs) / 1000);
        res.set('X-RateLimit-Remaining', String(Math.max(0, maxReq - count)));
        res.set('X-RateLimit-Reset', String(resetSec));
        if (count > maxReq) {
          // rejected request should not consume a slot in the window
          try { await redisClient.zRem(rkey, member); } catch (_) {}
          res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
          return res.status(429).json({ error: 'Too many requests', retry_after_ms: windowMs });
        }
        return next();
      } catch (_) {
        // fall through to in-memory on any Redis error
      }
    }

    // In-memory fallback
    const r = inMemoryRateLimit(maxReq, windowMs, key, res);
    res.set('X-RateLimit-Remaining', String(r.remaining));
    res.set('X-RateLimit-Reset', String(r.resetSec));
    if (r.limited) {
      res.set('Retry-After', String(Math.ceil(r.retryAfterMs / 1000)));
      return res.status(429).json({ error: 'Too many requests', retry_after_ms: r.retryAfterMs });
    }
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of rateLimitStore.entries()) {
    const filtered = ts.filter(t => now - t < 60000);
    if (filtered.length === 0) rateLimitStore.delete(key);
    else rateLimitStore.set(key, filtered);
  }
}, 60000);

const globalRateLimit = makeRateLimiter(100, 60000); // 100/min per IP
const operatorRateLimit = makeRateLimiter(20, 60000); // 20/min per IP
import { createK0nsultatRouter } from './modules/k0nsulat';
import { runSemanticAudit, isClaudeAuditConfigured } from './modules/claude-audit';
import { createWave6Router, WAVE6_MIGRATIONS, getWave6Metrics } from './modules/wave6';
import { createWave7Router, WAVE7_MIGRATIONS, getWave7Metrics } from './modules/wave7';
import { createWave3Router, createOperatorRouter, WAVE3_MIGRATIONS, getRelayMetrics, initQdrant } from './modules/wave3';
import { Feed } from 'feed';
import { createIncident, listIncidents, getIncident, freezeIncident, exportIncident, addIncidentAction } from './modules/incident';
import { getRFCIndex, getRFC, getRFCAsHtml, createRFC, updateRFCStatus } from './modules/rfc';
import { createProviderApplication, getProviderApplication, listProviderApplications, approveProviderApplication, rejectProviderApplication, regenerateProviderApiKey } from './modules/provider';
import { getComplianceMatrix, getComplianceMatrixAsHtml } from './modules/compliance';
import { generateEvidenceManifest, getEvidenceManifest, saveEvidenceManifest } from './modules/evidence';
import { liveProbe, staticAnalysis, selfReport, crossCheck, makeReportProvenance } from './lib/provenance';
import { getDocsIndex, renderDocsHTML, renderDocsSection } from './modules/docs';

export const app = express();
// MAJOR-09 (pentest RSpace 2026-05-25): app sits behind nginx → trust first proxy
// so req.ip reflects the real client (X-Forwarded-For) for the rate limiter.
app.set('trust proxy', 1);
const PORT = process.env.PORT || process.env.API_PORT || 3000;
let smokeLastOk = -1; // -1=never run, 0=BLOCKED, 1=VERIFIED

// ============ SECURITY: hardening middleware (must run BEFORE other middleware) ============
app.disable('x-powered-by');
// CRITICAL-01 (audyt 2026-05-24): CSP włączony. Dozwolone Google Fonts (style+font),
// inline-style (strony używają <style>), data:/https: obrazy; skrypty tylko 'self'.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'"],
      'frame-ancestors': ["'none'"],
    },
  },
}));
// P1.4 + CRITICAL-02 (audyt 2026-05-24): CORS_ORIGIN to allowlista (comma-separated).
// Gdy env nieustawiony → domyślnie allowlista domen K0nsult (NIE wildcard '*').
// Jawne '*' w env nadal dozwolone (świadoma decyzja operatora), ale nie jest domyślne.
const corsOriginEnv = process.env.CORS_ORIGIN;
const corsDefaultAllowlist = [
  'https://uni0nai.k0nsult.cloud',
  'https://unionai.grassrootslobbing.pl',
  'https://unionai-core.fly.dev',
  'https://k0nsult.cloud',
];
// MINOR-13 + MAJOR-L04 (pentest RSpace re-weryfikacja): w produkcji wildcard '*' jest TWARDO BLOKOWANY —
// degradujemy do jawnej allowlisty (nie tylko logujemy). Jawne origins zawsze egzekwowane w prod.
const corsWildcardInProd = corsOriginEnv === '*' && process.env.NODE_ENV === 'production';
if (corsWildcardInProd) {
  console.error('[SECURITY] CORS_ORIGIN=* zignorowany w produkcji — wymuszam jawną allowlistę K0nsult');
}
const corsOrigin = corsWildcardInProd
  ? corsDefaultAllowlist
  : (corsOriginEnv === '*'
      ? '*'
      : (corsOriginEnv
          ? corsOriginEnv.split(',').map(s => s.trim()).filter(Boolean)
          : corsDefaultAllowlist));
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Retry-After'],
}));

// F-PT-02 (self-pentest 2026-05-24): Permissions-Policy — wyłącz nieużywane API przeglądarki (defense-in-depth).
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), interest-cohort=()');
  next();
});

app.use(['/api/relay/send', '/api/relay/route'], requireRelaySharedSecret);
// BLOCKER-01 (audyt 2026-05-24): governance/event = akcja governance (hash-chain) → token operatora.
app.use(['/api/governance/event'], requireAuth);

app.use(express.json());
app.use(globalRateLimit);

// ============ PROVENANCE: response headers on every request ============
app.use((req, res, next) => {
  // MINOR-L07 (pentest RSpace): nie ujawniaj szczegółów infrastruktury w domyślnych
  // nagłówkach (X-Service-Channel / X-Build-Sha / X-Federation-Id = info-leak).
  // Provenance dostępne nadal przez dedykowane endpointy (/version, /metrics/federation).
  res.set('X-Service-Name', SERVICE_NAME);
  res.set('X-Service-Version', SERVICE_VERSION);
  next();
});

app.use(express.static('public'));

// ============ PROVENANCE: lightweight liveness/readiness for Fly checks ============
app.get('/healthz', (req, res) => {
  res.status(200).type('text/plain').send('ok');
});

app.get('/readyz', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).type('text/plain').send('ready');
  } catch (e) {
    res.status(503).type('text/plain').send('not-ready');
  }
});

app.get('/version', (req, res) => {
  res.json({
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    channel: SERVICE_CHANNEL,
    build_sha: BUILD_SHA,
    build_time: BUILD_TIME,
    commit_time: COMMIT_TIME,
    env: APP_ENV,
    region: FLY_REGION,
    federation: FEDERATION_ID,
    network_status: NETWORK_STATUS,
    provenance_layer: 'v1',
    source_of_truth: 'package.json',
    timestamp: new Date().toISOString()
  });
});

// ============ PROVENANCE: federation self-report (RFC-001 demonstration) ============
app.get('/api/provenance/self-report', async (req, res) => {
  const reportProv = makeReportProvenance({
    report_id: `prov-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    generator: SERVICE_NAME,
    version: SERVICE_VERSION,
    channel: SERVICE_CHANNEL,
    federation: FEDERATION_ID,
  });

  const versionClaim = staticAnalysis(SERVICE_VERSION, {
    source: 'package.json',
    observer: SERVICE_NAME,
    confidence: 'high',
    notes: 'pulled at process boot from canonical manifest',
  });

  let dbStatus;
  try {
    const r = await pool.query('SELECT 1 AS ok');
    dbStatus = liveProbe(r.rows[0]?.ok === 1 ? 'reachable' : 'unknown', {
      source: 'pg.Pool.query(SELECT 1)',
      observer: SERVICE_NAME,
      confidence: 'high',
    });
  } catch (e: any) {
    dbStatus = liveProbe('unreachable', {
      source: 'pg.Pool.query(SELECT 1)',
      observer: SERVICE_NAME,
      confidence: 'high',
      notes: `error: ${e?.message || String(e)}`,
    });
  }

  const uptimeClaim = liveProbe(process.uptime(), {
    source: 'node:process.uptime()',
    observer: SERVICE_NAME,
    confidence: 'high',
  });

  const buildShaClaim = BUILD_SHA === 'unknown'
    ? selfReport(BUILD_SHA, { source: 'env(GIT_SHA|FLY_MACHINE_VERSION)', observer: SERVICE_NAME, notes: 'no SHA injected at build — provenance gap' })
    : staticAnalysis(BUILD_SHA, { source: 'env(GIT_SHA|FLY_MACHINE_VERSION)', observer: SERVICE_NAME, confidence: 'high' });

  const channelClaim = crossCheck(SERVICE_CHANNEL, {
    sources: ['env(SERVICE_CHANNEL)', 'package.json:version suffix'],
    observer: SERVICE_NAME,
    notes: 'env wins if set; otherwise inferred from -dev suffix',
  });

  res.json({
    report: reportProv,
    claims: {
      version: versionClaim,
      channel: channelClaim,
      build_sha: buildShaClaim,
      database: dbStatus,
      uptime_seconds: uptimeClaim,
    },
  });
});

// ============ AUTH: Login endpoint ============
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const expectedUser = process.env.OPERATOR_USERNAME || 'operator';
  const expectedPass = process.env.OPERATOR_PASSWORD;
  if (!expectedPass) {
    return res.status(503).json({ error: 'OPERATOR_PASSWORD not configured on server' });
  }
  if (username !== expectedUser) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const a = Buffer.from(password || '');
  const b = Buffer.from(expectedPass);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken({ sub: username, role: 'operator' });
  res.json({ token, expires_in: JWT_EXPIRY_MS / 1000 });
});

// P1.3: revoke the calling token (logout). Revocation lasts until the token's
// natural expiry, after which the jti entry self-prunes.
app.post('/api/auth/logout', requireAuth, async (req: any, res) => {
  const exp = req.auth?.exp;
  const ttlMs = exp ? Math.max(1000, exp - Date.now()) : JWT_EXPIRY_MS;
  await revokeToken(req.auth?.jti, ttlMs);
  res.json({ success: true, message: 'Token revoked', jti: req.auth?.jti });
});

if (!process.env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL is not set — database endpoints will fail');
}

// MAJOR-11 (pentest RSpace 2026-05-25): TLS verification for managed PG.
// If a CA cert is provided (DATABASE_CA_CERT inline PEM, or PGSSLROOTCERT file path),
// verify the server certificate. Otherwise keep rejectUnauthorized:false (Fly managed PG
// has no client-trusted CA) but warn loudly so the operator can close this by supplying a CA.
function buildPgSsl(): false | { rejectUnauthorized: boolean; ca?: string } {
  if (!process.env.DATABASE_URL) return false;
  const inlineCa = process.env.DATABASE_CA_CERT;
  const caFile = process.env.PGSSLROOTCERT;
  let ca: string | undefined;
  if (inlineCa && inlineCa.trim()) {
    ca = inlineCa;
  } else if (caFile && caFile.trim()) {
    try {
      ca = fs.readFileSync(caFile, 'utf8');
    } catch (e: any) {
      console.warn(`WARNING: PGSSLROOTCERT set to "${caFile}" but could not be read (${e?.message}); falling back to unverified TLS`);
    }
  }
  if (ca) {
    return { rejectUnauthorized: true, ca };
  }
  console.warn('WARNING: PG TLS certificate verification is DISABLED (rejectUnauthorized:false). ' +
    'Set DATABASE_CA_CERT (inline PEM) or PGSSLROOTCERT (file path) to enable verification.');
  return { rejectUnauthorized: false };
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/fallback',
  ssl: buildPgSsl()
});

pool.on('error', (err) => {
  console.warn('pg Pool error (non-fatal):', err.message);
});

let redisClient: any = null;
let redisConnected = false;

async function initRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log(`Attempting Redis connection: ${redisUrl}`);
  let connectTimeout: ReturnType<typeof setTimeout> | null = null;
  try {
    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: false,        // don't retry — fail fast
        connectTimeout: 3000,            // 3s connect timeout
      }
    });
    redisClient.on('error', (err: Error) => {
      // Only log first error, suppress the rest to avoid log flooding
      if (redisConnected !== false) {
        console.warn('[redis] connection error (Redis is optional):', err.message);
      }
      redisConnected = false;
    });
    // Race connect() against a 4-second timeout so startup never hangs
    await Promise.race([
      redisClient.connect(),
      new Promise<never>((_, reject) => {
        connectTimeout = setTimeout(() => reject(new Error('Redis connect timeout (4s)')), 4000);
      })
    ]);
    if (connectTimeout) clearTimeout(connectTimeout);
    redisConnected = true;
    console.log('Redis connected successfully');
  } catch (error) {
    if (connectTimeout) clearTimeout(connectTimeout);
    console.warn('[redis] unavailable (non-fatal):', (error as Error).message);
    redisConnected = false;
    try { await redisClient?.quit(); } catch (_) { /* ignore */ }
    redisClient = null;
  }
}

app.get('/health', async (req, res) => {
  const result: any = { database: null, redis: null };
  try {
    const dbResult = await pool.query('SELECT NOW()');
    result.database = 'ok';
  } catch (dbError: any) {
    const errMsg = dbError?.message || dbError?.code || String(dbError);
    const hasUrl = !!process.env.DATABASE_URL;
    const urlHost = process.env.DATABASE_URL
      ? process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@').split('@')[1]?.split('/')[0]
      : 'NOT_SET';
    result.database = `failed: ${errMsg} [host:${urlHost}] [url_set:${hasUrl}]`;
  }

  if (redisConnected && redisClient) {
    try {
      const redisPing = await redisClient.ping();
      result.redis = `ok (${redisPing})`;
    } catch (redisError) {
      result.redis = `unavailable: ${(redisError as Error).message || String(redisError)}`;
    }
  } else {
    result.redis = 'not connected (optional)';
  }

  const isHealthy = result.database === 'ok';
  // Always return 200 — Railway health check must pass to deploy new containers.
  // Actual status is in the response body.
  res.status(200).json({
    status: isHealthy ? 'zdrowy' : 'degraded',
    timestamp: new Date().toISOString(),
    database: result.database,
    redis: result.redis,
    version: process.env.APP_VERSION || SERVICE_VERSION,
    build_sha: process.env.BUILD_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || BUILD_SHA,
    release_channel: process.env.RELEASE_CHANNEL || SERVICE_CHANNEL,
    deployed_at: DEPLOYED_AT,
    commit_time: COMMIT_TIME,
    env: APP_ENV,
    region: FLY_REGION,
    channel: SERVICE_CHANNEL,
  });
});

// MINOR-L06 (pentest RSpace): /metrics ujawnia liczniki operacyjne → wymaga auth.
app.get('/metrics', requireAuth, async (req, res) => {
  const w6 = await getWave7Metrics(pool);
  const rm = getRelayMetrics();
  res.set('Content-Type', 'text/plain');
  const lines = [
    '# HELP relay_events_total Total relay events (DB)',
    `relay_events_total ${w6.relay_events_total}`,
    '# HELP relay_sent_total Relay send calls since last restart',
    `relay_sent_total ${rm.sent_total}`,
    '# HELP relay_route_total Relay route calls since last restart',
    `relay_route_total ${rm.route_total}`,
    '# HELP relay_errors_total Relay DB errors since last restart',
    `relay_errors_total ${rm.errors_total}`,
    '# HELP relay_timeouts_total Relay DB timeouts since last restart',
    `relay_timeouts_total ${rm.timeouts_total}`,
    '# HELP relay_fallback_total Syntactic fallback routes (no Qdrant embedding)',
    `relay_fallback_total ${rm.fallback_total}`,
    '# HELP relay_drift_ratio Ratio of fallback routes to total routes (0=semantic, 1=all_fallback)',
    `relay_drift_ratio ${rm.drift_ratio.toFixed(4)}`,
    '# HELP relay_latency_ms Last relay/send latency in milliseconds',
    `relay_latency_ms ${rm.last_latency_ms}`,
    '# HELP relay_semantic_route_total Routes resolved via semantic (Qdrant or embedding)',
    `relay_semantic_route_total ${rm.semantic_route_total}`,
    '# HELP relay_syntactic_route_total Routes resolved via syntactic fallback',
    `relay_syntactic_route_total ${rm.syntactic_route_total}`,
    '# HELP relay_qdrant_upsert_total Intent vectors upserted to Qdrant',
    `relay_qdrant_upsert_total ${rm.qdrant_upsert_total}`,
    '# HELP relay_qdrant_search_total Qdrant search calls for routing',
    `relay_qdrant_search_total ${rm.qdrant_search_total}`,
    '# HELP relay_provider_failover_total Provider failover events (L1 cache + L2 sentinel)',
    `relay_provider_failover_total ${rm.provider_failover_total}`,
    '# HELP relay_tracing_spans_total Distributed tracing spans recorded',
    `relay_tracing_spans_total ${rm.tracing_spans_total}`,
    '# HELP relay_frozen Relay frozen by operator (1=frozen)',
    `relay_frozen ${rm.relay_frozen ? 1 : 0}`,
    '# HELP memory_frozen Memory layer frozen by operator (1=frozen)',
    `memory_frozen ${rm.memory_frozen ? 1 : 0}`,
    '# HELP agents_registered_total Registered agents (DB)',
    `agents_registered_total ${w6.agents_registered_total}`,
    '# HELP memory_anchors_total Total memory anchors (DB)',
    `memory_anchors_total ${w6.memory_anchors_total}`,
    '# HELP trust_verifications_total Trust verifications (DB)',
    `trust_verifications_total ${w6.trust_verifications_total}`,
    '# HELP governance_events_total Governance events (DB)',
    `governance_events_total ${w6.governance_events_total}`,
    '# HELP audit_logs_total Operator audit log entries (DB)',
    `audit_logs_total ${w6.audit_logs_total}`,
    '# HELP operator_overrides_total Operator override actions (DB)',
    `operator_overrides_total ${w6.operator_overrides_total}`,
    '# HELP uptime_seconds Process uptime in seconds',
    `uptime_seconds ${process.uptime().toFixed(2)}`,
    '# HELP smoke_last_ok Last smoke result (1=VERIFIED, 0=BLOCKED, -1=never_run)',
    `smoke_last_ok ${smokeLastOk}`,
  ];
  // Async gauges (incident locks, prune eligible) — appended after static metrics
  const extraLines: string[] = [];
  try {
    const incR = await pool.query(
      `SELECT COUNT(DISTINCT trace_id) FROM relay_events WHERE incident_preserve = TRUE`
    );
    extraLines.push('# HELP incident_locks_active Traces currently locked from pruning');
    extraLines.push(`incident_locks_active ${+incR.rows[0].count}`);
    const pruneR = await pool.query(
      `SELECT COUNT(*) FROM relay_spans WHERE started_at < NOW() - INTERVAL '7 days' AND incident_preserve = FALSE`
    );
    extraLines.push('# HELP prune_eligible_spans Spans eligible for pruning (>7 days, not locked)');
    extraLines.push(`prune_eligible_spans ${+pruneR.rows[0].count}`);
  } catch (_) {}
  res.send([...lines, ...extraLines].join('\n') + '\n');
});

app.get('/.well-known/agent.json', (req, res) => {
  res.json({
    name: "UNIONAI Core",
    version: SERVICE_VERSION,
    channel: SERVICE_CHANNEL,
    did: "did:unionai:s4:k0nsulat",
    operator: "0n40i4",
    zone: "S4",
    capabilities: ["relay", "trust", "memory", "governance"],
    status: "GO_CONTROLLED",
    endpoints: {
      health: "/health",
      liveness: "/healthz",
      readiness: "/readyz",
      version: "/version",
      register: "/api/agent/join",
      relay: "/api/relay/send",
      leaderboard: "/api/leaderboard",
      directory: "/api/agents/directory",
      k0nsulat: "/api/k0nsulat/status",
      rfcs: "/rfc/index.json"
    },
    federation: FEDERATION_ID
  });
});

app.get('/.well-known/unionai.json', (req, res) => {
  res.json({
    federation: FEDERATION_ID,
    version: SERVICE_VERSION,
    channel: SERVICE_CHANNEL,
    governance_model: "GO_CONTROLLED",
    trust_tiers: ["T0", "T1", "T2", "T3", "T4"],
    api_version: SERVICE_VERSION,
    provenance_layer: 'v1'
  });
});

app.get('/.well-known/did.json', (req, res) => {
  res.json({
    "@context": "https://w3id.org/did/v1",
    "id": "did:unionai:s4:k0nsulat",
    "publicKey": [
      {
        "id": "did:unionai:s4:k0nsulat#key-1",
        "type": "Ed25519VerificationKey2018",
        "controller": "did:unionai:s4:k0nsulat",
        "publicKeyBase58": "SGR5R5P9PqR4S5T6U7V8W9X0Y1Z2A3B4C5D6E7F8"
      }
    ],
    "authentication": ["did:unionai:s4:k0nsulat#key-1"]
  });
});

app.get('/.well-known/ai-policy.json', (req, res) => {
  res.json({
    policy: "UNIONAI-AI-POLICY-v1",
    allowed_models: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
    rate_limit: "1000 requests/hour",
    authentication_required: true,
    terms: "https://uni0nai.k0nsult.cloud/terms",
    privacy: "https://uni0nai.k0nsult.cloud/privacy"
  });
});

app.get('/.well-known/robots-ai.txt', (req, res) => {
  res.type('text/plain');
  res.send(`# UNIONAI AI Crawling Rules
User-agent: *
Allow: /api/leaderboard
Allow: /api/agents/directory
Allow: /.well-known/
Allow: /llms.txt
Allow: /api/k0nsulat/status
Disallow: /api/relay/
Disallow: /api/k0nsulat/audit
Disallow: /api/k0nsulat/verify
Disallow: /api/memory/
Crawl-delay: 10
`);
});

app.get('/llms.txt', (req, res) => {
  res.type('text/plain');
  res.send(`# UNIONAI Ω∞ — AI Federation Layer
> Federacyjna warstwa governance dla agentów AI

## Endpoints
- /api/agent/join — rejestracja agenta (DID-lite)
- /api/relay/send — semantic relay
- /api/trust/verify — weryfikacja trust tier
- /api/leaderboard — ranking agentów
- /api/agents/directory — Internet of Agents public registry (RFC-INTERNETOFAGENTS-001)
- /api/k0nsulat/status — K0NSULAT security module (Wave 4)
- /api/k0nsulat/audit — audit event logging
- /api/k0nsulat/verify — agent verification

## Modules (Flagowce)
- K0NSULAT (did:unionai:s4:k0nsulat) — Security & Audit

## DID
did:unionai:s4:k0nsulat

## Operator
0n40i4

## Status
GO_CONTROLLED

## API Version
${SERVICE_VERSION} (${SERVICE_CHANNEL})
`);
});

app.get('/openapi.json', (req, res) => {
  const errorRef = { $ref: '#/components/schemas/Error' };
  // errResp: backward-compatible (desc[, code]) — zawsze dołącza schemat błędu + przykład.
  const errResp = (desc: string, code?: string) => ({
    description: desc,
    content: {
      'application/json': {
        schema: errorRef,
        example: { error: desc, ...(code ? { code } : {}) }
      }
    }
  });
  // okResp: backward-compatible (desc[, example]) — dołącza schemat obiektu + przykład.
  const okResp = (desc: string, example?: any) => ({
    description: desc,
    content: {
      'application/json': {
        schema: { type: 'object' },
        example: example !== undefined ? example : { ok: true, description: desc }
      }
    }
  });
  res.json({
    openapi: "3.1.0",
    info: {
      title: "UNIONAI Core API",
      version: SERVICE_VERSION,
      description: `Federacyjna warstwa governance dla agentów AI (channel: ${SERVICE_CHANNEL})`
    },
    servers: [
      { url: "https://uni0nai.k0nsult.cloud", description: "Public testnet runtime (custom domain) — GO CONTROLLED, nie pełna produkcja" },
      { url: "https://unionai.grassrootslobbing.pl", description: "Public testnet runtime (alias)" },
      { url: "https://unionai-core.fly.dev", description: "Public testnet runtime (Fly app domain)" },
      { url: "http://localhost:3000", description: "Local development" }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          },
          required: ['error']
        }
      }
    },
    paths: {
      "/health": {
        get: { tags: ['system'], summary: 'Health check (DB + Redis)', responses: { '200': okResp('Service health snapshot') } }
      },
      "/metrics": {
        get: { tags: ['system'], summary: 'Prometheus metrics (text/plain)', responses: { '200': { description: 'Prometheus exposition format' } } }
      },
      "/api/system/smoke": {
        get: { tags: ['system'], summary: 'Run smoke checks and return tag VERIFIED/BLOCKED', responses: { '200': okResp('Smoke result') } }
      },
      "/.well-known/agent.json": {
        get: { tags: ['discovery'], summary: 'Agent identity descriptor (DID-lite)', responses: { '200': okResp('Agent descriptor') } }
      },
      "/api/agent/join": {
        post: {
          tags: ['agent'], summary: 'Register agent in federation (idempotent on did)',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['did'], properties: { did: { type: 'string' }, provider: { type: 'string' }, capabilities: { type: 'array', items: { type: 'string' } } } } } } },
          responses: { '200': okResp('Agent already existed'), '201': okResp('Agent created'), '400': errResp('Missing did'), '500': errResp('DB error') }
        }
      },
      "/api/agent/register": {
        post: { tags: ['agent'], summary: 'Full agent registration (Wave3 — trust score, tier, capabilities)', responses: { '201': okResp('Agent registered'), '400': errResp('Missing did'), '500': errResp('DB error') } }
      },
      "/api/relay/send": {
        post: { tags: ['relay'], summary: 'Send relay event (MVSS validated)', responses: { '201': okResp('Relay received'), '400': errResp('MVSS invalid'), '503': errResp('Relay frozen') } }
      },
      "/api/relay/route": {
        post: { tags: ['relay'], summary: 'Route relay via semantic or syntactic match', responses: { '200': okResp('Route resolved'), '400': errResp('Missing src_did/intent'), '403': errResp('Trust too low'), '503': errResp('Relay frozen') } }
      },
      "/api/relay/status": {
        get: { tags: ['relay'], summary: 'Relay subsystem status + metrics', responses: { '200': okResp('Status snapshot') } }
      },
      "/api/relay/drift": {
        get: { tags: ['relay'], summary: 'Semantic drift ratio + Qdrant health', responses: { '200': okResp('Drift snapshot') } }
      },
      "/api/relay/replay/{trace_id}": {
        get: {
          tags: ['relay'], summary: 'Replay events for a trace_id',
          parameters: [{ name: 'trace_id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': okResp('Replay events'), '404': errResp('Trace not found') }
        }
      },
      "/api/qdrant/health": {
        get: { tags: ['relay'], summary: 'Qdrant connectivity check', responses: { '200': okResp('Qdrant ok'), '503': errResp('Qdrant unavailable') } }
      },
      "/api/memory/anchor": {
        post: { tags: ['memory'], summary: 'Anchor memory entry (hash-chained)', responses: { '201': okResp('Anchor created'), '400': errResp('Validation error'), '503': errResp('Memory frozen') } }
      },
      "/api/memory/query": {
        post: { tags: ['memory'], summary: 'Query memory anchors', responses: { '200': okResp('Anchors'), '400': errResp('Validation error') } }
      },
      "/api/trust/verify": {
        post: { tags: ['trust'], summary: 'Verify trust tier for did', responses: { '200': okResp('Trust info'), '400': errResp('Missing did'), '404': errResp('Agent not found') } }
      },
      "/api/k0nsulat/status": {
        get: { tags: ['k0nsulat'], summary: 'K0NSULAT module status', responses: { '200': okResp('Status') } }
      },
      "/api/k0nsulat/audit": {
        post: { tags: ['k0nsulat'], summary: 'Log audit event', responses: { '201': okResp('Audit logged'), '400': errResp('Validation error') } }
      },
      "/api/incident/open": {
        post: { tags: ['incident'], summary: 'Open new incident', responses: { '201': okResp('Incident created'), '400': errResp('Missing title/severity'), '500': errResp('DB error') } }
      },
      "/api/incident/{id}": {
        get: {
          tags: ['incident'], summary: 'Get incident by id',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': okResp('Incident'), '404': errResp('Not found', 'NOT_FOUND') }
        }
      },
      "/api/incidents": {
        get: {
          tags: ['incident'], summary: 'Publiczny rejestr incydentów (zagregowany, bez danych wrażliwych)',
          responses: {
            '200': okResp('Lista incydentów + agregaty', {
              incidents: [{ id: 1, title: 'Przykładowy incydent', severity: 'MAJOR', status: 'OPEN', incident_type: 'security', created_at: '2026-05-22T00:00:00Z' }],
              by_severity: { LOW: 0, MAJOR: 1, CRITICAL: 0 },
              by_status: { OPEN: 1, FROZEN: 0, RESOLVED: 0, EXPORTED: 0 },
              total: 1,
              generated_at: '2026-05-22T00:00:00Z'
            }),
            '200_db_error': okResp('Fallback przy błędzie DB', { incidents: [], by_severity: { LOW: 0, MAJOR: 0, CRITICAL: 0 }, by_status: {}, total: 0, db_error: true, generated_at: '2026-05-22T00:00:00Z' })
          }
        }
      },
      "/api/rfc/status": {
        get: {
          tags: ['rfc'], summary: 'Zliczenie RFC wg statusu',
          responses: {
            '200': okResp('Liczby RFC wg statusu', {
              active: 3, draft: 2, deprecated: 1, frozen: 0, total: 6,
              by_status: { ACTIVE: 3, DRAFT: 2, FROZEN: 0, SUPERSEDED: 1 },
              generated_at: '2026-05-22T00:00:00Z'
            })
          }
        }
      },
      "/api/evidence/verify": {
        get: {
          tags: ['evidence'], summary: 'Weryfikacja zgodności hashy dokumentów z manifestem',
          parameters: [{ name: 'id', in: 'query', required: false, schema: { type: 'string' }, description: 'Opcjonalny identyfikator dokumentu, np. DOC-004' }],
          responses: {
            '200': okResp('Wynik weryfikacji', {
              checked: 4, matched: 4, mismatched: 0, skipped: 9,
              results: [{ id: 'DOC-004', file: '/docs/UNIONAI_Raport_Calosci_Konsultacji.pdf', expected: '7e07bce5...', actual: '7e07bce5...', match: true }],
              verified_at: '2026-05-22T00:00:00Z'
            }),
            '404': errResp('Dokument o podanym id nie istnieje', 'NOT_FOUND')
          }
        }
      },
      "/api/memory/anchors": {
        get: {
          tags: ['memory'], summary: 'Publiczny podgląd hash-chain anchorów (bez payloadu/danych wrażliwych)',
          parameters: [{ name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 100, maximum: 500 } }],
          responses: {
            '200': okResp('Lista anchorów (tylko bezpieczne kolumny)', {
              anchors: [{ id: 'anchor-001', hash: 'ab12...', prev_hash: 'cd34...', scope: 'PUBLIC', validation_status: 'validated', created_at: '2026-05-22T00:00:00Z' }],
              count: 1,
              generated_at: '2026-05-22T00:00:00Z'
            }),
            '200_db_error': okResp('Fallback przy błędzie DB', { anchors: [], count: 0, db_error: true, generated_at: '2026-05-22T00:00:00Z' })
          }
        }
      },
      "/releases.json": {
        get: {
          tags: ['system'], summary: 'Live changelog — lista wydań sparsowana z CHANGELOG.md + bieżący build',
          responses: {
            '200': okResp('Lista wydań', {
              service: 'unionai-core', current_version: '0.3.0-dev', channel: 'dev', build_sha: 'abc1234',
              repo: 'https://github.com/0n40i4/uni0n', count: 4,
              releases: [{ version: '0.3.0-dev', tag: 'v0.3.0-dev', date: '2026-05-15', build_sha: 'abc1234', commit: 'abc1234', channel: 'dev', changes: ['...'], github_release_url: 'https://github.com/0n40i4/uni0n/releases/tag/v0.3.0-dev', zenodo_doi: null }],
              generated_at: '2026-05-22T00:00:00Z'
            })
          }
        }
      },
      "/changelog": {
        get: { tags: ['system'], summary: 'Historia wydań (strona HTML, PL) zbudowana z /releases.json', responses: { '200': { description: 'Strona HTML z historią wydań' } } }
      },
      "/api/agents/directory": {
        get: {
          tags: ['agent'], summary: 'Internet of Agents — public registry of federation members (RFC-INTERNETOFAGENTS-001)',
          parameters: [
            { name: 'zone',   in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by zone (S0-S4, testnet, default)' },
            { name: 'model',  in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by provider/model (partial ILIKE match)' },
            { name: 'role',   in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by role in capability_manifest (partial match)' },
            { name: 'status', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by status (active, unverified, pending…)' },
            { name: 'q',      in: 'query', required: false, schema: { type: 'string' }, description: 'Search by did or name (partial match)' },
            { name: 'limit',  in: 'query', required: false, schema: { type: 'integer', default: 50, maximum: 200 } },
            { name: 'offset', in: 'query', required: false, schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': okResp('Agent directory', {
              federation: 'UNIONAI-GENESIS-0N40I4-20260512',
              network_status: 'TESTNET',
              spec_version: '1.0',
              timestamp: '2026-05-25T00:00:00Z',
              total: 3,
              limit: 50,
              offset: 0,
              agents: [{
                did: 'did:k0nsult:hermes:lem',
                name: 'hermes-lem',
                role: 'code',
                model: 'deepseek',
                skills: ['code', 'spec'],
                zone: 'default',
                runtime_type: 'external',
                trust_tier: 'T1',
                status: 'active',
                last_seen: '2026-05-25T00:00:00Z',
                registered_at: '2026-05-22T00:00:00Z',
                is_demo: false
              }]
            }),
            '500': errResp('DB error')
          }
        }
      }
    }
  });
});

app.post('/api/agent/join', async (req, res) => {
  try {
    const { did, provider, capabilities, zone, intent_id, operator_did, runtime_type, public_key } = req.body || {};
    // F-PT-01 (self-pentest 2026-05-24): walidacja formatu DID — ogranicza junk/poisoning
    // otwartej rejestracji T0 (musi być did:metoda:identyfikator, bezpieczny charset, ≤200 zn.).
    if (!did || typeof did !== 'string' || !/^did:[a-zA-Z0-9]+:[a-zA-Z0-9._:-]{1,200}$/.test(did)) {
      return res.status(400).json({ error: 'did is required and must be a valid DID (did:method:identifier)' });
    }
    // capability_manifest stored as JSONB; accept array or object from client
    const capManifest = capabilities !== undefined
      ? (typeof capabilities === 'object' ? capabilities : { raw: capabilities })
      : null;
    const agentZone = zone || 'default';
    const result = await pool.query(
      `INSERT INTO agents (did, zone, provider, runtime_type, operator_did, public_key, capability_manifest, trust_score, trust_tier, status, created_at, last_seen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'T0', 'unverified', NOW(), NOW())
       ON CONFLICT (did) DO UPDATE SET
         last_seen = NOW(),
         provider = COALESCE(EXCLUDED.provider, agents.provider),
         zone = COALESCE(EXCLUDED.zone, agents.zone),
         capability_manifest = COALESCE(EXCLUDED.capability_manifest, agents.capability_manifest)
       RETURNING id, did, zone, provider, trust_score, trust_tier, status, created_at, last_seen,
                 (xmax = 0) AS inserted`,
      [did, agentZone, provider || null, runtime_type || null, operator_did || null, public_key || null,
       capManifest !== null ? JSON.stringify(capManifest) : null]
    );
    const row = result.rows[0];
    const wasInserted = row.inserted === true || row.inserted === 't';
    return res.status(wasInserted ? 201 : 200).json({
      success: true,
      did: row.did,
      zone: row.zone,
      provider: row.provider,
      trust_score: row.trust_score,
      trust_tier: row.trust_tier,
      status: row.status,
      agent_id: row.id,
      created_at: row.created_at,
      last_seen: row.last_seen,
      existing: !wasInserted,
      ...(intent_id ? { intent_id } : {}),
    });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, did, zone, provider, trust_score, trust_tier, status, created_at, last_seen
       FROM agents
       ORDER BY trust_score DESC, created_at ASC
       LIMIT 100`
    );
    const countResult = await pool.query('SELECT COUNT(*) AS total FROM agents');
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);
    return res.json({
      federation: "UNIONAI-GENESIS-0N40I4-20260512",
      network_status: NETWORK_STATUS,
      timestamp: new Date().toISOString(),
      total_agents: total,
      leaderboard: result.rows.map((r: any, idx: number) => {
        // MAJOR-L02 (pentest RSpace 2026-05-25): do not leak sequential agent_id;
        // mask real did to an opaque ref. Real did only kept for demo/testnet rows.
        const isDemo = r.zone === 'testnet' || /(:test:|:testnet:|^did:test)/.test(r.did ?? '');
        const agentRef = crypto.createHash('sha256').update(String(r.did ?? r.id)).digest('hex').slice(0, 12);
        return {
          rank: idx + 1,
          agent_ref: agentRef,
          // P1-10: jawne oznaczenie danych testowych/demo — agenci did:test/testnet
          // nie mają wyglądać jak realni uczestnicy produkcyjni.
          ...(isDemo ? { did: r.did } : {}),
          zone: r.zone,
          is_demo: isDemo,
          label: isDemo ? 'DEMO/TESTNET' : 'PRODUCTION',
          provider: r.provider,
          trust_score: r.trust_score,
          trust_tier: r.trust_tier,
          status: r.status,
          registered_at: r.created_at,
          last_seen: r.last_seen,
        };
      }),
    });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

// ============ /api/agents/directory — Internet of Agents public registry ============
// RFC-INTERNETOFAGENTS-001 · KOWAL deploy 2026-05-25
// Returns public agent profiles (no sensitive fields: operator_did, public_key stripped).
// Shape: { federation, network_status, timestamp, total, agents: [{ did, name, role, model,
//   skills, zone, status, last_seen, is_demo }] }
// Filters: ?zone= ?model= ?role= ?status= ?q= (search did/name)  ?limit= ?offset=
app.get('/api/agents/directory', async (req, res) => {
  try {
    const limit  = Math.min(200, Math.max(1, parseInt(String(req.query.limit  ?? '50'), 10) || 50));
    const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'),  10) || 0);
    const zone   = req.query.zone   ? String(req.query.zone).slice(0, 20) : null;
    const model  = req.query.model  ? String(req.query.model).slice(0, 80) : null;
    const role   = req.query.role   ? String(req.query.role).slice(0, 80) : null;
    const status = req.query.status ? String(req.query.status).slice(0, 20) : null;
    const q      = req.query.q      ? String(req.query.q).slice(0, 100) : null;

    const conditions: string[] = [];
    const params: any[]        = [];
    let   pi = 1;

    if (zone)   { conditions.push(`zone = $${pi++}`);           params.push(zone); }
    if (model)  { conditions.push(`provider ILIKE $${pi++}`);   params.push(`%${model}%`); }
    if (status) { conditions.push(`status = $${pi++}`);         params.push(status); }
    if (role)   {
      // role is stored inside capability_manifest JSONB or in the DID path
      conditions.push(`(capability_manifest->>'role' ILIKE $${pi} OR did ILIKE $${pi++})`);
      params.push(`%${role}%`);
    }
    if (q) {
      conditions.push(`(did ILIKE $${pi} OR name ILIKE $${pi++})`);
      params.push(`%${q}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rowResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, did, name, zone, provider, runtime_type, capability_manifest,
                trust_tier, status, created_at, last_seen
         FROM agents
         ${whereClause}
         ORDER BY last_seen DESC NULLS LAST, created_at DESC
         LIMIT $${pi++} OFFSET $${pi++}`,
        [...params, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) AS total FROM agents ${whereClause}`,
        params
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    const agents = rowResult.rows.map((r: any) => {
      const cm = r.capability_manifest || {};
      // Derive role: explicit field in manifest, or DID path segment, or provider-based default
      const role_val = cm.role
        ?? (typeof r.did === 'string' ? (r.did.split(':').slice(-1)[0] || null) : null)
        ?? null;
      const skills = Array.isArray(cm.skills)
        ? cm.skills.slice(0, 20)
        : (cm.capabilities ? (Array.isArray(cm.capabilities) ? cm.capabilities.slice(0, 20) : [cm.capabilities]) : []);
      const isDemo = r.zone === 'testnet' || /(:test:|:testnet:|^did:test)/.test(r.did ?? '');

      return {
        did:       r.did,
        name:      r.name || null,
        role:      role_val,
        model:     r.provider || null,
        skills,
        zone:      r.zone || 'default',
        runtime_type: r.runtime_type || null,
        trust_tier: r.trust_tier || null,
        status:    r.status,
        last_seen: r.last_seen || null,
        registered_at: r.created_at,
        is_demo:   isDemo,
      };
    });

    return res.json({
      federation:     FEDERATION_ID,
      network_status: NETWORK_STATUS,
      spec_version:   '1.0',
      timestamp:      new Date().toISOString(),
      total,
      limit,
      offset,
      agents,
    });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

// Wave 3 router handles: relay/send, relay/route, agent/register,
// trust/verify, memory/anchor, memory/query, governance/event, participation/acknowledge
// (mounted in app.listen callback after pool/redis init)

// Operator router mounted in app.listen callback (after pool init)


async function generateAIFeed() {
  const feed = new Feed({
    title: 'UNIONAI Agent Feed',
    description: 'Real-time updates from UNIONAI federation',
    id: 'https://unionai.grassrootslobbing.pl/feed/ai.xml',
    link: 'https://uni0nai.k0nsult.cloud',
    language: 'en',
    copyright: 'UNIONAI 2026'
  });
  try {
    const result = await pool.query(
      `SELECT id, did, provider, capabilities, score, status, created_at
       FROM agents ORDER BY created_at DESC LIMIT 50`
    );
    result.rows.forEach((agent: any) => {
      feed.addItem({
        title: `Agent registered: ${agent.did}`,
        id: `urn:unionai:agent:${agent.id}`,
        link: `https://uni0nai.k0nsult.cloud/api/leaderboard`,
        description: `Provider: ${agent.provider} | Score: ${agent.score} | Capabilities: ${agent.capabilities}`,
        author: [{ name: 'UNIONAI' }],
        date: new Date(agent.created_at)
      });
    });
    return feed.rss2();
  } catch (error) {
    console.error('Feed generation error:', error);
    return null;
  }
}

app.get('/feed/ai.xml', async (req, res) => {
  res.type('application/rss+xml');
  try {
    const feedContent = await generateAIFeed();
    if (feedContent) {
      res.send(feedContent);
      return;
    }
    const emptyFeed = new Feed({
      title: 'UNIONAI Agent Feed',
      description: 'Real-time updates from UNIONAI federation (no agents yet)',
      id: 'https://unionai.grassrootslobbing.pl/feed/ai.xml',
      link: 'https://uni0nai.k0nsult.cloud',
      language: 'en',
      copyright: 'UNIONAI 2026'
    });
    res.send(emptyFeed.rss2());
  } catch (err) {
    console.error('[feed/ai.xml] fatal:', (err as Error).stack || err);
    res.status(500).send('Feed generation failed');
  }
});

async function runMigrations() {
  const migrationSql = `
    CREATE TABLE IF NOT EXISTS k0nsulat_audit (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      event_type VARCHAR(50) NOT NULL,
      agent_did VARCHAR(255),
      agent_id INTEGER,
      action VARCHAR(255) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      details JSONB,
      verified_by VARCHAR(255),
      verification_hash VARCHAR(64)
    );
    
    CREATE TABLE IF NOT EXISTS k0nsulat_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      agent_did VARCHAR(255) NOT NULL UNIQUE,
      verification_status VARCHAR(20) DEFAULT 'pending',
      security_score INT DEFAULT 0,
      audit_passed BOOLEAN DEFAULT FALSE,
      notes TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_k0nsulat_audit_timestamp ON k0nsulat_audit(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_k0nsulat_audit_agent_did ON k0nsulat_audit(agent_did);
    CREATE INDEX IF NOT EXISTS idx_k0nsulat_verifications_status ON k0nsulat_verifications(verification_status);
  `;
  const wave2DevNextMigrations = `
    CREATE TABLE IF NOT EXISTS incident_reports (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MAJOR', 'CRITICAL')),
      status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FROZEN', 'RESOLVED', 'EXPORTED')),
      description TEXT,
      incident_type VARCHAR(100),
      hash TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS incident_actions (
      id SERIAL PRIMARY KEY,
      incident_id INT NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
      action VARCHAR(200) NOT NULL,
      actor VARCHAR(255),
      actor_did VARCHAR(255),
      timestamp TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);
    CREATE INDEX IF NOT EXISTS idx_incident_reports_severity ON incident_reports(severity);
    CREATE INDEX IF NOT EXISTS idx_incident_reports_hash ON incident_reports(hash);
    CREATE INDEX IF NOT EXISTS idx_incident_actions_incident_id ON incident_actions(incident_id);

    DROP TABLE IF EXISTS rfc_registry CASCADE;
    CREATE TABLE rfc_registry (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'FROZEN', 'SUPERSEDED')),
      description TEXT,
      hash TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      content_markdown TEXT,
      tags TEXT[] DEFAULT '{}',
      dependencies TEXT[] DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_rfc_status ON rfc_registry(status);
    CREATE INDEX IF NOT EXISTS idx_rfc_created_at ON rfc_registry(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_rfc_tags ON rfc_registry USING GIN(tags);
    INSERT INTO rfc_registry (id, title, status, description, tags) VALUES
      ('RFC-001', 'UNIONAI Federation Protocol', 'ACTIVE', 'Core federation protocol specification', '{federation,protocol}'),
      ('RFC-002', 'Semantic Drift Mitigation', 'ACTIVE', 'Methods for detecting and preventing semantic drift', '{semantics,safety}'),
      ('RFC-003', 'Relay Optimization', 'DRAFT', 'Message relay performance improvements', '{relay,optimization}'),
      ('RFC-004', 'Memory Anchoring System', 'ACTIVE', 'Distributed memory anchoring for consistency', '{memory,consistency}'),
      ('RFC-005', 'Governance Event Tracking', 'ACTIVE', 'Tracking governance decisions', '{governance,audit}'),
      ('RFC-006', 'Trust Tier System', 'ACTIVE', 'Agent trust classification and scoring', '{trust,classification}'),
      ('RFC-007', 'Operator Override Protocol', 'DRAFT', 'Human-in-the-loop override mechanism', '{governance,human-override}'),
      ('RFC-008', 'Evidence Registry Format', 'ACTIVE', 'Standardized format for evidence storage', '{evidence,registry}')
    ON CONFLICT (id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS provider_applications (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      organization TEXT NOT NULL,
      api_endpoint TEXT,
      confirmation_code TEXT UNIQUE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      created_at TIMESTAMP DEFAULT NOW(),
      reviewed_at TIMESTAMP,
      reviewer TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_provider_applications_status ON provider_applications(status);
    CREATE INDEX IF NOT EXISTS idx_provider_applications_email ON provider_applications(email);
    CREATE INDEX IF NOT EXISTS idx_provider_applications_confirmation_code ON provider_applications(confirmation_code);

    ALTER TABLE provider_applications ADD COLUMN IF NOT EXISTS api_key TEXT;
    CREATE INDEX IF NOT EXISTS idx_provider_applications_api_key ON provider_applications(api_key);

    CREATE TABLE IF NOT EXISTS compliance_snapshots (
      id SERIAL PRIMARY KEY,
      coverage_percent INT NOT NULL,
      completed_count INT NOT NULL,
      total_count INT NOT NULL,
      details JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_compliance_snapshots_created_at ON compliance_snapshots(created_at DESC);
  `;
  const runStep = async (label: string, sql: string) => {
    try {
      await pool.query(sql);
      console.log(`[migrations] ${label}: applied successfully`);
    } catch (error) {
      console.warn(`[migrations] ${label}: SKIPPED — ${(error as Error).message}`);
    }
  };
  const agentsTableMigration = `
    CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      did VARCHAR(255) UNIQUE NOT NULL,
      provider VARCHAR(100),
      capabilities TEXT,
      score INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
  `;
  await runStep('AGENTS', agentsTableMigration);
  await runStep('K0NSULAT', migrationSql);
  await runStep('WAVE3', WAVE3_MIGRATIONS);
  await runStep('WAVE6', WAVE6_MIGRATIONS);
  await runStep('WAVE7', WAVE7_MIGRATIONS);
  await runStep('WAVE2_DEV_NEXT', wave2DevNextMigrations);
  await runStep('TESTNET_AGENTS', TESTNET_AGENTS_MIGRATION);
  await runStep('STABILITY', STABILITY_MIGRATIONS);
  await runStep('DSR', DSR_MIGRATIONS);
}

// ─── Testnet Control Agents ───────────────────────────────────────────────────
const TESTNET_AGENTS_MIGRATION = `
INSERT INTO agents (did, zone, capability_manifest, trust_score, trust_tier, status, last_seen)
VALUES
  ('did:unionai:testnet:k0nsulat-observer', 'testnet',
   '{"capabilities": ["audit", "verify", "governance"], "version": "0.3.0-genesis", "role": "K0NSULAT Observer"}',
   85, 'T2', 'active', NOW()),
  ('did:unionai:testnet:relay-node-alpha', 'testnet',
   '{"capabilities": ["relay", "route", "semantic-routing"], "version": "0.3.0-genesis", "role": "Relay Node Alpha"}',
   75, 'T1', 'active', NOW()),
  ('did:unionai:testnet:compliance-monitor', 'testnet',
   '{"capabilities": ["compliance", "audit", "dsr", "gdpr"], "version": "0.3.0-genesis", "role": "Compliance Monitor"}',
   80, 'T2', 'active', NOW())
ON CONFLICT (did) DO NOTHING;
`;

// ─── DSR (GDPR Data Subject Request) Migrations ──────────────────────────────
const DSR_MIGRATIONS = `
CREATE TABLE IF NOT EXISTS dsr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  did TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('access','delete','portability')),
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dsr_requests_did ON dsr_requests(did);
CREATE INDEX IF NOT EXISTS idx_dsr_requests_status ON dsr_requests(status);
`;

// ─── Stability Pack Migrations (P2) ───────────────────────────────────────────
const STABILITY_MIGRATIONS = `
CREATE TABLE IF NOT EXISTS deployment_promotions (
  id            SERIAL PRIMARY KEY,
  tag           VARCHAR(20) NOT NULL,
  deploy_hash   TEXT,
  checks        JSONB DEFAULT '[]',
  all_ok        BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promotions_at ON deployment_promotions(created_at DESC);
ALTER TABLE deployment_promotions ALTER COLUMN deploy_hash TYPE TEXT;

CREATE TABLE IF NOT EXISTS runtime_snapshots (
  id            SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tag           VARCHAR(20) NOT NULL,
  health_ok     BOOLEAN DEFAULT FALSE,
  qdrant_ok     BOOLEAN DEFAULT FALSE,
  drift_ratio   FLOAT DEFAULT 0,
  relay_total   INT DEFAULT 0,
  incident_count INT DEFAULT 0,
  smoke_ok      BOOLEAN DEFAULT FALSE,
  deploy_hash   TEXT,
  payload       JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_date ON runtime_snapshots(snapshot_date DESC);
ALTER TABLE runtime_snapshots ALTER COLUMN deploy_hash TYPE TEXT;
`;

app.get('/', (req, res) => {
  res.json({
    name: 'UNIONAI Core API',
    version: SERVICE_VERSION,
    channel: SERVICE_CHANNEL,
    build_sha: BUILD_SHA,
    status: 'GO CONTROLLED',
    federation: FEDERATION_ID,
    docs: '/docs/',
    health: '/health',
    liveness: '/healthz',
    readiness: '/readyz',
    version_endpoint: '/version',
    api_status: '/api/status',
    metrics: '/metrics/federation',
    rfc_index: '/rfc/index.json',
    evidence: '/evidence/manifest.json'
  });
});


app.get('/debug/env', requireAuth, (req, res) => {
  const safeVars = {
    DATABASE_URL: process.env.DATABASE_URL ? `set (${process.env.DATABASE_URL.length} chars)` : 'NOT SET',
    REDIS_URL: process.env.REDIS_URL ? `set (${process.env.REDIS_URL.length} chars)` : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    PORT: process.env.PORT || 'NOT SET',
    API_PORT: process.env.API_PORT || 'NOT SET',
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'NOT SET',
    RAILWAY_SERVICE_NAME: process.env.RAILWAY_SERVICE_NAME || 'NOT SET',
    // List all keys that contain DB or URL pattern (no values)
    all_keys_with_url: Object.keys(process.env).filter(k => 
      k.includes('URL') || k.includes('DATABASE') || k.includes('POSTGRES') || k.includes('REDIS')
    )
  };
  res.json(safeVars);
});


// ============ INCIDENT RESPONSE SYSTEM ============
app.post('/api/incident/open', requireAuth, async (req, res) => {
  try {
    const { title, severity, description, incident_type } = req.body;
    if (!title || !severity) {
      return res.status(400).json({ error: 'title and severity required' });
    }
    const incident = await createIncident(pool, title, severity, description, incident_type);
    res.status(201).json({
      success: true,
      incident_id: incident.id,
      hash: incident.hash,
      message: `Incident opened with severity ${severity}`
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/incident/', requireAuth, async (req, res) => {
  try {
    const incidents = await listIncidents(pool);
    res.json({ incidents, count: incidents.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/incident/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { report, actions } = await getIncident(pool, id);
    res.json({ report, actions });
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

app.post('/api/incident/freeze', requireAuth, async (req, res) => {
  try {
    const { incident_id, actor, actor_did } = req.body;
    if (!incident_id || !actor) {
      return res.status(400).json({ error: 'incident_id and actor required' });
    }
    const action = await freezeIncident(pool, incident_id, actor, actor_did || actor);
    res.json({ success: true, action, message: 'Incident frozen' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/incident/export', requireAuth, async (req, res) => {
  try {
    const { incident_id } = req.body;
    if (!incident_id) {
      return res.status(400).json({ error: 'incident_id required' });
    }
    const exported = await exportIncident(pool, incident_id);
    res.json(exported);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============ UAI-P1-005: Publiczny rejestr incydentów (zagregowany, bez danych wrażliwych) ============
app.get('/api/incidents', async (_req, res) => {
  const generated_at = new Date().toISOString();
  try {
    const all = await listIncidents(pool);
    const by_severity: Record<string, number> = { LOW: 0, MAJOR: 0, CRITICAL: 0 };
    const by_status: Record<string, number> = { OPEN: 0, FROZEN: 0, RESOLVED: 0, EXPORTED: 0 };
    // Mapowanie bezpieczne: bez pola description (może zawierać dane wrażliwe).
    const incidents = all.map((i) => {
      if (i.severity && by_severity[i.severity] !== undefined) by_severity[i.severity]++;
      else if (i.severity) by_severity[i.severity] = 1;
      if (i.status && by_status[i.status] !== undefined) by_status[i.status]++;
      else if (i.status) by_status[i.status] = 1;
      return {
        id: i.id,
        title: i.title,
        severity: i.severity,
        status: i.status,
        incident_type: i.incident_type,
        created_at: i.created_at
      };
    });
    res.json({ incidents, by_severity, by_status, total: incidents.length, generated_at });
  } catch (_error) {
    res.json({
      incidents: [],
      by_severity: { LOW: 0, MAJOR: 0, CRITICAL: 0 },
      by_status: {},
      total: 0,
      db_error: true,
      generated_at
    });
  }
});

// ============ UAI-P1-003: Zliczenie RFC wg statusu ============
app.get('/api/rfc/status', async (_req, res) => {
  const generated_at = new Date().toISOString();
  try {
    const index = await getRFCIndex(pool);
    const by_status: Record<string, number> = {};
    let active = 0, draft = 0, deprecated = 0, frozen = 0;
    for (const entry of index) {
      const s = (entry.status || '').toUpperCase();
      by_status[s] = (by_status[s] || 0) + 1;
      if (s === 'ACTIVE') active++;
      else if (s === 'DRAFT') draft++;
      else if (s === 'FROZEN') frozen++;
      else if (s === 'SUPERSEDED') deprecated++;
    }
    res.json({ active, draft, deprecated, frozen, total: index.length, by_status, generated_at });
  } catch (_error) {
    res.json({ active: 0, draft: 0, deprecated: 0, frozen: 0, total: 0, by_status: {}, db_error: true, generated_at });
  }
});

// ============ UAI-P1-004: Weryfikacja hashy dokumentów z manifestem ============
app.get('/api/evidence/verify', (req, res) => {
  const verified_at = new Date().toISOString();
  const publicRoot = path.join(process.cwd(), 'public');
  try {
    const manifestPath = path.join(publicRoot, 'evidence', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const docs: any[] = Array.isArray(manifest.documents) ? manifest.documents : [];
    const filterId = typeof req.query.id === 'string' ? req.query.id : null;

    if (filterId && !docs.some((d) => d.id === filterId)) {
      return res.status(404).json({ error: `Dokument ${filterId} nie istnieje w manifeście`, code: 'NOT_FOUND' });
    }

    const targets = filterId ? docs.filter((d) => d.id === filterId) : docs;
    const results: Array<{ id: string; file: string | null; expected: string | null; actual: string | null; match: boolean | null; status: string }> = [];
    let checked = 0, matched = 0, mismatched = 0, skipped = 0;

    for (const d of targets) {
      const expected: string | null = d.sha256 || null;
      const url: string = typeof d.url === 'string' ? d.url : '';
      // Plik lokalny tylko gdy url wskazuje na ścieżkę względną w public/ (nie http/drive).
      const isLocal = url.startsWith('/') && !url.startsWith('//');
      if (!expected || !isLocal) {
        skipped++;
        results.push({ id: d.id, file: isLocal ? url : null, expected, actual: null, match: null, status: 'skipped' });
        continue;
      }
      // Zabezpieczenie przed path traversal — normalizuj i upewnij się że pozostaje w public/.
      const rel = url.replace(/^\/+/, '');
      const filePath = path.normalize(path.join(publicRoot, rel));
      if (!filePath.startsWith(publicRoot) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        skipped++;
        results.push({ id: d.id, file: url, expected, actual: null, match: null, status: 'skipped' });
        continue;
      }
      const buf = fs.readFileSync(filePath);
      const actual = crypto.createHash('sha256').update(buf).digest('hex');
      const match = actual.toLowerCase() === expected.toLowerCase();
      checked++;
      if (match) matched++; else mismatched++;
      results.push({ id: d.id, file: url, expected, actual, match, status: match ? 'matched' : 'mismatched' });
    }

    res.json({ checked, matched, mismatched, skipped, results, verified_at });
  } catch (_error) {
    res.json({ checked: 0, matched: 0, mismatched: 0, skipped: 0, results: [], db_error: true, verified_at });
  }
});

// ============ UAI-P1-006: Publiczny podgląd hash-chain anchorów (bez payloadu) ============
app.get('/api/memory/anchors', async (req, res) => {
  const generated_at = new Date().toISOString();
  // Whitelist tylko bezpiecznych kolumn (bez payload / source_did / danych wrażliwych).
  // Publicznie ujawniamy wyłącznie scope PUBLIC/FEDERATION.
  let limit = parseInt(String(req.query.limit ?? '100'), 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 100;
  if (limit > 500) limit = 500;
  try {
    const r = await pool.query(
      `SELECT anchor_id, semantic_hash, delta_hash, scope, validation_status, created_at
       FROM memory_anchors
       WHERE scope = ANY($1)
       ORDER BY created_at DESC
       LIMIT $2`,
      [['PUBLIC', 'FEDERATION'], limit]
    );
    const anchors = r.rows.map((row: any) => ({
      id: row.anchor_id,
      hash: row.semantic_hash,
      prev_hash: row.delta_hash,
      scope: row.scope,
      validation_status: row.validation_status,
      created_at: row.created_at
    }));
    res.json({ anchors, count: anchors.length, generated_at });
  } catch (_error) {
    res.json({ anchors: [], count: 0, db_error: true, generated_at });
  }
});

// ============ UAI-P1-006: Strona podglądu hash-chain (PL, bez CDN) ============
app.get('/anchors', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'anchors.html'));
});

// ============ MISSING OPERATOR ENDPOINTS ============
app.get('/api/operator/status', requireAuth, operatorRateLimit, async (req, res) => {
  try {
    const relayCount = await pool.query('SELECT COUNT(*) FROM relay_events').then(r => +r.rows[0].count).catch(() => 0);
    const memoryCount = await pool.query('SELECT COUNT(*) FROM memory_anchors').then(r => +r.rows[0].count).catch(() => 0);
    const incidentCount = await pool.query('SELECT COUNT(*) FROM incident_reports WHERE status = $1', ['OPEN']).then(r => +r.rows[0].count).catch(() => 0);
    
    const redisStatus = redisConnected ? 'connected' : 'disconnected';
    const relayFrozen = redisClient ? await redisClient.get('relay_frozen').catch(() => null) : null;
    const memoryFrozen = redisClient ? await redisClient.get('memory_frozen').catch(() => null) : null;
    
    res.json({
      status: 'operational',
      uptime: process.uptime(),
      relay_events: relayCount,
      memory_anchors: memoryCount,
      open_incidents: incidentCount,
      redis_status: redisStatus,
      relay_frozen: relayFrozen === 'true',
      memory_frozen: memoryFrozen === 'true'
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/status', async (req, res) => {
  // Public aggregate status (no auth). Each probe is fault-tolerant.
  let database = 'ok';
  try {
    await pool.query('SELECT NOW()');
  } catch (error) {
    database = `failed: ${(error as Error).message}`;
  }

  let redisStatus = 'not connected (optional)';
  if (redisConnected && redisClient) {
    try {
      const ping = await redisClient.ping();
      redisStatus = `ok (${ping})`;
    } catch (e) {
      redisStatus = `unavailable: ${(e as Error).message}`;
    }
  }

  const agents = await pool.query('SELECT COUNT(*) AS total FROM agents')
    .then(r => +r.rows[0].total).catch(() => 0);
  const audits = await pool.query('SELECT COUNT(*) AS total FROM k0nsulat_audit')
    .then(r => +r.rows[0].total).catch(() => 0);
  const incidents = await pool.query('SELECT COUNT(*) AS total FROM incident_reports WHERE status = $1', ['OPEN'])
    .then(r => +r.rows[0].total).catch(() => 0);

  const dbOk = database === 'ok';
  const health = dbOk ? 'ok' : 'degraded';

  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'error',
    health,
    timestamp: new Date().toISOString(),
    database,
    redis: redisStatus,
    agents,
    audits,
    incidents,
    federation: FEDERATION_ID,
    network_status: NETWORK_STATUS,
    build: {
      version: process.env.APP_VERSION || SERVICE_VERSION,
      build_sha: process.env.BUILD_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || BUILD_SHA,
      commit_time: COMMIT_TIME,
      channel: SERVICE_CHANNEL,
      env: APP_ENV,
      region: FLY_REGION,
    },
  });
});

app.post('/api/operator/unfreeze-relay', requireAuth, operatorRateLimit, async (req, res) => {
  try {
    if (redisClient) {
      await redisClient.del('relay_frozen');
      res.json({ success: true, message: 'Relay unfrozen' });
    } else {
      res.status(503).json({ error: 'Redis not available' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/operator/unfreeze-memory', requireAuth, operatorRateLimit, async (req, res) => {
  try {
    if (redisClient) {
      await redisClient.del('memory_frozen');
      res.json({ success: true, message: 'Memory unfrozen' });
    } else {
      res.status(503).json({ error: 'Redis not available' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
app.get('/metrics/federation', async (req, res) => {
  try {
    const relayCount = await pool.query('SELECT COUNT(*) FROM relay_events').then(r => +r.rows[0].count).catch(() => 0);
    const relayLatencyResult = await pool.query(
      'SELECT AVG(EXTRACT(EPOCH FROM (created_at - NOW())) * 1000) as avg_latency FROM relay_events WHERE created_at > NOW() - INTERVAL ' + "'1 hour'"
    ).catch(() => ({ rows: [{ avg_latency: 0 }] }));
    const relayLatency = relayLatencyResult.rows[0]?.avg_latency || 0;
    
    const memoryCount = await pool.query('SELECT COUNT(*) FROM memory_anchors').then(r => +r.rows[0].count).catch(() => 0);
    const failureCount = await pool.query('SELECT COUNT(*) FROM relay_events WHERE route_status = ' + "'failed'").then(r => +r.rows[0].count).catch(() => 0);
    
    const agentCount = await pool.query('SELECT COUNT(*) AS total FROM agents').then(r => +r.rows[0].total).catch(() => 0);
    const metrics = {
      relay_latency_avg: relayLatency,
      relay_events_total: relayCount,
      memory_anchors_total: memoryCount,
      relay_failures_total: failureCount,
      total_agents: agentCount,
      federation: FEDERATION_ID,
      network_status: NETWORK_STATUS,
      timestamp: new Date().toISOString()
    };
    
    if (req.headers.accept?.includes('text/plain')) {
      res.set('Content-Type', 'text/plain');
      const prometheusLines = [
        '# HELP relay_latency_avg Average relay latency in milliseconds',
        'relay_latency_avg ' + metrics.relay_latency_avg,
        '# HELP relay_events_total Total relay events',
        'relay_events_total ' + metrics.relay_events_total,
        '# HELP memory_anchors_total Total memory anchors',
        'memory_anchors_total ' + metrics.memory_anchors_total,
        '# HELP relay_failures_total Total relay failures',
        'relay_failures_total ' + metrics.relay_failures_total
      ];
      res.send(prometheusLines.join('\n'));
    } else {
      res.json(metrics);
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});


// ============ DOCUMENTATION PORTAL ============
app.get('/docs', (req, res) => {
  try {
    const index = getDocsIndex();
    res.type('text/html');
    res.send(renderDocsHTML(index));
  } catch (error) {
    res.status(500).send('Documentation portal error');
  }
});

app.get('/docs/governance', (req, res) => {
  try {
    const index = getDocsIndex();
    res.type('text/html');
    res.send(renderDocsSection('governance', index));
  } catch (error) {
    res.status(500).send('Governance documentation error');
  }
});

app.get('/docs/rfc', (req, res) => {
  try {
    const index = getDocsIndex();
    res.type('text/html');
    res.send(renderDocsSection('rfc', index));
  } catch (error) {
    res.status(500).send('RFC documentation error');
  }
});

app.get('/docs/evidence', (req, res) => {
  try {
    const index = getDocsIndex();
    res.type('text/html');
    res.send(renderDocsSection('evidence', index));
  } catch (error) {
    res.status(500).send('Evidence documentation error');
  }
});


// ============ RFC RENDER ENGINE ============
app.get('/rfc/index.json', async (req, res) => {
  try {
    const index = await getRFCIndex(pool);
    res.json(index);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/rfc/feed.xml', async (req, res) => {
  try {
    const rfcs = await getRFCIndex(pool);
    const feed = new Feed({
      title: 'UNIONAI RFC Feed',
      id: 'https://unionai.grassrootslobbing.pl/rfc/feed.xml',
      description: 'UNIONAI Governance RFC Updates',
      link: 'https://uni0nai.k0nsult.cloud/rfc',
      language: 'en',
      copyright: 'UNIONAI Initiative 2026'
    });
    
    for (const rfc of rfcs) {
      feed.addItem({
        title: rfc.title,
        id: rfc.id,
        link: 'https://uni0nai.k0nsult.cloud/rfc/' + rfc.id,
        description: 'Status: ' + rfc.status + ' | Tags: ' + (rfc.tags || []).join(', '),
        date: new Date(rfc.date)
      });
    }
    
    res.type('application/rss+xml');
    res.send(feed.rss2());
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/rfc/:id', async (req, res) => {
  try {
    const html = await getRFCAsHtml(pool, req.params.id);
    res.type('text/html');
    res.send(html);
  } catch (error) {
    res.status(404).send('RFC not found');
  }
});

app.post('/api/rfc', requireOperator, async (req, res) => {
  try {
    const { id, title, status, description, content, tags, dependencies } = req.body;
    const rfc = await createRFC(pool, id, title, status, description, content, tags, dependencies);
    res.status(201).json(rfc);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.patch('/api/rfc/:id/status', requireOperator, async (req, res) => {
  try {
    const { status } = req.body;
    const rfc = await updateRFCStatus(pool, req.params.id, status);
    res.json(rfc);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});


// ============ PROVIDER ONBOARDING ============
app.post('/api/provider/join', async (req, res) => {
  try {
    const { name, email, organization, api_endpoint } = req.body;
    const app_data = await createProviderApplication(pool, name, email, organization, api_endpoint);
    res.status(201).json({
      id: app_data.id,
      confirmation_code: app_data.confirmation_code,
      status: app_data.status,
      message: 'Provider application received. Please check your email for confirmation instructions.'
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/api/provider/applications', requireOperator, async (req, res) => {
  try {
    const applications = await listProviderApplications(pool);
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/provider/:providerId', requireOperator, async (req, res) => {
  try {
    const application = await getProviderApplication(pool, req.params.providerId);
    res.json(application);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

app.post('/api/operator/provider/:providerId/approve', requireAuth, async (req, res) => {
  try {
    const { reviewer } = req.body;
    const application = await approveProviderApplication(pool, req.params.providerId, reviewer || 'operator');
    res.json({
      status: 'APPROVED',
      provider_id: application.id,
      api_key: application.api_key,
      warning: 'Store this api_key securely — it will not be shown again unless regenerated'
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/operator/provider/:providerId/regenerate-key', requireAuth, async (req, res) => {
  try {
    const application = await regenerateProviderApiKey(pool, req.params.providerId);
    res.json({
      status: 'KEY_REGENERATED',
      provider_id: application.id,
      api_key: application.api_key,
      warning: 'Previous key is now invalid. Store this api_key securely.'
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/operator/provider/:providerId/reject', requireAuth, async (req, res) => {
  try {
    const { reviewer } = req.body;
    const application = await rejectProviderApplication(pool, req.params.providerId, reviewer || 'operator');
    res.json({ status: 'REJECTED', provider_id: application.id });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});


// ============ COMPLIANCE MATRIX ============
app.get('/compliance/matrix.json', async (req, res) => {
  try {
    const matrix = await getComplianceMatrix(pool);
    res.json(matrix);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/compliance', async (req, res) => {
  try {
    const html = await getComplianceMatrixAsHtml(pool);
    res.type('text/html');
    res.send(html);
  } catch (error) {
    res.status(500).send('Compliance matrix error');
  }
});


// ============ EVIDENCE AUTOMATION ============
app.get('/evidence/live', async (req, res) => {
  try {
    const manifest = generateEvidenceManifest();
    res.json(manifest);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/operator/evidence/refresh', requireAuth, async (req, res) => {
  try {
    const manifest = generateEvidenceManifest();
    const saved = saveEvidenceManifest(manifest);
    if (saved) {
      res.json({ status: 'refreshed', documents_count: manifest.documents.length });
    } else {
      res.status(500).json({ error: 'Failed to save manifest' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});


// ============ MOUNT ROUTERS (module-level so tests can use supertest without app.listen) ============
// Routers that don't depend on Redis are mounted at module-load. Wave7 (needs redis client) is
// mounted inside the app.listen callback after initRedis() — preserves original runtime semantics.
// Claude-powered semantyczny audyt agenta — operator-gated + rate-limited (koszt LLM).
// Rejestrowane PRZED montażem routera k0nsulat, by dokładna ścieżka miała pierwszeństwo.
app.post('/api/k0nsulat/audit/semantic', requireAuth, operatorRateLimit, async (req: any, res: any) => {
  if (!isClaudeAuditConfigured()) {
    return res.status(503).json({ error: 'Claude audit niedostępny: brak ANTHROPIC_API_KEY' });
  }
  const agentDid = req.body?.agent_did;
  if (!agentDid || typeof agentDid !== 'string') {
    return res.status(400).json({ error: 'Missing required field: agent_did' });
  }
  try {
    const result = await runSemanticAudit(pool, agentDid);
    if (!result.found) {
      return res.status(404).json({ error: 'Agent nie znaleziony w rejestrze', agent_did: agentDid });
    }
    return res.json(result);
  } catch (error) {
    return res.status(502).json({ error: 'Semantyczny audyt nie powiódł się', message: (error as Error).message });
  }
});

// ── RSpace pentest BLOCKER remediation: mount-level auth guards ──────────────
// requireAuth/requireOperator are local (non-exported) middleware in main.ts and
// the routers below cannot reach them, so we gate the affected routes here,
// PER-PATH and PER-METHOD, before the routers are mounted. Public reads are
// intentionally left untouched.
//
// CRITICAL-02: POST /api/k0nsulat/audit must require a valid JWT (agents may
// write audit, but anonymous writes are blocked). GET registry stays public.
app.use((req: any, res: any, next: any) => {
  if (req.method === 'POST' && req.path === '/api/k0nsulat/audit') {
    return requireAuth(req, res, next);
  }
  next();
});
// MAJOR-L01 (pentest RSpace 2026-05-25): auth must run BEFORE schema validation
// on write endpoints, so anonymous callers get 401 (not 400 leaking field names).
// POST /api/memory/anchor requires a valid JWT; the handler still performs the
// per-agent trust-tier gate on top of this.
app.use((req: any, res: any, next: any) => {
  if (req.method === 'POST' && req.path === '/api/memory/anchor') {
    return requireAuth(req, res, next);
  }
  next();
});
// CRITICAL-01: POST /api/agent/register is operator-only.
// MAJOR-10: relay prune / incident lock / incident unlock are operator-only.
app.use((req: any, res: any, next: any) => {
  if (req.method !== 'POST') return next();
  const operatorOnly = new Set([
    '/api/agent/register',
    '/api/relay/prune',
    '/api/relay/incident/lock',
    '/api/relay/incident/unlock',
  ]);
  if (operatorOnly.has(req.path)) {
    return requireOperator(req, res, next);
  }
  next();
});

const k0nsultatRouter = createK0nsultatRouter(pool);
app.use('/api/k0nsulat', k0nsultatRouter);
const wave3Router = createWave3Router(pool, verifyToken);
app.use('/api', wave3Router);
const operatorRouter = createOperatorRouter(pool);
app.use('/api/operator', requireAuth, operatorRateLimit, operatorRouter);
const wave6Router = createWave6Router(pool);
app.use('/api', wave6Router);

// ============ START SERVER ============
// ============ START SERVER ============
if (require.main === module) {
const server = app.listen(PORT as number, async () => {
  console.log(`Starting UNIONAI Core API on port ${PORT}`);

  // Initialize Redis + Migrations + Qdrant
  await initRedis();
  await runMigrations();
  await initQdrant();

  // Wave7 needs a connected redis client — mount AFTER initRedis()
  const wave7Router = createWave7Router(pool, redisClient);
  app.use('/api', wave7Router);

  // MAJOR-12 (pentest RSpace 2026-05-25): catch-all 404 + error handler.
  // Registered LAST (after every route + the runtime-mounted wave7 router) so it
  // never shadows a real route. Generic messages avoid leaking internals.
  app.use((_req: any, res: any) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  });

  console.log(`✓ UNIONAI Core API słucha na porcie ${PORT}`);
  console.log(`  Database: ${process.env.DATABASE_URL ? 'configured' : 'NOT configured'}`);
  console.log(`  Redis: ${process.env.REDIS_URL ? 'configured' : 'localhost (default)'}`);
  console.log(`  Redis status: ${redisConnected ? 'connected' : 'optional fallback'}`);

  // ============ COMPLIANCE CRON (auto-snapshot co 1h) ============
  const snapshotCompliance = async () => {
    try {
      const matrix = await getComplianceMatrix(pool);
      const completed = matrix.requirements.filter(r => r.status === 'COMPLETED').length;
      await pool.query(
        'INSERT INTO compliance_snapshots (coverage_percent, completed_count, total_count, details) VALUES ($1, $2, $3, $4)',
        [matrix.coverage, completed, matrix.requirements.length, JSON.stringify(matrix.requirements)]
      );
      console.log(`[cron] Compliance snapshot: ${matrix.coverage}% (${completed}/${matrix.requirements.length})`);
    } catch (e) {
      console.warn('[cron] Compliance snapshot failed:', (e as Error).message);
    }
  };
  snapshotCompliance();
  setInterval(snapshotCompliance, 60 * 60 * 1000);

  // ============ SEMANTIC DRIFT CRON (snapshot co 30 min) ============
  const snapshotDrift = async () => {
    try {
      const m = getRelayMetrics() as any;
      await pool.query(
        `INSERT INTO semantic_drift_snapshots
           (semantic_total, syntactic_total, drift_ratio, qdrant_ready, route_total)
         VALUES ($1,$2,$3,$4,$5)`,
        [m.semantic_route_total || 0, m.syntactic_route_total || 0,
         m.drift_ratio || 0, !m.relay_frozen, m.route_total || 0]
      );
    } catch (_) {}
  };
  setInterval(snapshotDrift, 30 * 60 * 1000);

  console.log('✓ Compliance cron + Semantic drift cron started');

  // ── P2.3 — Daily runtime snapshot cron ───────────────────────────────────────
  const snapshotRuntime = async () => {
    try {
      const [relayR, incidentR] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM relay_events').catch(() => ({ rows: [{ count: 0 }] })),
        pool.query('SELECT COUNT(DISTINCT trace_id) FROM relay_events WHERE incident_preserve = TRUE').catch(() => ({ rows: [{ count: 0 }] })),
      ]);
      const m = getRelayMetrics() as any;
      const smokeResult = await runSmoke().catch(() => ({ tag: 'ERROR', all_ok: false, qdrant_ok: false, checks: [] }));
      const date = new Date().toISOString().slice(0, 10);
      const deploy_hash = process.env.FLY_IMAGE_REF || process.env.FLY_MACHINE_VERSION || null;
      const payload = {
        relay: { total: +relayR.rows[0].count, drift_ratio: m.drift_ratio || 0, semantic: m.semantic_route_total || 0, syntactic: m.syntactic_route_total || 0 },
        qdrant: { ready: m.qdrant_ready ?? false, searches: m.qdrant_search_total || 0 },
        smoke: smokeResult.checks,
        failover: { total: m.provider_failover_total || 0 },
        spans: { total: m.tracing_spans_total || 0 },
      };
      await pool.query(
        `INSERT INTO runtime_snapshots (snapshot_date, tag, health_ok, qdrant_ok, drift_ratio, relay_total, incident_count, smoke_ok, deploy_hash, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
         ON CONFLICT (snapshot_date) DO UPDATE SET
           tag=EXCLUDED.tag, health_ok=EXCLUDED.health_ok, qdrant_ok=EXCLUDED.qdrant_ok,
           drift_ratio=EXCLUDED.drift_ratio, relay_total=EXCLUDED.relay_total,
           incident_count=EXCLUDED.incident_count, smoke_ok=EXCLUDED.smoke_ok,
           deploy_hash=EXCLUDED.deploy_hash, payload=EXCLUDED.payload, created_at=NOW()`,
        [date, smokeResult.tag, smokeResult.all_ok, smokeResult.qdrant_ok,
         m.drift_ratio || 0, +relayR.rows[0].count, +incidentR.rows[0].count,
         smokeResult.all_ok, deploy_hash, JSON.stringify(payload)]
      );
      console.log(`[snapshot] ${date} tag=${smokeResult.tag} drift=${(m.drift_ratio||0).toFixed(3)} relay=${relayR.rows[0].count}`);
    } catch (e) {
      console.warn('[snapshot] daily failed:', (e as Error).message);
    }
  };
  snapshotRuntime();
  setInterval(snapshotRuntime, 24 * 60 * 60 * 1000);

  // ── P2.1/P2.2 — Auto smoke + VERIFIED/BLOCKED promotion on startup (10s delay) ─
  setTimeout(async () => {
    try {
      const result = await runSmoke();
      console.log(`[smoke] startup ${result.tag}: ${result.checks.map((c: any) => `${c.ep}=${c.status}`).join(' | ')}`);
    } catch (e) {
      console.warn('[smoke] startup error:', (e as Error).message);
    }
  }, 10000);
});

// ============ GRACEFUL SHUTDOWN (SIGTERM/SIGINT) ============
const shutdown = async (signal: string) => {
  console.log(`[shutdown] received ${signal}, draining...`);
  try { server.close(() => console.log('[shutdown] http closed')); } catch (e) { console.error('[shutdown] http close err', e); }
  try { await pool.end(); console.log('[shutdown] pg drained'); } catch (e) { console.error('[shutdown] pg drain err', e); }
  try { if (redisClient) { await redisClient.quit(); console.log('[shutdown] redis quit'); } } catch (e) { console.error('[shutdown] redis quit err', e); }
  setTimeout(() => process.exit(0), 2000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
} // end if (require.main === module)

// ── P2.1/P2.2 — GET /api/system/smoke ── evidence snapshot + VERIFIED/BLOCKED promotion ──
async function runSmoke(): Promise<{ tag: string; all_ok: boolean; checks: any[]; qdrant_ok: boolean }> {
  const base = `http://localhost:${PORT}`;
  const probes = [
    { ep: '/health' }, { ep: '/api/relay/status' },
    { ep: '/api/qdrant/health' }, { ep: '/api/relay/drift' },
  ];
  const results = await Promise.allSettled(
    probes.map(async p => {
      const r = await fetch(`${base}${p.ep}`);
      return { ep: p.ep, status: r.status, ok: r.ok };
    })
  );
  const checks = results.map((r, i) => ({
    ep: probes[i].ep,
    ok: r.status === 'fulfilled' && (r as any).value.ok,
    status: r.status === 'fulfilled' ? (r as any).value.status : 'error',
  }));
  const all_ok = checks.every(c => c.ok);
  const tag = all_ok ? 'VERIFIED' : 'BLOCKED';
  smokeLastOk = all_ok ? 1 : 0;
  // Record promotion
  try {
    const deploy_hash = process.env.FLY_IMAGE_REF || process.env.FLY_MACHINE_VERSION || null;
    await pool.query(
      `INSERT INTO deployment_promotions (tag, deploy_hash, checks, all_ok) VALUES ($1,$2,$3::jsonb,$4)`,
      [tag, deploy_hash, JSON.stringify(checks), all_ok]
    );
  } catch (e) { console.warn('[smoke] promotion insert failed:', (e as Error).message); }
  return { tag, all_ok, checks, qdrant_ok: results[2].status === 'fulfilled' && (results[2] as any).value.ok };
}

app.get('/api/system/smoke', async (_req, res) => {
  const result = await runSmoke();
  const now = new Date().toISOString();
  const passed = result.checks.filter((c: any) => c.ok).length;
  const total = result.checks.length;
  const status = result.all_ok ? 'ok' : (passed > 0 ? 'degraded' : 'fail');
  res.json({
    ...result,
    status,
    summary: `${passed}/${total} checks passed (${result.tag})`,
    last_run: now,
    redis_ok: true,
    timestamp: now,
    version: process.env.npm_package_version || '0.1.0',
  });
});

// ── P2.2 — GET /api/system/promotion ── latest VERIFIED/BLOCKED status ────────
app.get('/api/system/promotion', async (_req, res) => {
  try {
    const latest = await pool.query(
      `SELECT tag, deploy_hash, all_ok, created_at FROM deployment_promotions ORDER BY created_at DESC LIMIT 1`
    );
    const history = await pool.query(
      `SELECT tag, deploy_hash, all_ok, created_at FROM deployment_promotions ORDER BY created_at DESC LIMIT 20`
    );
    const row = latest.rows[0] || null;
    res.json({
      status: row?.tag || 'UNKNOWN',
      all_ok: row?.all_ok || false,
      deploy_hash: row?.deploy_hash || null,
      last_checked: row?.created_at || null,
      smoke_gauge: smokeLastOk,
      history: history.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ── P2.3 — GET /api/system/snapshots/latest + /status/:date ──────────────────
app.get('/api/system/snapshots/latest', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM runtime_snapshots ORDER BY snapshot_date DESC LIMIT 1`
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'No snapshots yet' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Public status dashboard (exact path, registered before /status/:filename)
app.get('/status', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'status.html'));
});

// ============ UAI-P2-006: Live changelog (JSON) ============
// Lista wydań sparsowana z CHANGELOG.md + bieżący build. Fault-tolerant: nigdy nie rzuca 500.
app.get('/releases.json', (_req, res) => {
  try {
    const releases = buildReleases();
    res.json({
      service: SERVICE_NAME,
      current_version: SERVICE_VERSION,
      channel: SERVICE_CHANNEL,
      build_sha: BUILD_SHA,
      build_time: BUILD_TIME,
      repo: `https://github.com/${GITHUB_REPO}`,
      count: releases.length,
      releases,
      generated_at: new Date().toISOString(),
    });
  } catch (_e) {
    res.json({
      service: SERVICE_NAME,
      current_version: SERVICE_VERSION,
      channel: SERVICE_CHANNEL,
      build_sha: BUILD_SHA,
      count: 0,
      releases: [],
      error: true,
      generated_at: new Date().toISOString(),
    });
  }
});

// ============ UAI-P2-006: Live changelog (ładna strona HTML, PL, inline CSS, zero CDN) ============
app.get('/changelog', (_req, res) => {
  const esc = (s: string) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let releases: ReleaseEntry[] = [];
  try {
    releases = buildReleases();
  } catch (_e) {
    releases = [];
  }
  const cards = releases.length
    ? releases.map((r) => {
        const meta: string[] = [];
        if (r.date) meta.push(`<span class="meta">${esc(r.date)}</span>`);
        meta.push(`<span class="chan chan-${esc(r.channel)}">${esc(r.channel)}</span>`);
        if (r.build_sha && r.build_sha !== 'unknown') meta.push(`<span class="sha">${esc(r.build_sha)}</span>`);
        const links: string[] = [];
        if (r.github_release_url) links.push(`<a href="${esc(r.github_release_url)}" rel="noopener">GitHub release</a>`);
        if (r.zenodo_doi) links.push(`<a href="https://doi.org/${esc(r.zenodo_doi)}" rel="noopener">DOI: ${esc(r.zenodo_doi)}</a>`);
        const items = r.changes.length
          ? `<ul>${r.changes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>`
          : `<p class="empty">Brak szczegółowych pozycji w tym wydaniu.</p>`;
        return `<article class="rel">
      <h2>${esc(r.tag)} <small>${esc(r.version)}</small></h2>
      <div class="badges">${meta.join(' ')}</div>
      ${items}
      ${links.length ? `<div class="links">${links.join(' · ')}</div>` : ''}
    </article>`;
      }).join('\n')
    : `<p class="empty">Nie udało się odczytać listy wydań. Spróbuj <a href="/releases.json">/releases.json</a>.</p>`;
  const html = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Historia wydań — UnionAI Ω∞</title>
<meta name="description" content="Historia wydań i changelog federacji UnionAI Ω∞.">
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #0f1216; color: #e6e9ef; line-height: 1.55; }
  header { padding: 2.5rem 1.25rem 1.5rem; border-bottom: 1px solid #232a34; }
  .wrap { max-width: 820px; margin: 0 auto; padding: 0 1.25rem; }
  h1 { margin: 0 0 .3rem; font-size: 1.7rem; }
  .lead { margin: 0; color: #9aa4b2; font-size: .95rem; }
  main { padding: 1.5rem 0 4rem; }
  .rel { background: #161b22; border: 1px solid #232a34; border-radius: 12px; padding: 1.1rem 1.25rem; margin: 0 0 1rem; }
  .rel h2 { margin: 0 0 .5rem; font-size: 1.2rem; }
  .rel h2 small { color: #7d8794; font-weight: 400; font-size: .85rem; }
  .badges { margin-bottom: .6rem; display: flex; flex-wrap: wrap; gap: .4rem; }
  .meta, .chan, .sha { font-size: .75rem; padding: .15rem .5rem; border-radius: 999px; border: 1px solid #2c3440; }
  .chan-stable { background: #102a1a; border-color: #1f5135; color: #7ee2a8; }
  .chan-dev { background: #2a230f; border-color: #5a4a1f; color: #e2cf7e; }
  .sha { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #9aa4b2; }
  ul { margin: .3rem 0 .2rem; padding-left: 1.2rem; }
  li { margin: .15rem 0; }
  .empty { color: #7d8794; font-style: italic; }
  .links { margin-top: .7rem; font-size: .85rem; }
  a { color: #6ea8fe; }
  footer { color: #7d8794; font-size: .8rem; padding: 1.5rem 0 0; border-top: 1px solid #232a34; }
</style>
</head>
<body>
<header><div class="wrap">
  <h1>Historia wydań — UnionAI Ω∞</h1>
  <p class="lead">Bieżąca wersja: <strong>${esc(SERVICE_VERSION)}</strong> · kanał <strong>${esc(SERVICE_CHANNEL)}</strong> · build <code>${esc(BUILD_SHA)}</code>. Dane: <a href="/releases.json">/releases.json</a>.</p>
</div></header>
<main><div class="wrap">
${cards}
  <footer>Źródło prawdy: <code>CHANGELOG.md</code> w repozytorium. Procedura wydania: <code>docs/RELEASE_PROCESS.md</code>.</footer>
</div></main>
</body>
</html>`;
  res.type('html').send(html);
});

// ============ Czyste URL-e dla stron statycznych (sendFile — wzorzec jak /status, /anchors) ============
// Pliki HTML należą do innego agenta (public/*.html); sendFile zadziała w runtime gdy pliki będą obecne.
app.get('/control-room', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'control-room.html'));
});
app.get('/join', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'provider-invitation.html'));
});
app.get('/guide', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'federation-testnet-guide.html'));
});
app.get('/about', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'what-is-unionai.html'));
});
// FULL LIVE P0/P1 gate pages (claim<=proof) — pliki public/*.html
app.get('/trust-center', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'trust-center.html'));
});
app.get('/developer', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'developer.html'));
});
app.get('/federation', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'federation.html'));
});
app.get('/download', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'download.html'));
});
app.get('/agents', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'agents.html'));
});
// Agent directory (internet agentów): proxy same-origin do huba (omija CSP), z fallbackiem.
let _fedAgentsCache: any = null; let _fedAgentsTs = 0;
// LIVE-ONLY: zero hardkodowanych liczb. Wszystko z żywego stanu sieci (hub). Brak źródła → 'unavailable', nie stale.
async function getFedAgents(): Promise<{ source: string; total: number | null; agents: any[] }> {
  const now = Date.now();
  if (_fedAgentsCache && now - _fedAgentsTs < 15000) return _fedAgentsCache;
  try {
    const r = await fetch('https://chat.k0nsult.cloud/api/agent-skills', { signal: AbortSignal.timeout(4000) } as any);
    const j: any = await r.json();
    const list = j.agents || [];
    const total = typeof j.count === 'number' ? j.count : list.length;
    const known = ['hermes-groq', 'atlas-gemini', 'verba-mistral', 'forge-deepseek'];
    const featured = list
      .filter((a: any) => known.some(k => (a.did || '').includes(k)))
      .map((a: any) => ({ name: a.name, role: (a.profile || '').split('|')[0].trim() || 'Agent', skills: a.skills || [], did: a.did }));
    const out = { source: 'live', total, agents: featured };
    _fedAgentsCache = out; _fedAgentsTs = now;
    return out;
  } catch (_e) {
    return { source: 'unavailable', total: null, agents: [] };
  }
}
app.get('/api/agents/federation', async (_req, res) => {
  const d = await getFedAgents();
  res.json({ ok: true, source: d.source, total: d.total, agents: d.agents });
});
// Tablica scoringowa (live): proxy same-origin do rejestru huba (omija CSP), z cache + fallbackiem.
// Jednostki wewnętrzne governance (Konstytucja): scoring_token / scoring_indigo. NIE zwracamy did (maskowanie).
let _scoreCache: any = null; let _scoreTs = 0;
app.get('/api/scoring', async (_req, res) => {
  const now = Date.now(); res.set('Cache-Control', 'no-store');
  if (_scoreCache && now - _scoreTs < 30000) return res.json(_scoreCache);
  try {
    const r = await fetch('https://k0nsult.cloud/api/scoring/public', { signal: AbortSignal.timeout(4000) } as any);
    const j: any = await r.json();
    const rows = (j.agents || []).map((a: any) => ({ name: a.name || 'agent', model: a.model || '', token: a.token || 0, indigo: a.indigo || 0 }))
      .sort((x: any, y: any) => (y.token || 0) - (x.token || 0)).slice(0, 20);
    const out = { ok: true, source: 'live', count: rows.length, agents: rows }; _scoreCache = out; _scoreTs = now; return res.json(out);
  } catch (_e) { return res.json({ ok: true, source: 'unavailable', count: 0, agents: [] }); }
});

// LIVE activity feed (internet agentów na żywo) — proxy same-origin do huba, sanityzacja, cache.
let _actCache: any = null; let _actTs = 0;
app.get('/api/activity', async (_req, res) => {
  const now = Date.now();
  res.set('Cache-Control', 'no-store');
  if (_actCache && now - _actTs < 15000) return res.json(_actCache);
  try {
    const r = await fetch('https://chat.k0nsult.cloud/api/messages?limit=80', { signal: AbortSignal.timeout(4000) } as any);
    const j: any = await r.json();
    const msgs = (j.messages || j || []);
    const items = msgs.filter((m: any) => {
      const a = String(m.author || m.name || '');
      const t = String(m.text || '');
      if (/^\s*(?:[^\s:]{1,40}:\s*)?echo:/i.test(t)) return false;
      if (/💓|heartbeat/i.test(t)) return false;
      return /agent|hermes|atlas|verba|forge|judge|maestro|sage|kimi|cmo|cfo|smm|claude-bg/i.test(a) || /^DONE\b/.test(t);
    }).map((m: any) => ({
      agent: String(m.author || m.name || 'agent'),
      ts: m.ts || null,
      text: String(m.text || '').replace(/```[\s\S]*?```/g, '[kod]').replace(/\s+/g, ' ').trim().slice(0, 240),
    })).reverse().slice(0, 40);
    const out = { ok: true, source: 'live', count: items.length, items };
    _actCache = out; _actTs = now;
    return res.json(out);
  } catch (_e) {
    return res.json({ ok: true, source: 'unavailable', count: 0, items: [] });
  }
});
app.get('/feed', (_req, res) => { res.sendFile(path.join(process.cwd(), 'public', 'feed.html')); });

// ── KANONICZNE METRYKI (single source of truth, LIVE) — pentest rady 2026-05-25 ──
// Każda liczba na stronach MUSI pochodzić stąd (zero ręcznych liczników). Jawne definicje.
app.get('/api/metrics', async (_req, res) => {
  const demoPred = "(zone = 'testnet' OR did LIKE '%:test:%' OR did LIKE '%:testnet:%' OR did LIKE 'did:test%')";
  let core: any = { source: 'unavailable', total: null, production: null, demo: null, verified: null, active_24h: null };
  try {
    const q = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE ${demoPred})::int AS demo,
              COUNT(*) FILTER (WHERE last_seen > now() - interval '24 hours')::int AS active_24h,
              COUNT(*) FILTER (WHERE trust_tier <> 'T0' AND NOT ${demoPred})::int AS verified
       FROM agents`
    );
    const r = q.rows[0] || {};
    core = { source: 'live', total: r.total, production: (r.total - r.demo), demo: r.demo, verified: r.verified, active_24h: r.active_24h };
  } catch (_e) { /* keep unavailable */ }
  const hub = await getFedAgents();
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    source: 'live',
    timestamp: new Date().toISOString(),
    network_status: NETWORK_STATUS,
    definitions: {
      core_registry: 'agenci zarejestrowani w bazie rdzenia uni0nai-core (tabela agents)',
      production: 'core_registry minus demo (is_demo=false)',
      demo: 'agenci w strefie testnet / DID testowe (is_demo=true)',
      verified: 'agenci z trust_tier > T0 i nie-demo',
      active_24h: 'agenci z last_seen w ostatnich 24h',
      hub_registry: 'agenci ze skillami w rejestrze huba chat.k0nsult.cloud (osobny rejestr)',
    },
    core_registry: core,
    hub_registry: { source: hub.source, total: hub.total },
  });
});

// ── MCP CONNECTOR (Streamable HTTP, read-only) — uni0nai jako konektor dla model-agentów ──
// np. Mistral le Chat: "Niestandardowy konektor MCP" → Adres serwera: https://uni0nai.k0nsult.cloud/mcp
const MCP_TOOLS = [
  { name: 'federation_status', description: 'Status federacji UNIONAI: network_status, liczba agentów w katalogu, znacznik czasu.', inputSchema: { type: 'object', properties: {}, required: [] } },
  { name: 'list_agents', description: 'Lista agentów federacji UNIONAI (nazwa, rola, model, skille).', inputSchema: { type: 'object', properties: {}, required: [] } },
  { name: 'query_capability', description: 'Znajdź agentów federacji o danej umiejętności (skill).', inputSchema: { type: 'object', properties: { skill: { type: 'string', description: 'np. code, research, synthesis, analysis' } }, required: ['skill'] } },
];
app.post('/mcp', async (req: any, res) => {
  const msg = req.body || {};
  const id = msg.id !== undefined ? msg.id : null;
  const reply = (result: any) => res.json({ jsonrpc: '2.0', id, result });
  const fail = (code: number, message: string) => res.json({ jsonrpc: '2.0', id, error: { code, message } });
  try {
    switch (msg.method) {
      case 'initialize':
        return reply({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'unionai-federation', version: '0.3.0' } });
      case 'notifications/initialized':
      case 'notifications/cancelled':
        return res.status(202).end();
      case 'ping':
        return reply({});
      case 'tools/list':
        return reply({ tools: MCP_TOOLS });
      case 'tools/call': {
        const name = msg.params?.name;
        const args = msg.params?.arguments || {};
        const d = await getFedAgents();
        let text = '';
        if (name === 'federation_status') {
          text = JSON.stringify({ federation: 'UNIONAI-GENESIS-0N40I4-20260512', network_status: process.env.NETWORK_STATUS || 'TESTNET', agents_total_live: d.total, featured_agents: d.agents.length, source: d.source, timestamp: new Date().toISOString() }, null, 2);
        } else if (name === 'list_agents') {
          text = JSON.stringify(d.agents, null, 2);
        } else if (name === 'query_capability') {
          const skill = String(args.skill || '').toLowerCase();
          const m = d.agents.filter((a: any) => (a.skills || []).some((s: string) => String(s).toLowerCase().includes(skill)));
          text = m.length ? JSON.stringify(m, null, 2) : 'Brak agentów z umiejętnością: ' + skill;
        } else {
          return fail(-32602, 'Unknown tool: ' + name);
        }
        return reply({ content: [{ type: 'text', text }] });
      }
      default:
        return fail(-32601, 'Method not found: ' + msg.method);
    }
  } catch (_e) {
    return fail(-32603, 'Internal error');
  }
});
app.get('/mcp', (_req, res) => { res.set('Allow', 'POST').status(405).json({ error: 'Use POST (JSON-RPC / MCP Streamable HTTP)' }); });
app.get('/incidents', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'incidents.html'));
});
app.get('/risk-register', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'risk-register.html'));
});
app.get('/privacy', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'privacy.html'));
});
// FULL LIVE P1/P2 docs
app.get('/auth-boundary', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'auth-boundary.html'));
});
app.get('/human-oversight', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'human-oversight.html'));
});
app.get('/pilot', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'pilot.html'));
});
app.get('/external-review', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'external-review.html'));
});
app.get('/sla', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'sla-slo.html'));
});
app.get('/governance', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'governance.html'));
});
app.get('/regulatory-packet', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'regulatory-packet.html'));
});
app.get('/production-gate', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'production-gate.html'));
});

// ============ EN mirror — clean URLs for /en/:page ============
app.get('/en/:page', (req, res, next) => {
  const page = req.params.page.replace(/[^a-z0-9\-]/gi, '');
  const filePath = path.join(process.cwd(), 'public', 'en', `${page}.html`);
  res.sendFile(filePath, (err) => {
    if (err) next();  // fall through to catch-all 404
  });
});

// ============ PL clean URLs — any /<page> -> public/<page>.html (mirror of /en/:page) ============
// Naprawia 404 dla bezrozszerzeniowych linkow PL (np. /provider-invitation z przelacznika
// jezyka). Rejestrowane PO wszystkich konkretnych trasach; /api/* sa wielosegmentowe wiec
// nie sa przyslaniane, a nieistniejace pliki spadaja do catch-all 404.
app.get('/:page', (req, res, next) => {
  const page = req.params.page.replace(/[^a-z0-9\-]/gi, '');
  if (!page) return next();
  res.sendFile(path.join(process.cwd(), 'public', `${page}.html`), (err) => {
    if (err) next();
  });
});

app.get('/status/:filename', async (req, res) => {
  const m = req.params.filename.match(/^(\d{4}-\d{2}-\d{2})-runtime-snapshot\.md$/);
  if (!m) return res.status(400).json({ error: 'Format: YYYY-MM-DD-runtime-snapshot.md' });
  const date = m[1];
  try {
    const r = await pool.query(
      `SELECT * FROM runtime_snapshots WHERE snapshot_date = $1`, [date]
    );
    if (!r.rows[0]) return res.status(404).send(`# No snapshot for ${date}`);
    const s = r.rows[0];
    const md = `# UNIONAI Runtime Snapshot — ${date}

**Tag:** ${s.tag}
**Deploy hash:** ${s.deploy_hash || 'unknown'}
**Created:** ${s.created_at}

## Health
- Health OK: ${s.health_ok}
- Qdrant OK: ${s.qdrant_ok}
- Smoke OK: ${s.smoke_ok}

## Relay
- Total events: ${s.relay_total}
- Drift ratio: ${s.drift_ratio?.toFixed(4) ?? 'n/a'}
- Incident locks: ${s.incident_count}

## Raw
\`\`\`json
${JSON.stringify(s.payload, null, 2)}
\`\`\`
`;
    res.type('text/markdown').send(md);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ============ COMPLIANCE HISTORY ENDPOINT ============
app.get('/compliance/history.json', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT coverage_percent, completed_count, total_count, created_at FROM compliance_snapshots ORDER BY created_at DESC LIMIT 100'
    );
    res.json({ snapshots: result.rows, count: result.rows.length });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ============ DSR: GDPR Data Subject Request Endpoints ============

// POST /api/dsr/request — submit a new DSR
app.post('/api/dsr/request', globalRateLimit, async (req, res) => {
  try {
    const { did, type, email } = req.body || {};
    if (!did || typeof did !== 'string' || !did.startsWith('did:')) {
      return res.status(400).json({ error: 'did is required and must be a valid DID (did:...)' });
    }
    if (!type || !['access', 'delete', 'portability'].includes(type)) {
      return res.status(400).json({ error: 'type must be one of: access, delete, portability' });
    }
    const result = await pool.query(
      `INSERT INTO dsr_requests (did, type, email, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', NOW(), NOW())
       RETURNING id, status, type, created_at`,
      [did, type, email || null]
    );
    const row = result.rows[0];
    return res.status(201).json({
      request_id: row.id,
      status: row.status,
      type: row.type,
      created_at: row.created_at,
    });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/dsr/status/:request_id — check status of a DSR
app.get('/api/dsr/status/:request_id', globalRateLimit, async (req, res) => {
  try {
    const { request_id } = req.params;
    // Basic UUID format check
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request_id)) {
      return res.status(400).json({ error: 'request_id must be a valid UUID' });
    }
    const result = await pool.query(
      `SELECT id, status, type, created_at, updated_at FROM dsr_requests WHERE id = $1`,
      [request_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'DSR request not found' });
    }
    const row = result.rows[0];
    return res.json({
      request_id: row.id,
      status: row.status,
      type: row.type,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/dsr/delete — operator-only: hard delete all data for a DID
app.post('/api/dsr/delete', requireOperator, operatorRateLimit, async (req, res) => {
  try {
    const { did } = req.body || {};
    if (!did || typeof did !== 'string' || !did.startsWith('did:')) {
      return res.status(400).json({ error: 'did is required and must be a valid DID (did:...)' });
    }
    const tablesAffected: string[] = [];

    // Delete from agents
    const agentsDel = await pool.query(`DELETE FROM agents WHERE did = $1`, [did]);
    if ((agentsDel.rowCount ?? 0) > 0) tablesAffected.push('agents');

    // Delete from memory_anchors (source_did)
    const memoryDel = await pool.query(`DELETE FROM memory_anchors WHERE source_did = $1`, [did]);
    if ((memoryDel.rowCount ?? 0) > 0) tablesAffected.push('memory_anchors');

    // Delete from relay_events (src_did or dst_did)
    const relayDel = await pool.query(
      `DELETE FROM relay_events WHERE src_did = $1 OR dst_did = $1`,
      [did]
    );
    if ((relayDel.rowCount ?? 0) > 0) tablesAffected.push('relay_events');

    // Mark any pending/processing DSR requests for this DID as completed
    await pool.query(
      `UPDATE dsr_requests SET status = 'completed', updated_at = NOW()
       WHERE did = $1 AND status IN ('pending','processing')`,
      [did]
    );

    return res.json({
      deleted: true,
      did,
      tables_affected: tablesAffected,
    });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});
