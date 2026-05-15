import { useEffect, useMemo, useState } from 'react';

type HealthState = 'PASS' | 'BLOCKED' | 'DEGRADED' | 'NO_DATA';

type Signal = {
  key: string;
  label: string;
  endpoint: string;
  state: HealthState;
  detail: string;
  timestamp: string;
};

type ExecRow = {
  task_id: string;
  owner: 'CORE' | 'KOPERNIK' | 'LEM' | 'MICKIEWICZ';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'pending' | 'in_progress' | 'blocked' | 'verified' | 'archived';
  smoke: string;
  replay: string;
  rollback: string;
  claim_level: 'VERIFIED' | 'LIVE_INTERNAL' | 'SELF_ASSERTED' | 'ROADMAP' | 'BLOCKED';
  deadline: string;
  notes: string;
};

const CLAIMS = [
  ['VERIFIED', 'Potwierdzone runtime evidence + źródła'],
  ['LIVE_INTERNAL', 'Działa wewnętrznie, nie pełny publiczny proof'],
  ['SELF_ASSERTED', 'Deklaracja bez kompletnego dowodu'],
  ['ROADMAP', 'Plan, jeszcze bez runtime evidence']
] as const;

const initialBoard: ExecRow[] = [
  {
    task_id: 'P0-REPO-ATTACH', owner: 'CORE', priority: 'P0', status: 'blocked', smoke: 'n/a', replay: 'n/a', rollback: 'n/a',
    claim_level: 'BLOCKED', deadline: 'ASAP', notes: 'Missing frontend repo input package'
  },
  {
    task_id: 'P1-TRUST-CENTER', owner: 'KOPERNIK', priority: 'P1', status: 'in_progress', smoke: 'n/a', replay: 'n/a', rollback: 'n/a',
    claim_level: 'LIVE_INTERNAL', deadline: '2026-05-15', notes: 'Public trust surface'
  },
  {
    task_id: 'P1-LIVE-STATUS', owner: 'LEM', priority: 'P1', status: 'in_progress', smoke: '/api/system/smoke', replay: 'baseline', rollback: 'fallback:NO_DATA',
    claim_level: 'LIVE_INTERNAL', deadline: '2026-05-15', notes: 'Runtime signal cards'
  }
];

async function safeFetch(endpoint: string) {
  try {
    const r = await fetch(endpoint);
    const txt = await r.text();
    let body: any = null;
    try { body = JSON.parse(txt); } catch { body = txt; }
    return { ok: r.ok, status: r.status, body };
  } catch (e: any) {
    return { ok: false, status: 0, body: e?.message || 'network_error' };
  }
}

export default function App() {
  const [tab, setTab] = useState<'trust' | 'status' | 'claims' | 'ops' | 'board'>('trust');
  const [signals, setSignals] = useState<Signal[]>([]);
  const [statusData, setStatusData] = useState<any>(null);
  const [traceId, setTraceId] = useState('');
  const [replayResult, setReplayResult] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);

  const evidenceRefs = useMemo(() => [
    'STATUS/runtime-verification-snapshot-2026-05-14.md',
    'STATUS/runtime-verification-evidence-index-2026-05-14.md',
    'STATUS/full-implementation-progress-report-2026-05-14.md',
    'STATUS/remaining-work-priority-matrix-2026-05-14.md'
  ], []);

  const refresh = async () => {
    const now = new Date().toISOString();
    const [health, smoke, qdrant, operator, inc] = await Promise.all([
      safeFetch('/health'),
      safeFetch('/api/system/smoke'),
      safeFetch('/api/qdrant/health'),
      safeFetch('/api/operator/status'),
      safeFetch('/api/incidents')
    ]);

    setStatusData(operator.body && typeof operator.body === 'object' ? operator.body : null);
    setIncidents(Array.isArray((inc.body as any)?.incidents) ? (inc.body as any).incidents : []);

    const items: Signal[] = [
      {
        key: 'runtime-health',
        label: 'Runtime /health',
        endpoint: '/health',
        state: health.ok ? 'PASS' : 'BLOCKED',
        detail: health.ok ? `status=${health.body?.status || 'ok'} db=${health.body?.database || 'n/a'}` : String(health.body),
        timestamp: now
      },
      {
        key: 'smoke',
        label: 'Smoke probes',
        endpoint: '/api/system/smoke',
        state: smoke.ok ? 'PASS' : (smoke.status === 404 ? 'NO_DATA' : 'BLOCKED'),
        detail: smoke.ok ? JSON.stringify(smoke.body) : `http=${smoke.status}`,
        timestamp: now
      },
      {
        key: 'qdrant',
        label: 'Qdrant health',
        endpoint: '/api/qdrant/health',
        state: qdrant.ok ? 'PASS' : (qdrant.status === 404 ? 'NO_DATA' : 'BLOCKED'),
        detail: qdrant.ok ? JSON.stringify(qdrant.body) : `http=${qdrant.status}`,
        timestamp: now
      },
      {
        key: 'redis',
        label: 'Redis state',
        endpoint: '/api/operator/status',
        state: operator.ok
          ? ((operator.body?.redis_status === 'connected' || String(operator.body?.redis || '').includes('ok')) ? 'PASS' : 'DEGRADED')
          : 'NO_DATA',
        detail: operator.ok ? `redis=${operator.body?.redis_status || operator.body?.redis || 'unknown'}` : `http=${operator.status}`,
        timestamp: now
      },
      {
        key: 'incidents',
        label: 'Incident stream',
        endpoint: '/api/incidents',
        state: inc.ok ? 'PASS' : (inc.status === 404 ? 'NO_DATA' : 'BLOCKED'),
        detail: inc.ok ? `open_incidents=${(inc.body as any)?.count ?? 0}` : `http=${inc.status}`,
        timestamp: now
      }
    ];

    setSignals(items);
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  const replayLookup = async () => {
    if (!traceId.trim()) return;
    const rs = await safeFetch(`/api/incident/${encodeURIComponent(traceId.trim())}`);
    setReplayResult(rs);
  };

  const badge = (s: HealthState) => ({
    PASS: '#1db954', BLOCKED: '#ff4d4f', DEGRADED: '#f5a623', NO_DATA: '#6b7280'
  }[s]);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#0b1020', color: '#e5e7eb', minHeight: '100vh', padding: 20 }}>
      <h1 style={{ marginTop: 0 }}>K0NSULT Shared Operations Surface</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['status', 'trust', 'claims', 'ops', 'board'].map((t) => (
          <button key={t} onClick={() => setTab(t as any)} style={{
            background: tab === t ? '#22c55e' : '#1f2937', color: tab === t ? '#04120a' : '#e5e7eb', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer'
          }}>{t.toUpperCase()}</button>
        ))}
      </div>

      {tab === 'status' && (
        <div>
          <h2>Live Status Page</h2>
          <p>Fallback rule: unknown/failed signals are never shown as healthy.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10 }}>
            {signals.map((s) => (
              <div key={s.key} style={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>{s.label}</strong>
                  <span style={{ background: badge(s.state), color: '#fff', padding: '2px 8px', borderRadius: 999 }}>{s.state}</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{s.endpoint}</div>
                <div style={{ fontSize: 13, marginTop: 8 }}>{s.detail}</div>
                <div style={{ fontSize: 11, marginTop: 8, opacity: 0.7 }}>{s.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'trust' && (
        <div>
          <h2>Trust Center (Public Source of Truth)</h2>
          <p>Status: <code>GO CONTROLLED+++</code> | Model: evidence-linked runtime governance</p>
          <ul>
            <li><strong>VERIFIED Runtime:</strong> replay integrity, smoke discipline, metrics exposure, rollback continuity, CI/CD continuity.</li>
            <li><strong>Governance:</strong> claim hygiene (VERIFIED/LIVE_INTERNAL/SELF_ASSERTED/ROADMAP), no fake LIVE policy.</li>
            <li><strong>Operator Doctrine:</strong> human-in-the-loop approvals for deploy/rollback/credential flow.</li>
            <li><strong>Release Transparency:</strong> baseline tag + deploy hash freeze + recovery notes.</li>
          </ul>

          <h3>Public report references</h3>
          <ul>
            <li><code>K0NSULT_PUBLIC_TRUST_REPORT_2026_05_14.pdf</code></li>
            <li><code>K0NSULT_PUBLICATION_GUIDELINES_2026_05_14.pdf</code></li>
          </ul>

          <h3>Evidence refs</h3>
          <ul>{evidenceRefs.map((r) => <li key={r}><code>{r}</code></li>)}</ul>
        </div>
      )}

      {tab === 'claims' && (
        <div>
          <h2>Claim Hygiene Public Model</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ textAlign: 'left' }}>Claim</th><th style={{ textAlign: 'left' }}>Definition</th></tr></thead>
            <tbody>
              {CLAIMS.map(([c, d]) => <tr key={c}><td><code>{c}</code></td><td>{d}</td></tr>)}
            </tbody>
          </table>
          <p style={{ marginTop: 10 }}>Promotion rule: <code>LIVE_INTERNAL → VERIFIED</code> only with runtime evidence refs.</p>
        </div>
      )}

      {tab === 'ops' && (
        <div>
          <h2>Shared Operations Table Demo</h2>
          <div style={{ background: '#111827', padding: 12, borderRadius: 8, marginBottom: 10 }}>
            <strong>Runtime bar:</strong> {(statusData?.status || 'NO_DATA')} | redis={(statusData?.redis_status || 'NO_DATA')} | open_incidents={(statusData?.open_incidents ?? 'NO_DATA')}
          </div>
          <div style={{ background: '#111827', padding: 12, borderRadius: 8, marginBottom: 10 }}>
            <strong>Replay lookup:</strong>
            <div style={{ marginTop: 8 }}>
              <input value={traceId} onChange={(e) => setTraceId(e.target.value)} placeholder="trace_id / incident_id" style={{ padding: 8, width: 280, marginRight: 8 }} />
              <button onClick={replayLookup} style={{ padding: '8px 12px' }}>Lookup</button>
            </div>
            {replayResult && <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(replayResult, null, 2)}</pre>}
          </div>
          <div style={{ background: '#111827', padding: 12, borderRadius: 8 }}>
            <strong>Incident panel:</strong>
            <div>active_incidents={incidents.length}</div>
            <div>preserve_flag=manual (operator controlled)</div>
          </div>
        </div>
      )}

      {tab === 'board' && (
        <div>
          <h2>Execution Board UI</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Task ID', 'Owner', 'Priority', 'Status', 'Smoke', 'Replay', 'Rollback', 'Claim Level', 'Deadline', 'Notes'].map(h => (
                  <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #374151', padding: 6 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialBoard.map((r) => (
                <tr key={r.task_id}>
                  <td style={{ padding: 6 }}>{r.task_id}</td><td style={{ padding: 6 }}>{r.owner}</td><td style={{ padding: 6 }}>{r.priority}</td>
                  <td style={{ padding: 6 }}>{r.status}</td><td style={{ padding: 6 }}>{r.smoke}</td><td style={{ padding: 6 }}>{r.replay}</td>
                  <td style={{ padding: 6 }}>{r.rollback}</td><td style={{ padding: 6 }}>{r.claim_level}</td><td style={{ padding: 6 }}>{r.deadline}</td><td style={{ padding: 6 }}>{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
