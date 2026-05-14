#Requires -Version 5.1
<#
.SYNOPSIS
  UNIONAI Operator Bootstrap — 1-click onboarding
.DESCRIPTION
  Checks prereqs, verifies Fly.io secrets, smoke-tests the live deployment.
  Safe to re-run. Does NOT modify any existing secrets or deploy anything.
.EXAMPLE
  .\scripts\bootstrap.ps1
  .\scripts\bootstrap.ps1 -Deploy     # also triggers fly deploy
  .\scripts\bootstrap.ps1 -SmokeOnly  # only hits live endpoints
#>
param(
  [switch]$Deploy,
  [switch]$SmokeOnly,
  [string]$App = "unionai-core",
  [string]$BaseUrl = "https://unionai-core.fly.dev"
)

$ErrorActionPreference = "Continue"
$OK    = "[OK]   "
$FAIL  = "[FAIL] "
$WARN  = "[WARN] "
$INFO  = "[INFO] "

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "$OK $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "$FAIL $msg" -ForegroundColor Red }
function Write-Warn($msg) { Write-Host "$WARN $msg" -ForegroundColor Yellow }
function Write-Info($msg) { Write-Host "$INFO $msg" -ForegroundColor Gray }

$Errors = 0

# ─── SMOKE ONLY MODE ─────────────────────────────────────────────────────────────
if ($SmokeOnly) {
  Write-Step "Smoke testing $BaseUrl"
  $endpoints = @(
    @{ path = "/health"; expect = 200 },
    @{ path = "/api/relay/status"; expect = 200 },
    @{ path = "/api/qdrant/health"; expect = 200 },
    @{ path = "/api/relay/drift"; expect = 200 },
    @{ path = "/api/system/smoke"; expect = 200 }
  )
  foreach ($ep in $endpoints) {
    try {
      $resp = Invoke-WebRequest -Uri "$BaseUrl$($ep.path)" -Method GET -TimeoutSec 15 -UseBasicParsing -ErrorAction SilentlyContinue
      if ($resp.StatusCode -eq $ep.expect) { Write-OK "$($ep.path) => $($resp.StatusCode)" }
      else { Write-Warn "$($ep.path) => $($resp.StatusCode) (expected $($ep.expect))"; $Errors++ }
    } catch {
      Write-Fail "$($ep.path) => $($_.Exception.Message)"; $Errors++
    }
  }
  if ($Errors -eq 0) { Write-Host "`nALL SMOKE CHECKS PASSED" -ForegroundColor Green }
  else { Write-Host "`n$Errors CHECK(S) FAILED" -ForegroundColor Red }
  exit $Errors
}

# ─── PREREQS ─────────────────────────────────────────────────────────────────────
Write-Step "Checking prerequisites"

# flyctl
if (Get-Command fly -ErrorAction SilentlyContinue) {
  $flyVer = (fly version 2>&1 | Select-String "v\d+\.\d+").Matches[0].Value
  Write-OK "fly CLI found ($flyVer)"
} else {
  Write-Fail "fly CLI not found — install from https://fly.io/docs/flyctl/install/"
  $Errors++
}

# node
if (Get-Command node -ErrorAction SilentlyContinue) {
  $nodeVer = node --version 2>&1
  Write-OK "Node.js found ($nodeVer)"
} else {
  Write-Warn "node not found (needed for local dev, not for Fly deploy)"
}

# git
if (Get-Command git -ErrorAction SilentlyContinue) {
  $gitVer = (git --version 2>&1)
  Write-OK "git found ($gitVer)"
} else {
  Write-Fail "git not found"; $Errors++
}

# ─── FLY AUTH ────────────────────────────────────────────────────────────────────
Write-Step "Checking Fly.io auth"
try {
  $whoami = fly auth whoami 2>&1
  if ($whoami -match "@") { Write-OK "Fly authenticated as: $whoami" }
  else { Write-Fail "Not authenticated — run: fly auth login"; $Errors++ }
} catch {
  Write-Fail "fly auth check failed: $_"; $Errors++
}

# ─── SECRETS ─────────────────────────────────────────────────────────────────────
Write-Step "Checking Fly secrets for $App"
$requiredSecrets = @("DATABASE_URL", "REDIS_URL", "QDRANT_URL", "NODE_ENV")
try {
  $secrets = fly secrets list --app $App 2>&1
  foreach ($secret in $requiredSecrets) {
    if ($secrets -match $secret) {
      $deployed = if ($secrets -match "$secret.*Deployed") { "Deployed" } else { "Staged" }
      Write-OK "$secret [$deployed]"
    } else {
      Write-Fail "$secret NOT SET — run: fly secrets set $secret=<value> --app $App"
      $Errors++
    }
  }
  $jwtMissing = $secrets -notmatch "JWT_SECRET"
  if ($jwtMissing) { Write-Warn "JWT_SECRET not set — operator endpoints will use dev fallback" }
} catch {
  Write-Warn "Could not list secrets (app may not exist yet): $_"
}

# ─── APP STATUS ──────────────────────────────────────────────────────────────────
Write-Step "Checking app machines"
try {
  $status = fly status --app $App 2>&1
  if ($status -match "started") { Write-OK "At least one machine is started" }
  else { Write-Warn "No machines in started state — machines will auto-start on first request" }
} catch {
  Write-Warn "Could not get app status: $_"
}

# ─── SMOKE TEST ──────────────────────────────────────────────────────────────────
Write-Step "Live smoke test ($BaseUrl)"
$endpoints = @(
  @{ path = "/health"; method = "GET"; body = $null; expect = 200; critical = $true },
  @{ path = "/api/system/smoke"; method = "GET"; body = $null; expect = 200; critical = $false },
  @{ path = "/api/qdrant/health"; method = "GET"; body = $null; expect = 200; critical = $false },
  @{ path = "/api/relay/send"; method = "POST"; expect = 201; critical = $true;
     body = '{"protocol":"UNIONAI-WIRE-v0","intent_id":"bootstrap-smoke","src_did":"did:bootstrap:op","dst_did":"did:unionai:s4:k0nsulat","intent":{"type":"bootstrap","summary":"operator bootstrap smoke"}}' }
)

foreach ($ep in $endpoints) {
  try {
    $params = @{
      Uri = "$BaseUrl$($ep.path)"
      Method = $ep.method
      TimeoutSec = 20
      UseBasicParsing = $true
      ErrorAction = "SilentlyContinue"
    }
    if ($ep.body) {
      $params.Body = $ep.body
      $params.ContentType = "application/json"
    }
    $resp = Invoke-WebRequest @params
    if ($resp.StatusCode -eq $ep.expect) { Write-OK "$($ep.method) $($ep.path) => $($resp.StatusCode)" }
    else {
      $msg = "$($ep.method) $($ep.path) => $($resp.StatusCode) (expected $($ep.expect))"
      if ($ep.critical) { Write-Fail $msg; $Errors++ } else { Write-Warn $msg }
    }
  } catch {
    $msg = "$($ep.method) $($ep.path) => ERROR: $($_.Exception.Message)"
    if ($ep.critical) { Write-Fail $msg; $Errors++ } else { Write-Warn $msg }
  }
}

# ─── OPTIONAL DEPLOY ─────────────────────────────────────────────────────────────
if ($Deploy) {
  Write-Step "Deploying to Fly.io"
  $repoRoot = Split-Path $PSScriptRoot -Parent
  Set-Location $repoRoot
  fly deploy --app $App --remote-only 2>&1
  if ($LASTEXITCODE -eq 0) { Write-OK "Deploy succeeded" }
  else { Write-Fail "Deploy failed (exit $LASTEXITCODE)"; $Errors++ }
}

# ─── SUMMARY ─────────────────────────────────────────────────────────────────────
Write-Host ""
if ($Errors -eq 0) {
  Write-Host "BOOTSTRAP OK — $App is operational" -ForegroundColor Green
  Write-Host "  Live URL:    $BaseUrl" -ForegroundColor Gray
  Write-Host "  Smoke:       $BaseUrl/api/system/smoke" -ForegroundColor Gray
  Write-Host "  Qdrant:      $BaseUrl/api/qdrant/health" -ForegroundColor Gray
  Write-Host "  Metrics:     $BaseUrl/metrics" -ForegroundColor Gray
} else {
  Write-Host "$Errors ISSUE(S) REQUIRE ATTENTION" -ForegroundColor Red
}
exit $Errors
