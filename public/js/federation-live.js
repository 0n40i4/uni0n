// Federacja LIVE — licznik agentów z żywego stanu sieci (/api/agents/federation -> hub). Zero hardkodu.
(function(){
  var el=document.getElementById('st-agents');
  fetch('/api/agents/federation',{cache:'no-store'}).then(function(r){return r.json();}).then(function(j){
    var n=j&&j.total;
    if(el)el.textContent=(typeof n==='number')?String(n):'—';
  }).catch(function(){if(el)el.textContent='—';});
  var ts=document.getElementById('fed-ts'); if(ts)ts.textContent='zaktualizowano '+new Date().toISOString().slice(0,19).replace('T',' ')+' UTC';
})();
