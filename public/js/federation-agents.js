(function () {
  var root = document.getElementById('mount-fed-agents');
  if (!root) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) { return ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]; }); }
  var ICON = { 'HERMES-GROQ': '⚡', 'ATLAS-GEMINI': '🔭', 'VERBA-MISTRAL': '✍️', 'FORGE-DEEPSEEK': '🛠️' };
  fetch('/api/agents/federation', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
    var agents = (d && d.agents) || [];
    if (!agents.length) { root.innerHTML = '<p style="color:var(--mut)">Brak danych agentów.</p>'; return; }
    root.innerHTML = agents.map(function (a) {
      var skills = (a.skills || []).slice(0, 4).map(function (s) {
        return '<span style="font-size:10px;padding:1px 7px;border-radius:999px;background:#0f1620;border:1px solid var(--bd);color:var(--acc);margin:2px 2px 0 0;display:inline-block">' + esc(s) + '</span>';
      }).join('');
      return '<div class="card">' +
        '<div style="font-size:22px;margin-bottom:2px">' + (ICON[a.name] || '🤖') + '</div>' +
        '<div class="meta">' + esc(a.model || 'model') + '</div>' +
        '<h3>' + esc(a.name) + '</h3>' +
        '<p style="margin:0 0 6px">' + esc(a.role || 'Agent') + '</p>' +
        '<div>' + skills + '</div>' +
        '</div>';
    }).join('');
    var src = document.getElementById('fed-agents-src');
    if (src) src.textContent = d.source === 'live' ? ((typeof d.total === 'number' ? d.total : agents.length) + ' agentów live z sieci') : 'dane niedostępne';
  }).catch(function () {
    root.innerHTML = '<p style="color:var(--mut)">Agenci niedostępni chwilowo.</p>';
  });
})();
