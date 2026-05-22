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
