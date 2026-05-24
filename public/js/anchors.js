    function escapeHtml(s) {
      if (s === null || s === undefined) return '';
      return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function badgeForStatus(st) {
      var cls = 'pending';
      var v = (st || '').toLowerCase();
      if (v === 'validated' || v === 'valid' || v === 'verified') cls = 'validated';
      return '<span class="badge ' + cls + '">' + escapeHtml(st || '—') + '</span>';
    }

    function render(data) {
      var container = document.getElementById('container');
      var stat = document.getElementById('stat');
      if (data.db_error) {
        stat.innerHTML = '<span class="err">Błąd bazy danych — brak danych.</span>';
        container.innerHTML = '<div class="msg err">Nie udało się pobrać kotwic (db_error).</div>';
        return;
      }
      var anchors = Array.isArray(data.anchors) ? data.anchors : [];
      stat.textContent = 'Liczba kotwic: ' + (data.count !== undefined ? data.count : anchors.length) +
        ' · wygenerowano: ' + (data.generated_at || '—');
      if (anchors.length === 0) {
        container.innerHTML = '<div class="msg">Brak publicznych kotwic do wyświetlenia.</div>';
        return;
      }
      var rows = anchors.map(function (a) {
        return '<tr>' +
          '<td><code>' + escapeHtml(a.id) + '</code></td>' +
          '<td><code class="hash">' + escapeHtml(a.hash || '—') + '</code></td>' +
          '<td><code class="prev">' + escapeHtml(a.prev_hash || '—') + '</code></td>' +
          '<td><span class="badge scope">' + escapeHtml(a.scope || '—') + '</span></td>' +
          '<td>' + badgeForStatus(a.validation_status) + '</td>' +
          '<td>' + escapeHtml(a.created_at || '—') + '</td>' +
          '</tr>';
      }).join('');
      container.innerHTML =
        '<table><thead><tr>' +
        '<th>ID kotwicy</th><th>Hash (semantyczny)</th><th>Hash poprz. (delta)</th>' +
        '<th>Zakres</th><th>Walidacja</th><th>Utworzono</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function load() {
      var stat = document.getElementById('stat');
      stat.textContent = 'Ładowanie…';
      var limit = parseInt(document.getElementById('limit').value, 10) || 100;
      fetch('/api/memory/anchors?limit=' + encodeURIComponent(limit))
        .then(function (r) { return r.json(); })
        .then(render)
        .catch(function (e) {
          stat.innerHTML = '<span class="err">Błąd sieci.</span>';
          document.getElementById('container').innerHTML =
            '<div class="msg err">Nie udało się pobrać danych: ' + escapeHtml(e.message) + '</div>';
        });
    }

    document.getElementById('refresh').addEventListener('click', load);
    load();
