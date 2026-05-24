function pillClass(s) {
  s = String(s || '').toLowerCase();
  if (s === 'ok' || s === 'zdrowy' || s === 'operational' || s === 'healthy') return 'ok';
  if (s === 'degraded' || s === 'warn' || s === 'testnet') return 'warn';
  return 'fail';
}
function esc(v) {
  return String(v == null ? '—' : v).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}
function num(v) { return (v == null || isNaN(v)) ? '—' : v; }
async function getJSON(url) {
  const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function getText(url) {
  const r = await fetch(url, { headers: { 'Accept': 'text/plain' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}
function fail(id, e) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = '<div class="err">Brak danych: ' + esc(e && e.message ? e.message : e) + '</div>';
}

async function loadStatus() {
  try {
    const d = await getJSON('/api/status');
    const b = d.build || {};
    document.getElementById('overall').innerHTML =
      '<div><span class="pill ' + pillClass(d.health || d.status) + '">' + esc(d.health || d.status) + '</span></div>'
      + '<div class="row"><span class="k">Sieć</span><span class="v">' + esc(d.network_status) + '</span></div>'
      + '<div class="row"><span class="k">Baza danych</span><span class="v">' + esc(d.database) + '</span></div>'
      + '<div class="row"><span class="k">Redis</span><span class="v">' + esc(d.redis) + '</span></div>';
    document.getElementById('build').innerHTML =
      '<div class="row"><span class="k">Wersja</span><span class="v">' + esc(b.version) + '</span></div>'
      + '<div class="row"><span class="k">Commit</span><span class="v">' + esc(b.build_sha) + '</span></div>'
      + '<div class="row"><span class="k">Kanał</span><span class="v">' + esc(b.channel) + '</span></div>'
      + '<div class="row"><span class="k">Środowisko</span><span class="v">' + esc(b.env) + '</span></div>'
      + '<div class="row"><span class="k">Region</span><span class="v">' + esc(b.region) + '</span></div>';
    // liczba agentów z /api/status jako fallback uzupełniany przez leaderboard
    const a = document.getElementById('agents');
    if (a.dataset.filled !== '1') {
      a.innerHTML = '<div class="big">' + num(d.agents) + '</div><div class="sub">zarejestrowani (z /api/status)</div>';
    }
  } catch (e) { fail('overall', e); fail('build', e); }
}

async function loadLeaderboard() {
  try {
    const d = await getJSON('/api/leaderboard');
    const lb = Array.isArray(d.leaderboard) ? d.leaderboard : [];
    const top = lb.slice(0, 5).map(function (r) {
      return '<li><span class="pill ' + (String(r.status).toLowerCase() === 'active' ? 'ok' : 'warn') + '">'
        + esc(r.trust_tier) + '</span> <span class="mono">' + esc(r.did) + '</span> · ' + num(r.trust_score) + '</li>';
    }).join('');
    const el = document.getElementById('agents');
    el.dataset.filled = '1';
    el.innerHTML = '<div class="big">' + num(d.total_agents) + '</div>'
      + '<div class="sub">zarejestrowani w federacji</div>'
      + (top ? '<ul class="list">' + top + '</ul>' : '<div class="sub" style="margin-top:8px">Brak agentów do wyświetlenia.</div>');
  } catch (e) { /* zostaw fallback z /api/status */ }
}

async function loadAudits() {
  try {
    const d = await getJSON('/api/k0nsulat/audits');
    const list = Array.isArray(d.audits) ? d.audits : [];
    const items = list.slice(0, 5).map(function (a) {
      return '<li><span class="pill ' + pillClass(a.verdict === 'verified' || a.status === 'completed' ? 'ok' : 'warn') + '">'
        + esc(a.verdict || a.status) + '</span> <span class="mono">' + esc(a.target) + '</span></li>';
    }).join('');
    document.getElementById('audits').innerHTML = '<div class="big">' + num(d.count) + '</div>'
      + '<div class="sub">zakończone audyty w rejestrze</div>'
      + (items ? '<ul class="list">' + items + '</ul>' : '<div class="sub" style="margin-top:8px">Rejestr pusty.</div>');
  } catch (e) { fail('audits', e); }
}

async function loadEvidence() {
  try {
    const d = await getJSON('/evidence/manifest.json');
    const docs = Array.isArray(d.documents) ? d.documents : [];
    document.getElementById('evidence').innerHTML = '<div class="big">' + docs.length + '</div>'
      + '<div class="sub">dokumenty w manifeście</div>'
      + '<div class="row"><span class="k">Wersja</span><span class="v">' + esc(d.manifest_version) + '</span></div>'
      + '<div class="row"><span class="k">Algorytm</span><span class="v">' + esc(d.hash_algorithm) + '</span></div>'
      + '<div style="margin-top:8px"><a href="/api/evidence/verify">Zweryfikuj hashe dokumentów →</a></div>';
  } catch (e) { fail('evidence', e); }
}

function parseMetric(text, name) {
  const re = new RegExp('^' + name + '\\s+([0-9.eE+-]+)', 'm');
  const m = text.match(re);
  return m ? m[1] : null;
}
async function loadRelay() {
  try {
    const t = await getText('/metrics');
    const ev = parseMetric(t, 'relay_events_total');
    const sent = parseMetric(t, 'relay_sent_total');
    const route = parseMetric(t, 'relay_route_total');
    const drift = parseMetric(t, 'relay_drift_ratio');
    document.getElementById('relay').innerHTML =
      '<div class="row"><span class="k">Zdarzenia (events)</span><span class="v">' + esc(ev) + '</span></div>'
      + '<div class="row"><span class="k">Wysłane (sent)</span><span class="v">' + esc(sent) + '</span></div>'
      + '<div class="row"><span class="k">Routowane (route)</span><span class="v">' + esc(route) + '</span></div>'
      + '<div class="row"><span class="k">Drift ratio</span><span class="v">' + esc(drift) + '</span></div>';
  } catch (e) { fail('relay', e); }
}

async function loadMemory() {
  try {
    const d = await getJSON('/api/memory/anchors?limit=5');
    const anchors = Array.isArray(d.anchors) ? d.anchors : [];
    const items = anchors.slice(0, 5).map(function (a) {
      return '<li><span class="mono">' + esc(String(a.hash || '').slice(0, 24)) + '…</span> · ' + esc(a.scope) + '</li>';
    }).join('');
    document.getElementById('memory').innerHTML = '<div class="big">' + num(d.count) + '</div>'
      + '<div class="sub">kotwice PUBLIC/FEDERATION</div>'
      + (items ? '<ul class="list">' + items + '</ul>' : '<div class="sub" style="margin-top:8px">Brak kotwic.</div>');
  } catch (e) { fail('memory', e); }
}

async function loadIncidents() {
  try {
    const d = await getJSON('/api/incidents');
    const s = d.by_severity || {};
    document.getElementById('incidents').innerHTML =
      '<div class="big">' + num(d.total) + '</div><div class="sub">zgłoszenia łącznie</div>'
      + '<div class="row"><span class="k">CRITICAL</span><span class="v">' + num(s.CRITICAL) + '</span></div>'
      + '<div class="row"><span class="k">MAJOR</span><span class="v">' + num(s.MAJOR) + '</span></div>'
      + '<div class="row"><span class="k">LOW</span><span class="v">' + num(s.LOW) + '</span></div>';
  } catch (e) { fail('incidents', e); }
}

function refresh() {
  loadStatus();
  loadLeaderboard();
  loadAudits();
  loadEvidence();
  loadRelay();
  loadMemory();
  loadIncidents();
  document.getElementById('ts').textContent = 'Ostatnie odświeżenie: ' + new Date().toLocaleString('pl-PL');
}
refresh();
setInterval(refresh, 30000);
