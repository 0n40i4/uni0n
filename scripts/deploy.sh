#!/usr/bin/env bash
# Deploy unionai-core na Fly z wstrzyknięciem realnych metadanych buildu (UAI-P0-001).
# Bez tego /health.build_sha pokazuje FLY_MACHINE_VERSION (ULID) zamiast git sha.
#
# Wymaga: zainstalowany flyctl, zalogowany (`fly auth login`), uruchamiać z roota repo.
set -euo pipefail

GIT_SHA="$(git rev-parse --short HEAD)"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "Deploying unionai-core  GIT_SHA=${GIT_SHA}  BUILD_TIME=${BUILD_TIME}"

fly deploy \
  --build-arg GIT_SHA="${GIT_SHA}" \
  --build-arg BUILD_TIME="${BUILD_TIME}"

# P1-09: post-deploy smoke gate. Deploy nie jest uznany za zielony bez przejścia smoke.
SMOKE="$(dirname "$0")/smoke.sh"
if [ -f "$SMOKE" ]; then
  echo ""
  echo "=== Post-deploy smoke (P1-09) ==="
  bash "$SMOKE" "${SMOKE_HOST:-uni0nai.k0nsult.cloud}"
else
  echo "UWAGA: brak scripts/smoke.sh — pomijam smoke gate."
fi
