// Federacja LIVE — licznik agentów z /api/leaderboard (same-origin, CSP-ok)
(function(){
  var el=document.getElementById('st-agents');
  fetch('/api/leaderboard',{cache:'no-store'}).then(function(r){return r.json();}).then(function(j){
    var n=j&&(j.total_agents||(j.agents&&j.agents.length)||j.count);
    if(el&&typeof n==='number'&&n>0)el.textContent=n;
  }).catch(function(){if(el)el.textContent='103+';});
  var ts=document.getElementById('fed-ts'); if(ts)ts.textContent='zaktualizowano '+new Date().toISOString().slice(0,19).replace('T',' ')+' UTC';
})();
