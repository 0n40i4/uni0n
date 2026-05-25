// Strefa agentów (/agents) — LIVE dane. Zero hardkodu liczb; brak danych -> '—'.
// Populacja [data-metric="ścieżka"] z /api/metrics (single source of truth, jak js/metrics.js).
// Dodatkowo licznik agentów federacji z /api/agents/federation.
(function () {
  function get(o, path) { return path.split('.').reduce(function (a, k) { return (a == null) ? null : a[k]; }, o); }

  // 1) /api/metrics -> elementy [data-metric]
  var els = document.querySelectorAll('[data-metric]');
  if (els.length) {
    fetch('/api/metrics', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      els.forEach(function (el) {
        var v = get(j, el.getAttribute('data-metric'));
        el.textContent = (v === null || v === undefined) ? '—' : String(v);
      });
    }).catch(function () { els.forEach(function (el) { el.textContent = '—'; }); });
  }

  // 2) Tablica scoringowa (live) z /api/scoring (same-origin proxy do rejestru huba).
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var body = document.getElementById('score-table-body');
  var src = document.getElementById('score-src');
  if (body) {
    fetch('/api/scoring', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      var rows = (j && j.agents) || [];
      if (j && j.source === 'unavailable') {
        if (src) src.textContent = 'źródło niedostępne';
        body.innerHTML = '<tr><td colspan="5" style="padding:8px">— (źródło niedostępne)</td></tr>';
        return;
      }
      if (src) src.textContent = 'źródło: ' + esc((j && j.source) || '—') + ' · ' + ((j && j.count) || 0) + ' agentów';
      if (!rows.length) {
        body.innerHTML = '<tr><td colspan="5" style="padding:8px">—</td></tr>';
        return;
      }
      body.innerHTML = rows.map(function (a, i) {
        return '<tr style="border-bottom:1px solid rgba(128,128,128,.2)">' +
          '<td style="padding:6px 8px">' + (i + 1) + '</td>' +
          '<td style="padding:6px 8px">' + esc(a.name) + '</td>' +
          '<td style="padding:6px 8px">' + esc(a.model) + '</td>' +
          '<td style="padding:6px 8px">' + esc(a.token) + '</td>' +
          '<td style="padding:6px 8px">' + esc(a.indigo) + '</td>' +
          '</tr>';
      }).join('');
    }).catch(function () {
      if (src) src.textContent = 'źródło niedostępne';
      body.innerHTML = '<tr><td colspan="5" style="padding:8px">— (błąd pobierania)</td></tr>';
    });
  }

  // 3) timestamp aktualizacji
  var ts = document.getElementById('ag-ts');
  if (ts) ts.textContent = '· zaktualizowano ' + new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
})();
