// i18n — wykrywa jezyk ze sciezki (/en/ -> EN, inaczej PL). Jedno zrodlo etykiet.
var EN = location.pathname.indexOf('/en/') === 0;
var T = EN ? {
  overall: 'Overall', net: 'Network', updated: 'Updated',
  db: 'Database', redis: 'Redis', agents: 'Agents', agentsSub: 'registered in the federation',
  audits: 'Audits', auditsSub: 'K0NSULAT events', incidents: 'Incidents', incidentsSub: 'open reports',
  build: 'Version / build', version: 'Version', commit: 'Commit', commitTime: 'Commit time',
  channel: 'Channel', env: 'Environment', region: 'Region',
  error: 'Error', fetchFail: 'Failed to fetch', lastRun: 'Last run'
} : {
  overall: 'Stan ogólny', net: 'Sieć', updated: 'Aktualizacja',
  db: 'Baza danych', redis: 'Redis', agents: 'Agenci', agentsSub: 'zarejestrowani w federacji',
  audits: 'Audyty', auditsSub: 'zdarzenia K0NSULAT', incidents: 'Incydenty', incidentsSub: 'otwarte zgłoszenia',
  build: 'Wersja / build', version: 'Wersja', commit: 'Commit', commitTime: 'Czas commita',
  channel: 'Kanał', env: 'Środowisko', region: 'Region',
  error: 'Błąd', fetchFail: 'Nie udało się pobrać', lastRun: 'Ostatni przebieg'
};

function pillClass(s) {
  if (s === 'ok' || s === 'zdrowy') return 'ok';
  if (s === 'degraded' || s === 'warn') return 'warn';
  return 'fail';
}
function esc(v) {
  return String(v == null ? '—' : v).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}

async function loadStatus() {
  const el = document.getElementById('cards');
  try {
    const r = await fetch('/api/status', { headers: { 'Accept': 'application/json' } });
    const d = await r.json();
    const b = d.build || {};
    el.innerHTML = `
      <div class="card">
        <h2>${T.overall}</h2>
        <div><span class="pill ${pillClass(d.health || d.status)}">${esc(d.health || d.status)}</span></div>
        <div class="row"><span class="k">${T.net}</span><span class="v">${esc(d.network_status)}</span></div>
        <div class="row"><span class="k">${T.updated}</span><span class="v">${esc(d.timestamp)}</span></div>
      </div>
      <div class="card">
        <h2>${T.db}</h2>
        <div><span class="pill ${d.database === 'ok' ? 'ok' : 'fail'}">${esc(d.database)}</span></div>
      </div>
      <div class="card">
        <h2>${T.redis}</h2>
        <div><span class="pill ${String(d.redis).startsWith('ok') ? 'ok' : 'warn'}">${esc(d.redis)}</span></div>
      </div>
      <div class="card">
        <h2>${T.agents}</h2>
        <div class="big">${esc(d.agents)}</div>
        <div class="sub">${T.agentsSub}</div>
      </div>
      <div class="card">
        <h2>${T.audits}</h2>
        <div class="big">${esc(d.audits)}</div>
        <div class="sub">${T.auditsSub}</div>
      </div>
      <div class="card">
        <h2>${T.incidents}</h2>
        <div class="big">${esc(d.incidents)}</div>
        <div class="sub">${T.incidentsSub}</div>
      </div>
      <div class="card">
        <h2>${T.build}</h2>
        <div class="row"><span class="k">${T.version}</span><span class="v">${esc(b.version)}</span></div>
        <div class="row"><span class="k">${T.commit}</span><span class="v">${esc(b.build_sha)}</span></div>
        <div class="row"><span class="k">${T.commitTime}</span><span class="v">${esc(b.commit_time)}</span></div>
        <div class="row"><span class="k">${T.channel}</span><span class="v">${esc(b.channel)}</span></div>
        <div class="row"><span class="k">${T.env}</span><span class="v">${esc(b.env)}</span></div>
        <div class="row"><span class="k">${T.region}</span><span class="v">${esc(b.region)}</span></div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = '<div class="card"><h2 class="err">' + T.error + '</h2><div class="sub">' + T.fetchFail + ' /api/status: ' + esc(e.message) + '</div></div>';
  }
}

async function loadSmoke() {
  const el = document.getElementById('smoke');
  try {
    const r = await fetch('/api/system/smoke', { headers: { 'Accept': 'application/json' } });
    const d = await r.json();
    const checks = (d.checks || []).map(c =>
      `<li><span><span class="dot ${c.ok ? 'ok' : 'fail'}"></span>${esc(c.ep)}</span><span class="v">${esc(c.status)}</span></li>`
    ).join('');
    el.innerHTML = `
      <div><span class="pill ${pillClass(d.status)}">${esc(d.status)}</span>
        <span class="sub" style="margin-left:8px">${esc(d.summary)}</span></div>
      <ul class="checks" style="margin-top:10px">${checks}</ul>
      <div class="row"><span class="k">${T.lastRun}</span><span class="v">${esc(d.last_run)}</span></div>
    `;
  } catch (e) {
    el.innerHTML = '<div class="err">' + T.fetchFail + ' /api/system/smoke: ' + esc(e.message) + '</div>';
  }
}

function refresh() { loadStatus(); loadSmoke(); }
refresh();
setInterval(refresh, 30000);
