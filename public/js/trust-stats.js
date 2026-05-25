// Trust Center — live agent count (CSP: external script-src 'self'). Koniec hardcoded "3".
(function () {
  var el = document.getElementById('ts-agents');
  if (!el) return;
  fetch('/api/leaderboard', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      var n = j && (j.total_agents || (j.agents && j.agents.length) || j.count);
      if (typeof n === 'number' && n > 0) el.textContent = n;
    })
    .catch(function () {});
})();
