# Deploy unionai-core na Fly z wstrzyknięciem realnych metadanych buildu (UAI-P0-001).
# Bez tego /health.build_sha pokazuje FLY_MACHINE_VERSION (ULID) zamiast git sha.
#
# Wymaga: zainstalowany flyctl, zalogowany (`fly auth login`), uruchamiać z roota repo.
$ErrorActionPreference = "Stop"

$GitSha   = (git rev-parse --short HEAD).Trim()
$BuildTime = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")

Write-Host "Deploying unionai-core  GIT_SHA=$GitSha  BUILD_TIME=$BuildTime"

fly deploy `
  --build-arg GIT_SHA=$GitSha `
  --build-arg BUILD_TIME=$BuildTime
