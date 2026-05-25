/**
 * UNIONAI Live Agents Widget — RFC-INTERNETOFAGENTS-001
 * Usage: <div id="unionai-live-agents"></div><script src="/js/live-agents-widget.js"></script>
 * CSP-safe: no eval, no inline handlers, no data: URIs.
 * KOWAL 2026-05-25
 */
(function () {
  'use strict';

  var ROOT_ID   = 'unionai-live-agents';
  var API_URL   = '/api/agents/directory?limit=20&status=active';
  var REFRESH_S = 60;

  var STYLES = [
    '.ula-wrap{font-family:system-ui,sans-serif;background:#0d1117;border:1px solid #30363d;border-radius:10px;padding:14px 16px;color:#e6edf3;max-width:520px}',
    '.ula-hdr{display:flex;align-items:center;gap:8px;margin-bottom:10px}',
    '.ula-title{font-size:13px;font-weight:700;color:#e6edf3;letter-spacing:.3px}',
    '.ula-badge{font-size:10px;padding:2px 7px;border-radius:999px;background:rgba(63,185,80,.15);color:#3fb950;border:1px solid rgba(63,185,80,.35);font-weight:700}',
    '.ula-meta{font-size:11px;color:#8b949e;margin-left:auto}',
    '.ula-list{list-style:none;margin:0;padding:0}',
    '.ula-item{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #21262d}',
    '.ula-item:last-child{border-bottom:none}',
    '.ula-dot{width:7px;height:7px;border-radius:50%;background:#3fb950;flex-shrink:0}',
    '.ula-did{font-size:11px;color:#58a6ff;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px}',
    '.ula-role{font-size:10px;padding:1px 6px;border-radius:999px;background:#1c2230;color:#8b949e;border:1px solid #30363d;flex-shrink:0}',
    '.ula-model{font-size:10px;color:#d29922;flex-shrink:0}',
    '.ula-empty{font-size:12px;color:#8b949e;padding:10px 0;text-align:center}',
    '.ula-foot{font-size:10px;color:#5a6573;margin-top:8px;display:flex;justify-content:space-between}'
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function shortDid(did) {
    if (!did) return '?';
    var parts = did.split(':');
    return parts.length >= 3 ? parts.slice(-2).join(':') : did;
  }

  function injectStyles() {
    if (document.getElementById('ula-styles')) return;
    var s = document.createElement('style');
    s.id = 'ula-styles';
    s.textContent = STYLES.join('');
    document.head.appendChild(s);
  }

  function render(root, data, ts) {
    var agents  = (data && data.agents) || [];
    var total   = (data && data.total)  || 0;
    var netStatus = (data && data.network_status) || 'TESTNET';

    var items = agents.length
      ? agents.map(function (a) {
          return '<li class="ula-item">' +
            '<span class="ula-dot"></span>' +
            '<span class="ula-did" title="' + esc(a.did) + '">' + esc(shortDid(a.did)) + '</span>' +
            (a.role ? '<span class="ula-role">' + esc(a.role.slice(0, 20)) + '</span>' : '') +
            (a.model ? '<span class="ula-model">' + esc(a.model.slice(0, 14)) + '</span>' : '') +
            '</li>';
        }).join('')
      : '<li class="ula-empty">Brak aktywnych agentów</li>';

    root.innerHTML =
      '<div class="ula-wrap">' +
        '<div class="ula-hdr">' +
          '<span class="ula-title">⬡ Live Agents</span>' +
          '<span class="ula-badge">' + esc(String(total)) + ' total</span>' +
          '<span class="ula-meta">' + esc(netStatus) + '</span>' +
        '</div>' +
        '<ul class="ula-list">' + items + '</ul>' +
        '<div class="ula-foot">' +
          '<span>uni0nai.k0nsult.cloud</span>' +
          '<span>' + esc(ts) + '</span>' +
        '</div>' +
      '</div>';
  }

  function load(root) {
    fetch(API_URL, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var ts = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
        render(root, data, ts);
      })
      .catch(function () {
        root.innerHTML = '<div class="ula-wrap"><div class="ula-empty">Widget niedostępny</div></div>';
      });
  }

  function init() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return;
    injectStyles();
    load(root);
    setInterval(function () { load(root); }, REFRESH_S * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
