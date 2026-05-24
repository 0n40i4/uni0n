var API = window.location.origin;
var lastAudit = [];

function log(msg, cls) {
  cls = cls || 'log-info';
  var el = document.getElementById('log');
  var ts = new Date().toISOString().substring(11,19);
  el.innerHTML += '<div class="log-line ' + cls + '">[' + ts + '] ' + msg + '</div>';
  el.scrollTop = el.scrollHeight;
}

function apiFetch(path, opts) {
  var defaultHeaders = {'Content-Type':'application/json','X-Operator-ID':'console-operator'};
  opts = opts || {};
  opts.headers = defaultHeaders;
  return fetch(API + path, opts)
    .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(d){ return {ok:r.ok,status:r.status,data:d}; }); })
    .catch(function(e){ return {ok:false,status:0,data:{error:e.message}}; });
}

function loadMetrics() {
  return apiFetch('/api/k0nsulat/status').then(function(r){
    if (!r.ok) return;
    var d = r.data;
    function set(id, v) { if (v !== undefined && v !== null) document.getElementById(id).textContent = v; }
    set('m_relay', d.relay_requests);
    set('m_memory', d.memory_anchors);
    set('m_governance', d.governance_events);
    set('m_overrides', d.operator_overrides);
    set('m_trust', d.trust_verifications);
    if (d.last_audit_hash) document.getElementById('m_audit').textContent = d.last_audit_hash.substring(0,20) + '...';
  });
}

function loadFreezeStatus() {
  return apiFetch('/api/operator/status').then(function(r){
    if (!r.ok) return;
    var d = r.data;
    var rf = d.relay_frozen || d.relayFrozen || false;
    var mf = d.memory_frozen || d.memoryFrozen || false;
    function pill(active) {
      return active ? '<span class="pill pill-red">FROZEN</span>' : '<span class="pill pill-green">RUNNING</span>';
    }
    document.getElementById('relayStatus').innerHTML = pill(rf);
    document.getElementById('memoryStatus').innerHTML = pill(mf);
    document.getElementById('relayBox').className = 'freeze-box' + (rf ? ' active' : '');
    document.getElementById('memoryBox').className = 'freeze-box' + (mf ? ' active' : '');
  });
}

function setFreeze(layer, freeze) {
  var ep = freeze ? '/api/operator/freeze-' + layer : '/api/operator/unfreeze-' + layer;
  log((freeze ? 'Freezing ' : 'Unfreezing ') + layer + '...', 'log-warn');
  apiFetch(ep, {method:'POST', body: JSON.stringify({operator_id:'console-operator'})}).then(function(r){
    log(r.ok ? layer + (freeze ? ' FROZEN' : ' UNFROZEN') + ' OK' : 'Error: ' + JSON.stringify(r.data), r.ok ? (freeze ? 'log-err' : 'log-ok') : 'log-err');
    loadFreezeStatus();
  });
}

function sendOverride() {
  var intentId = document.getElementById('ovIntentId').value.trim();
  var action = document.getElementById('ovAction').value;
  var operatorId = document.getElementById('ovOperatorId').value.trim() || 'console-operator';
  var reason = document.getElementById('ovReason').value.trim();
  if (!intentId) { log('Intent ID wymagany', 'log-err'); return; }
  log('Override: ' + action + ' on ' + intentId, 'log-warn');
  apiFetch('/api/operator/override', {
    method: 'POST',
    body: JSON.stringify({intent_id: intentId, action: action, operator_id: operatorId, reason: reason})
  }).then(function(r){
    log(r.ok ? 'OK: ' + JSON.stringify(r.data) : 'FAILED: ' + JSON.stringify(r.data), r.ok ? 'log-ok' : 'log-err');
  });
}

function loadAudit() {
  return apiFetch('/api/operator/export-audit', {method:'POST', body: JSON.stringify({format:'json'})}).then(function(r){
    if (!r.ok) { log('Audit load failed', 'log-err'); return; }
    var rows = Array.isArray(r.data) ? r.data : (r.data.rows || []);
    lastAudit = rows;
    var tbody = document.getElementById('auditBody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:#555;text-align:center">Brak wpisow</td></tr>';
      return;
    }
    tbody.innerHTML = rows.slice(0,50).map(function(row){
      var ts = row.created_at ? new Date(row.created_at).toISOString().replace('T',' ').substring(0,19) : '&#x2014;';
      var hash = row.hash ? row.hash.substring(0,14) + '...' : '&#x2014;';
      return '<tr><td style="color:#555">' + ts + '</td><td>' + (row.actor||'&#x2014;') + '</td><td>' + (row.operation||'&#x2014;') + '</td><td>' + (row.action_type||row.action||'&#x2014;') + '</td><td style="color:var(--gm);font-size:10px">' + hash + '</td></tr>';
    }).join('');
    log('Audit: ' + rows.length + ' wpisow', 'log-ok');
  });
}

function downloadAudit() {
  if (!lastAudit.length) { log('Najpierw Refresh', 'log-warn'); return; }
  var blob = new Blob([JSON.stringify(lastAudit, null, 2)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'audit-' + Date.now() + '.json';
  a.click();
}

function init() {
  apiFetch('/api/status').then(function(r){
    var connEl = document.getElementById('connStatus');
    var badgeEl = document.getElementById('headerBadge');
    if (r.ok) {
      connEl.textContent = '● Połączono — ' + (r.data.status || 'OK');
      connEl.style.color = 'var(--g)';
      badgeEl.textContent = 'ONLINE';
      log('Połączono z UNIONAI Core API ✓', 'log-ok');
    } else {
      connEl.textContent = '● Brak połączenia';
      connEl.style.color = 'var(--red)';
      badgeEl.textContent = 'OFFLINE';
      badgeEl.className = 'badge red';
      log('Brak połączenia', 'log-err');
    }
    return Promise.all([loadMetrics(), loadFreezeStatus(), loadAudit()]);
  });
}

init();
setInterval(function(){ loadMetrics(); loadFreezeStatus(); }, 15000);

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('btn-freeze-relay').addEventListener('click', function() { setFreeze('relay', true); });
  document.getElementById('btn-unfreeze-relay').addEventListener('click', function() { setFreeze('relay', false); });
  document.getElementById('btn-freeze-memory').addEventListener('click', function() { setFreeze('memory', true); });
  document.getElementById('btn-unfreeze-memory').addEventListener('click', function() { setFreeze('memory', false); });
  document.getElementById('btn-send-override').addEventListener('click', function() { sendOverride(); });
  document.getElementById('btn-load-audit').addEventListener('click', function() { loadAudit(); });
  document.getElementById('btn-download-audit').addEventListener('click', function() { downloadAudit(); });
});
