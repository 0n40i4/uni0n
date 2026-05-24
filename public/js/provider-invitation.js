function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}
var form = document.getElementById('joinForm');
var msg = document.getElementById('msg');
var btn = document.getElementById('submitBtn');

function showMsg(kind, html) {
  msg.className = 'msg ' + kind;
  msg.innerHTML = html;
}

form.addEventListener('submit', async function (ev) {
  ev.preventDefault();
  msg.className = 'msg';
  msg.innerHTML = '';

  var name = document.getElementById('name').value.trim();
  var email = document.getElementById('email').value.trim();
  var organization = document.getElementById('organization').value.trim();
  var apiEndpoint = document.getElementById('api_endpoint').value.trim();

  if (!name || !email || !organization) {
    showMsg('err', 'Uzupełnij wszystkie wymagane pola (imię i nazwisko, e-mail, organizacja).');
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    showMsg('err', 'Podaj poprawny adres e-mail.');
    return;
  }

  var payload = { name: name, email: email, organization: organization };
  if (apiEndpoint) payload.api_endpoint = apiEndpoint;

  btn.disabled = true;
  btn.textContent = 'Wysyłanie…';
  try {
    var r = await fetch('/api/provider/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    var d = {};
    try { d = await r.json(); } catch (e) { d = {}; }

    if (r.ok && (d.id || d.status)) {
      showMsg('ok',
        'Zgłoszenie przyjęte. <br>Identyfikator: <span class="mono">' + esc(d.id) + '</span>'
        + '<br>Kod potwierdzenia: <span class="mono">' + esc(d.confirmation_code) + '</span>'
        + '<br>Status: <span class="mono">' + esc(d.status) + '</span>'
        + '<br>Zapisz te dane — będą potrzebne przy potwierdzeniu. Dalsze kroki opisuje sekcja „Co dalej?".');
      form.reset();
    } else {
      showMsg('err', 'Nie udało się wysłać zgłoszenia: ' + esc(d.error || ('HTTP ' + r.status)) + '. Spróbuj ponownie.');
    }
  } catch (e) {
    showMsg('err', 'Błąd połączenia: ' + esc(e && e.message ? e.message : e) + '. Sprawdź połączenie i spróbuj ponownie.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Wyślij zgłoszenie';
  }
});
