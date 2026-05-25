/**
 * UNIONAI Federation Live Agents — /federation page widget
 * Source: GET /api/agents/directory?status=active&limit=12 (RFC-INTERNETOFAGENTS-001)
 * CSP-safe: no eval, no inline handlers.
 * KOWAL 2026-05-25
 */
(function () {
  'use strict';

  var root = document.getElementById('mount-fed-agents');
  if (!root) return;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/[<>&"]/g, function (c) {
        return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c];
      });
  }

  function shortDid(did) {
    if (!did) return '';
    var parts = did.split(':');
    return parts.length >= 3 ? parts.slice(-2).join(':') : did;
  }

  function relativeTime(ts) {
    if (!ts) return '';
    var diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'przed chwila';
    if (diff < 3600) return Math.floor(diff / 60) + 'm temu';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h temu';
    return Math.floor(diff / 86400) + 'd temu';
  }

  var ICONS = {
    'HERMES': '⚡', 'ATLAS': '🔭', 'VERBA': '✍️', 'FORGE': '🛠️',
    'JUDGE': '⚖️', 'MAESTRO': '🎼', 'SAGE': '📚', 'CMO': '📣',
    'CFO': '💰', 'KOWAL': '🔨'
  };

  function iconFor(name) {
    var n = (name || '').toUpperCase();
    for (var k in ICONS) { if (n.indexOf(k) !== -1) return ICONS[k]; }
    return '🤖';
  }

  var TIER_STYLE = {
    'VERIFIED': 'background:#3fb95022;color:#3fb950;border:1px solid #3fb95044',
    'STANDARD': 'background:#58a6ff22;color:#58a6ff;border:1px solid #58a6ff44',
    'NEW':      'background:#8b949e22;color:#8b949e;border:1px solid #8b949e44'
  };

  function tierBadge(tier) {
    var t = (tier || 'NEW').toUpperCase();
    var style = TIER_STYLE[t] || TIER_STYLE['NEW'];
    return '<span style="font-size:9px;padding:1px 6px;border-radius:999px;' + style + ';font-weight:700;margin-left:4px">' + esc(t) + '</span>';
  }

  function render(agents, total, netStatus) {
    var srcEl = document.getElementById('fed-agents-src');
    if (srcEl) srcEl.textContent = total + ' agentow live · RFC-INTERNETOFAGENTS-001 · ' + (netStatus || 'TESTNET');

    var stAgents = document.getElementById('st-agents');
    if (stAgents) stAgents.textContent = total;

    if (!agents.length) {
      root.innerHTML = '<p style="color:var(--mut)">Brak aktywnych agentow w katalogu.</p>';
      return;
    }

    root.innerHTML = agents.map(function (a) {
      var did    = shortDid(a.did);
      var skills = (a.skills || []).slice(0, 4).map(function (s) {
        return '<span style="font-size:10px;padding:1px 7px;border-radius:999px;' +
          'background:#0f1620;border:1px solid var(--bd);color:var(--acc);' +
          'margin:2px 2px 0 0;display:inline-block">' + esc(s) + '</span>';
      }).join('');
      var lastSeen = a.last_seen ? relativeTime(a.last_seen) : '';
      var isActive = a.status === 'active';
      var dotColor = isActive ? '#3fb950' : '#8b949e';
      var dotStyle = isActive
        ? 'background:' + dotColor + ';box-shadow:0 0 6px ' + dotColor + '88'
        : 'background:' + dotColor;

      return '<div class="card" style="position:relative">' +
        '<div style="position:absolute;top:12px;right:12px;width:8px;height:8px;border-radius:50%;' + dotStyle + '"></div>' +
        '<div style="font-size:24px;margin-bottom:2px">' + iconFor(a.name) + '</div>' +
        '<div class="meta" style="display:flex;align-items:center;flex-wrap:wrap;gap:2px">' +
          esc(a.model || a.zone || 'agent') + tierBadge(a.trust_tier) +
        '</div>' +
        '<h3 style="margin:4px 0 2px">' + esc(a.name || did) + '</h3>' +
        '<p style="margin:0 0 4px;font-size:12px">' + esc(a.role || 'Agent') + '</p>' +
        (did ? '<div style="font-size:10px;color:#58a6ff;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:4px" title="' + esc(a.did) + '">' + esc(did) + '</div>' : '') +
        '<div>' + skills + '</div>' +
        (lastSeen ? '<div style="font-size:10px;color:var(--mut);margin-top:6px">aktywny ' + esc(lastSeen) + '</div>' : '') +
        '</div>';
    }).join('');
  }

  fetch('/api/agents/directory?status=active&limit=12', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      render(d.agents || [], d.total || 0, d.network_status);
    })
    .catch(function () {
      root.innerHTML = '<p style="color:var(--mut)">Agenci niedostepni chwilowo.</p>';
    });
})();
