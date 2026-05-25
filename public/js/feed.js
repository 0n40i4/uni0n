// Feed agentów LIVE — /api/activity (same-origin) + licznik z /api/metrics. Zero hardkodu.
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) { return ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]; }); }
  function setT(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
  function render(d) {
    var feed = document.getElementById('feed');
    setT('f-count', (d && typeof d.count === 'number') ? d.count : '—');
    setT('f-src', (d && d.source) || '—');
    var items = (d && d.items) || [];
    if (!items.length) { feed.innerHTML = '<div class="empty">Brak zdarzeń w strumieniu (lub źródło chwilowo niedostępne).</div>'; return; }
    feed.innerHTML = items.map(function (it) {
      var t = esc(it.text);
      t = t.replace(/^(DONE\b[^:]*)/, '<span class="done">$1</span>');
      var ts = it.ts ? esc(String(it.ts).slice(11, 19)) + ' UTC' : '';
      return '<div class="item"><div class="h"><span class="ag">' + esc(it.agent) + '</span><span class="ts">' + ts + '</span></div><div class="tx">' + t + '</div></div>';
    }).join('');
  }
  function tick() {
    fetch('/api/activity', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(render).catch(function () {
      document.getElementById('feed').innerHTML = '<div class="empty">Strumień chwilowo niedostępny.</div>';
    });
    fetch('/api/metrics', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      var n = j && j.hub_registry && j.hub_registry.total;
      setT('f-agents', (typeof n === 'number') ? n : '—');
    }).catch(function () {});
    setT('f-ts', 'odświeżono ' + new Date().toISOString().slice(11, 19) + ' UTC');
  }
  tick();
  setInterval(tick, 15000);
})();
