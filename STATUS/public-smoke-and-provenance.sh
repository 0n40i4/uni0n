#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://unionai.grassrootslobbing.pl}"
TS="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT_DIR="${OUT_DIR:-EVIDENCE/smoke-runs}"
OUT_FILE="$OUT_DIR/smoke-$TS.md"

mkdir -p "$OUT_DIR"

endpoints=(
  "/health"
  "/healthz"
  "/readyz"
  "/version"
  "/.well-known/agent.json"
  "/openapi.json"
  "/rfc/index.json"
  "/api/k0nsulat/status"
  "/api/leaderboard"
)

pass_count=0
fail_count=0

{
  echo "# UNIONAI Public Smoke + Provenance"
  echo
  echo "- Timestamp UTC: $(date -u +"%Y-%m-%d %H:%M:%S")"
  echo "- Base URL: $BASE_URL"
  echo
  echo "## Endpoint status"
} > "$OUT_FILE"

for ep in "${endpoints[@]}"; do
  code=$(curl -sS -o /tmp/unionai_body.json -w "%{http_code}" "$BASE_URL$ep" || true)
  if [[ "$code" == "200" ]]; then
    echo "- [PASS] '$ep' -> HTTP $code" >> "$OUT_FILE"
    ((pass_count+=1))
  else
    echo "- [FAIL] '$ep' -> HTTP $code" >> "$OUT_FILE"
    ((fail_count+=1))
  fi
done

health_headers=$(curl -sSI "$BASE_URL/health" || true)
version_body=$(curl -sS "$BASE_URL/version" || true)

health_x_build_sha=$(printf "%s" "$health_headers" | awk -F': ' 'tolower($1)=="x-build-sha" {print $2}' | tr -d '\r')
health_x_service_version=$(printf "%s" "$health_headers" | awk -F': ' 'tolower($1)=="x-service-version" {print $2}' | tr -d '\r')

version_build_sha=$(printf "%s" "$version_body" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("build_sha",""))' 2>/dev/null || true)
version_version=$(printf "%s" "$version_body" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("version",""))' 2>/dev/null || true)
version_channel=$(printf "%s" "$version_body" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("channel") or d.get("release_channel") or "")' 2>/dev/null || true)
version_build_time=$(printf "%s" "$version_body" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("build_time") or d.get("deployed_at") or "")' 2>/dev/null || true)

unknowns=()
check_unknown () {
  local key="$1"; local val="$2"
  if [[ -z "$val" || "${val,,}" == "unknown" ]]; then
    unknowns+=("$key")
  fi
}

check_unknown "health_x_build_sha" "$health_x_build_sha"
check_unknown "health_x_service_version" "$health_x_service_version"
check_unknown "version_build_sha" "$version_build_sha"
check_unknown "version_version" "$version_version"
check_unknown "version_channel" "$version_channel"
check_unknown "version_build_time" "$version_build_time"

{
  echo
  echo "## Provenance snapshot"
  echo "- health_x_build_sha: '$health_x_build_sha'"
  echo "- health_x_service_version: '$health_x_service_version'"
  echo "- version_build_sha: '$version_build_sha'"
  echo "- version_version: '$version_version'"
  echo "- version_channel: '$version_channel'"
  echo "- version_build_time: '$version_build_time'"
  echo
  echo "## Decision"
  if [[ "$fail_count" -eq 0 && "${#unknowns[@]}" -eq 0 ]]; then
    echo "- Endpoint suite: PASS (${pass_count}/9)"
    echo "- Provenance: PASS"
    echo "- Recommendation: GO PILOT candidate / FULL LIVE gate review"
  else
    echo "- Endpoint suite: $([[ "$fail_count" -eq 0 ]] && echo PASS || echo FAIL) (${pass_count}/9)"
    echo "- Provenance: $([[ "${#unknowns[@]}" -eq 0 ]] && echo PASS || echo FAIL)"
    if [[ "${#unknowns[@]}" -gt 0 ]]; then
      echo "- Open blockers: ${unknowns[*]}"
    fi
    echo "- Recommendation: keep GO CONTROLLED, fix blockers, rerun"
  fi
} >> "$OUT_FILE"

echo "Saved: $OUT_FILE"
