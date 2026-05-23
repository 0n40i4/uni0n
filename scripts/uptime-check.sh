#!/usr/bin/env bash
# Lekki probe uptime UNIONAI (P1-08) - do uruchamiania z cron co 1-5 min.
# Pobiera /health, sprawdza HTTP 200 + .status. Przy awarii alertuje na webhook
# (Discord/Slack) jeśli ALERT_WEBHOOK ustawiony; inaczej drukuje alert na stderr.
#
# WPIĘCIE (cron, co 2 min):
#   */2 * * * * ALERT_WEBHOOK=https://... /path/to/scripts/uptime-check.sh >> /var/log/uai-uptime.log 2>&1
#
# UWAGA: ALERT_WEBHOOK to SEKRET OPERATORA - NIE commitować do repo.
# Bez niego skrypt tylko echo'uje alert na stderr i kończy się kodem 1.
#
# Wymaga: curl. jq opcjonalne (degradacja do grep przy braku).
set -euo pipefail

HOST="${1:-uni0nai.k0nsult.cloud}"
BASE="https://${HOST}"
# Webhook z env; pusty = brak alertów sieciowych (tylko stderr).
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ---------------------------------------------------------------------------
# send_alert <message> - wysyła alert na webhook (jeśli jest) lub na stderr.
# Format JSON kompatybilny z Discord ("content") i Slack ("text") naraz.
# Kończy proces kodem 1 (probe nieudany).
# ---------------------------------------------------------------------------
send_alert() {
  local msg="$1"
  if [ -n "${ALERT_WEBHOOK}" ]; then
    # Buduj poprawny JSON: (1) usuń znaki spoza drukowalnego ASCII - multibyte
    # (np. em-dash, znaki PL, emoji) potrafią dać Discordowi 400 "invalid JSON"
    # przy interpolacji w shellu; (2) escape cudzysłowów i backslashy.
    local esc
    esc="$(printf '%s' "${msg}" | LC_ALL=C tr -cd '\11\12\15\40-\176' | sed 's/\\/\\\\/g; s/"/\\"/g')"
    local code
    code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
      --max-time 15 \
      -d "{\"content\": \"${esc}\"}" \
      "${ALERT_WEBHOOK}" 2>/dev/null || echo "000")"
    echo "${msg}  [webhook HTTP ${code}]" >&2
  else
    # Brak webhooka - nie wymyślamy URL, tylko sygnalizujemy na stderr.
    echo "${msg}  (ALERT_WEBHOOK nieustawiony - alert tylko na stderr)" >&2
  fi
  exit 1
}

# --- Pobierz /health razem z kodem HTTP (kod doklejamy w ostatniej linii) ---
RESP="$(curl -sS -w $'\n%{http_code}' --max-time 15 "${BASE}/health" 2>/dev/null || true)"
HTTP_CODE="$(printf '%s' "${RESP}" | tail -n1)"
BODY="$(printf '%s' "${RESP}" | sed '$d')"

# --- Walidacja kodu HTTP (timeout/curl-fail daje pusty/000) ---
if [ -z "${HTTP_CODE}" ] || [ "${HTTP_CODE}" = "000" ]; then
  send_alert "ALERT: UNIONAI ${HOST} DOWN at ${TS} - brak odpowiedzi /health (timeout / DNS / TLS)"
fi
if [ "${HTTP_CODE}" -ge 500 ] 2>/dev/null; then
  send_alert "ALERT: UNIONAI ${HOST} DOWN at ${TS} - /health HTTP ${HTTP_CODE}"
fi
if [ "${HTTP_CODE}" != "200" ]; then
  send_alert "ALERT: UNIONAI ${HOST} UNHEALTHY at ${TS} - /health HTTP ${HTTP_CODE} (oczekiwano 200)"
fi

# --- Wyciągnij .status i .build_sha (jq jeśli jest, inaczej grep/sed) ---
if command -v jq >/dev/null 2>&1; then
  STATUS="$(printf '%s' "${BODY}" | jq -r '.status // empty' 2>/dev/null || true)"
  SHA="$(printf '%s' "${BODY}" | jq -r '.build_sha // "?"' 2>/dev/null || true)"
else
  STATUS="$(printf '%s' "${BODY}" | grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' | sed -E 's/.*"status"[^"]*"([^"]*)"/\1/' | head -n1)"
  SHA="$(printf '%s' "${BODY}" | grep -o '"build_sha"[[:space:]]*:[[:space:]]*"[^"]*"' | sed -E 's/.*"build_sha"[^"]*"([^"]*)"/\1/' | head -n1)"
  SHA="${SHA:-?}"
fi

# --- Sprawdź pole status - oczekujemy "zdrowy" ---
if [ -z "${STATUS}" ]; then
  send_alert "ALERT: UNIONAI ${HOST} UNHEALTHY at ${TS} - /health bez pola .status"
fi
if [ "${STATUS}" != "zdrowy" ]; then
  send_alert "ALERT: UNIONAI ${HOST} UNHEALTHY at ${TS} - status='${STATUS}' (oczekiwano 'zdrowy')"
fi

# --- Sukces ---
echo "OK ${TS} build_sha=${SHA}"
exit 0
