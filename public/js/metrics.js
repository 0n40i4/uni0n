// LIVE metrics — populacja [data-metric="ścieżka"] z /api/metrics (single source of truth).
// Zero hardkodu; brak danych -> '—'. Każdy licznik na stronie deklaruje swoje źródło.
(function () {
  var els = document.querySelectorAll('[data-metric]');
  if (!els.length) return;
  function get(o, path) { return path.split('.').reduce(function (a, k) { return (a == null) ? null : a[k]; }, o); }
  fetch('/api/metrics', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
    els.forEach(function (el) {
      var v = get(j, el.getAttribute('data-metric'));
      el.textContent = (v === null || v === undefined) ? '—' : String(v);
    });
  }).catch(function () { els.forEach(function (el) { el.textContent = '—'; }); });
})();
