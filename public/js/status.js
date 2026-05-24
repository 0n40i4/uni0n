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
        <h2>Stan ogólny</h2>
        <div><span class="pill ${pillClass(d.health || d.status)}">${esc(d.health || d.status)}</span></div>
        <div class="row"><span class="k">Sieć</span><span class="v">${esc(d.network_status)}</span></div>
        <div class="row"><span class="k">Aktualizacja</span><span class="v">${esc(d.timestamp)}</span></div>
      </div>
      <div class="card">
        <h2>Baza danych</h2>
        <div><span class="pill ${d.database === 'ok' ? 'ok' : 'fail'}">${esc(d.database)}</span></div>
      </div>
      <div class="card">
        <h2>Redis</h2>
        <div><span class="pill ${String(d.redis).startsWith('ok') ? 'ok' : 'warn'}">${esc(d.redis)}</span></div>
      </div>
      <div class="card">
        <h2>Agenci</h2>
        <div class="big">${esc(d.agents)}</div>
        <div class="sub">zarejestrowani w federacji</div>
      </div>
      <div class="card">
        <h2>Audyty</h2>
        <div class="big">${esc(d.audits)}</div>
        <div class="sub">zdarzenia K0NSULAT</div>
      </div>
      <div class="card">
        <h2>Incydenty</h2>
        <div class="big">${esc(d.incidents)}</div>
        <div class="sub">otwarte zgłoszenia</div>
      </div>
      <div class="card">
        <h2>Wersja / build</h2>
        <div class="row"><span class="k">Wersja</span><span class="v">${esc(b.version)}</span></div>
        <div class="row"><span class="k">Commit</span><span class="v">${esc(b.build_sha)}</span></div>
        <div class="row"><span class="k">Czas commita</span><span class="v">${esc(b.commit_time)}</span></div>
        <div class="row"><span class="k">Kanał</span><span class="v">${esc(b.channel)}</span></div>
        <div class="row"><span class="k">Środowisko</span><span class="v">${esc(b.env)}</span></div>
        <div class="row"><span class="k">Region</span><span class="v">${esc(b.region)}</span></div>
      </div>
    `;
  } catch (e) {
    el.innerHTML = '<div class="card"><h2 class="err">Błąd</h2><div class="sub">Nie udało się pobrać /api/status: ' + esc(e.message) + '</div></div>';
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
      <div class="row"><span class="k">Ostatni przebieg</span><span class="v">${esc(d.last_run)}</span></div>
    `;
  } catch (e) {
    el.innerHTML = '<div class="err">Nie udało się pobrać /api/system/smoke: ' + esc(e.message) + '</div>';
  }
}

function refresh() { loadStatus(); loadSmoke(); }
refresh();
setInterval(refresh, 30000);
