#!/usr/bin/env bash
# Smoke test produkcyjny UNIONAI (bramka P1-09) wg sekcji 8 dokumentu FULL LIVE.
# Cel: deploy NIE przechodzi bez zielonych testów P0. Wpinać w CI po deployu
# albo uruchamiać ręcznie: scripts/smoke.sh [host]
#
# Wymaga: curl. jq jest opcjonalne — przy jego braku degradujemy walidację JSON
# do sprawdzenia obecności klucza przez grep (mniej dokładne, ale działa).
#
# Uruchamiać z roota repo lub dowolnie (nie czyta plików repo).
set -euo pipefail

# Host parametryzowalny; domyślnie produkcja.
HOST="${1:-uni0nai.k0nsult.cloud}"
BASE="https://${HOST}"

# Licznik nieudanych testów — wynik bramki zależy od tego, czy == 0.
FAILED=0
# Licznik wszystkich wykonanych sprawdzeń (do raportu końcowego).
CHECKS=0

# Czy mamy jq? Jeśli nie — degradacja do grep.
if command -v jq >/dev/null 2>&1; then
  HAVE_JQ=1
else
  HAVE_JQ=0
  echo "UWAGA: brak 'jq' — walidacja JSON zdegradowana do grep (sprawdzam tylko obecność klucza)." >&2
fi

# ---------------------------------------------------------------------------
# check_http <path> <expected_code>
# Sprawdza kod HTTP danej ścieżki. Drukuje "OK/FAIL  <code>  <path>".
# Przy niezgodności zwiększa FAILED.
# ---------------------------------------------------------------------------
check_http() {
  local path="$1"
  local expected="$2"
  local code
  CHECKS=$((CHECKS + 1))
  # -sS = cicho ale pokaż błędy; -o /dev/null = wyrzuć body; -w = wypisz kod.
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "${BASE}${path}" || echo "000")"
  if [ "${code}" = "${expected}" ]; then
    printf 'OK    %s  %s\n' "${code}" "${path}"
  else
    printf 'FAIL  %s  %s  (oczekiwano %s)\n' "${code}" "${path}" "${expected}"
    FAILED=$((FAILED + 1))
  fi
}

# ---------------------------------------------------------------------------
# check_json <path> <jq_filter> <human_label>
# Pobiera JSON i sprawdza, że filtr jq zwraca niepustą, nie-null wartość.
# Przy braku jq: degraduje do grep obecności klucza (z human_label/filtra).
# FAIL gdy curl != 0, body puste, albo wartość pusta/null.
# ---------------------------------------------------------------------------
check_json() {
  local path="$1"
  local filter="$2"
  local label="$3"
  local body
  CHECKS=$((CHECKS + 1))

  # Pobierz body (nie przerywaj skryptu przy błędzie curl — łapiemy ręcznie).
  if ! body="$(curl -sS --max-time 15 "${BASE}${path}")" || [ -z "${body}" ]; then
    printf 'FAIL  ---  %s  (%s — brak odpowiedzi / curl błąd)\n' "${path}" "${label}"
    FAILED=$((FAILED + 1))
    return
  fi

  if [ "${HAVE_JQ}" = "1" ]; then
    local val
    # -e: exit !=0 gdy null/false; -r: surowy output.
    if val="$(printf '%s' "${body}" | jq -er "${filter}" 2>/dev/null)" && [ -n "${val}" ] && [ "${val}" != "null" ]; then
      printf 'OK    json %s  %s = %s\n' "${path}" "${label}" "${val}"
    else
      printf 'FAIL  json %s  %s  (filtr "%s" pusty/null)\n' "${path}" "${label}" "${filter}"
      FAILED=$((FAILED + 1))
    fi
  else
    # Degradacja: wyciągnij ostatni segment filtra jako nazwę klucza (np. .info.version -> version).
    local key
    key="$(printf '%s' "${filter}" | sed -E 's/.*\.([A-Za-z0-9_]+).*/\1/')"
    if printf '%s' "${body}" | grep -q "\"${key}\""; then
      printf 'OK    grep %s  %s (klucz "%s" obecny)\n' "${path}" "${label}" "${key}"
    else
      printf 'FAIL  grep %s  %s  (brak klucza "%s")\n' "${path}" "${label}" "${key}"
      FAILED=$((FAILED + 1))
    fi
  fi
}

echo "=== SMOKE UNIONAI  host=${HOST} ==="

# --- DNS / TLS (najpierw — jeśli host nie rezolwuje, reszta nie ma sensu) ---
echo "--- DNS / TLS ---"
CHECKS=$((CHECKS + 1))
if getent hosts "${HOST}" >/dev/null 2>&1 || nslookup "${HOST}" >/dev/null 2>&1; then
  printf 'OK    dns   %s rezolwuje\n' "${HOST}"
else
  printf 'FAIL  dns   %s NIE rezolwuje (SERVFAIL?)\n' "${HOST}"
  FAILED=$((FAILED + 1))
fi

# Sprawdź TLS + kod nagłówka root: akceptujemy 200 lub 301.
CHECKS=$((CHECKS + 1))
ROOT_CODE="$(curl -sS -I -o /dev/null -w '%{http_code}' --max-time 15 "${BASE}/" || echo "000")"
if [ "${ROOT_CODE}" = "200" ] || [ "${ROOT_CODE}" = "301" ]; then
  printf 'OK    tls   %s  HEAD /\n' "${ROOT_CODE}"
else
  printf 'FAIL  tls   %s  HEAD /  (oczekiwano 200/301)\n' "${ROOT_CODE}"
  FAILED=$((FAILED + 1))
fi

# --- HTTP / strony (wszystkie expected 200) ---
echo "--- HTTP / strony ---"
check_http "/"                              200
check_http "/status"                        200
check_http "/trust-center"                  200
check_http "/developer"                     200
check_http "/incidents"                     200
check_http "/risk-register"                 200
check_http "/privacy"                       200
check_http "/docs/"                         200
check_http "/docs/ai-act-readiness.html"    200
check_http "/changelog"                     200
check_http "/auth-boundary"                 200
check_http "/human-oversight"               200
check_http "/pilot"                         200
check_http "/external-review"               200
check_http "/sla"                           200
check_http "/governance"                    200
check_http "/regulatory-packet"             200
check_http "/production-gate"               200

# --- Auth boundary (P1-02): write z nieznanym DID musi być odrzucony ---
echo "--- Auth boundary ---"
CHECKS=$((CHECKS + 1))
AB_CODE="$(curl -sS -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -d '{"source_did":"did:unionai:smoke:unregistered-xyz","scope":"PUBLIC","payload":{"t":1}}' \
  --max-time 15 "${BASE}/api/memory/anchor" || echo "000")"
if [ "${AB_CODE}" = "403" ]; then
  printf 'OK    %s  POST /api/memory/anchor (nieznany DID odrzucony)\n' "${AB_CODE}"
else
  printf 'FAIL  %s  POST /api/memory/anchor  (oczekiwano 403 dla nieznanego DID)\n' "${AB_CODE}"
  FAILED=$((FAILED + 1))
fi

# --- API / JSON ---
echo "--- API / JSON ---"
# /health: build_sha nie może być null (regresja UAI-P0-001).
check_json "/health"                   '.status'              "health.status"
check_json "/health"                   '.build_sha'           "health.build_sha"
check_json "/.well-known/agent.json"   '.status'              "agent.status"
check_json "/openapi.json"             '.openapi'             "openapi"
check_json "/openapi.json"             '.info.version'        "openapi.info.version"
check_json "/api/leaderboard"          '.network_status'      "leaderboard.network_status"
check_json "/api/k0nsulat/status"      '.status'              "k0nsulat.status"
check_json "/evidence/manifest.json"   '.documents'           "evidence.documents"

# --- Wynik bramki ---
echo "=== WYNIK ==="
if [ "${FAILED}" -gt 0 ]; then
  echo "SMOKE FAILED: ${FAILED} (z ${CHECKS} sprawdzeń)"
  exit 1
fi
echo "SMOKE OK (${CHECKS} checks)"
exit 0
