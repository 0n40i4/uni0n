#Requires -Version 5.1
<#
.SYNOPSIS
  UNIONAI Operator Bootstrap — 1-click onboarding + operations
.DESCRIPTION
  Checks prereqs, handles Fly.io OAuth login, verifies secrets, smoke-tests,
  shows promotion status, daily snapshot, optional deploy + sync.
  Safe to re-run at any time.
.EXAMPLE
  .\scripts\bootstrap.ps1                   # full bootstrap check
  .\scripts\bootstrap.ps1 -Login           # force fly auth login
  .\scripts\bootstrap.ps1 -Deploy          # bootstrap + deploy latest code
  .\scripts\bootstrap.ps1 -Sync            # git pull + deploy
  .\scripts\bootstrap.ps1 -SmokeOnly       # just hit live endpoints
  .\scripts\bootstrap.ps1 -Status          # show promotion + snapshot status only
#>
param(
  [switch]$Deploy,
  [switch]$Sync,
  [switch]$Login,
  [switch]$SmokeOnly,
  [switch]$Status,
  [string]$App     = "unionai-core",
  [string]$BaseUrl = "https://unionai-core.fly.dev",
  [string]$Repo    = "https://github.com/0n40i4/uni0n"
)

$ErrorActionPreference = "Continue"
$OK   = "[OK]  "
$FAIL = "[FAIL]"
$WARN = "[WARN]"
$INFO = "[INFO]"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "$OK $msg"   -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "$FAIL $msg" -ForegroundColor Red   ; $script:Errors++ }
function Write-Warn($msg) { Write-Host "$WARN $msg" -ForegroundColor Yellow }
function Write-Info($msg) { Write-Host "$INFO $msg" -ForegroundColor Gray  }

$script:Errors = 0

function Invoke-Api($path, $method = "GET", $body = $null) {
  $params = @{
    Uri            = "$BaseUrl$path"
    Method         = $method
    TimeoutSec     = 20
    UseBasicParsing = $true
    ErrorAction    = "SilentlyContinue"
  }
  if ($body) { $params.Body = $body; $params.ContentType = "application/json" }
  try { Invoke-WebRequest @params } catch { $null }
}

# ─── STATUS ONLY ─────────────────────────────────────────────────────────────────
if ($Status) {
  Write-Step "Promotion + Snapshot Status"
  $promo = Invoke-Api "/api/system/promotion"
  if ($promo -and $promo.StatusCode -eq 200) {
    $p = $promo.Content | ConvertFrom-Json
    $color = if ($p.status -eq "VERIFIED") { "Green" } else { "Red" }
    Write-Host "  Promotion:  $($p.status)" -ForegroundColor $color
    Write-Host "  all_ok:     $($p.all_ok)" -ForegroundColor Gray
    Write-Host "  deploy:     $($p.deploy_hash)" -ForegroundColor Gray
    Write-Host "  checked:    $($p.last_checked)" -ForegroundColor Gray
  } else {
    Write-Warn "Could not reach promotion endpoint"
  }

  $snap = Invoke-Api "/api/system/snapshots/latest"
  if ($snap -and $snap.StatusCode -eq 200) {
    $s = $snap.Content | ConvertFrom-Json
    Write-Host "  Last snap:  $($s.snapshot_date) tag=$($s.tag)" -ForegroundColor Gray
    Write-Host "  drift:      $($s.drift_ratio)" -ForegroundColor Gray
    Write-Host "  relay_total: $($s.relay_total)" -ForegroundColor Gray
    Write-Host "  incidents:  $($s.incident_count)" -ForegroundColor Gray
    Write-Host "  MD path:    $BaseUrl/status/$($s.snapshot_date)-runtime-snapshot.md" -ForegroundColor Gray
  } else {
    Write-Warn "No snapshots yet (first snapshot runs on app startup)"
  }
  exit $script:Errors
}

# ─── SMOKE ONLY ──────────────────────────────────────────────────────────────────
if ($SmokeOnly) {
  Write-Step "Smoke testing $BaseUrl"
  $eps = @(
    @{ p = "/health";                 e = 200 }
    @{ p = "/api/system/smoke";       e = 200 }
    @{ p = "/api/qdrant/health";      e = 200 }
    @{ p = "/api/relay/status";       e = 200 }
    @{ p = "/api/system/promotion";   e = 200 }
    @{ p = "/api/system/snapshots/latest"; e = 200 }
  )
  foreach ($ep in $eps) {
    $r = Invoke-Api $ep.p
    if ($r -and $r.StatusCode -eq $ep.e) { Write-OK "$($ep.p) => $($r.StatusCode)" }
    else { Write-Warn "$($ep.p) => $($r.StatusCode)" }
  }
  if ($script:Errors -eq 0) { Write-Host "`nALL SMOKE CHECKS PASSED" -ForegroundColor Green }
  exit $script:Errors
}

# ─── PREREQS ─────────────────────────────────────────────────────────────────────
Write-Step "Checking prerequisites"

foreach ($cmd in @("fly", "git", "node")) {
  if (Get-Command $cmd -ErrorAction SilentlyContinue) {
    $v = & $cmd --version 2>&1 | Select-Object -First 1
    Write-OK "$cmd — $v"
  } elseif ($cmd -eq "node") {
    Write-Warn "node not found (needed for local dev, not for Fly deploys)"
  } else {
    Write-Fail "$cmd not found"
  }
}

# ─── FLY AUTH (OAuth) ────────────────────────────────────────────────────────────
Write-Step "Fly.io authentication"
$whoami = fly auth whoami 2>&1
if ($whoami -match "@" -and -not $Login) {
  Write-OK "Authenticated as: $whoami"
} else {
  if ($Login -or $whoami -notmatch "@") {
    Write-Info "Opening browser for Fly.io OAuth login..."
    fly auth login
    $whoami = fly auth whoami 2>&1
    if ($whoami -match "@") { Write-OK "Login successful: $whoami" }
    else { Write-Fail "Login failed — run: fly auth login manually"; exit 1 }
  }
}

# ─── OPTIONAL SYNC ───────────────────────────────────────────────────────────────
if ($Sync) {
  Write-Step "Syncing from GitHub ($Repo)"
  $repoRoot = Split-Path $PSScriptRoot -Parent
  Set-Location $repoRoot
  git fetch origin main 2>&1 | Out-Null
  git pull --ff-only origin main 2>&1
  if ($LASTEXITCODE -ne 0) { Write-Fail "git pull failed — resolve conflicts first" }
  else { Write-OK "Local repo synced with GitHub main" }
}

# ─── SECRETS AUDIT ───────────────────────────────────────────────────────────────
Write-Step "Auditing Fly secrets for $App"
$required = @(
  @{ name = "DATABASE_URL"; critical = $true  }
  @{ name = "REDIS_URL";    critical = $true  }
  @{ name = "QDRANT_URL";   critical = $true  }
  @{ name = "NODE_ENV";     critical = $false }
  @{ name = "JWT_SECRET";   critical = $false }
)
try {
  $secrets = fly secrets list --app $App 2>&1
  foreach ($s in $required) {
    if ($secrets -match $s.name) {
      $state = if ($secrets -match "$($s.name).*Deployed") { "Deployed" } else { "Staged" }
      Write-OK "$($s.name) [$state]"
      if ($state -eq "Staged") { Write-Warn "  → Run: fly secrets deploy --app $App" }
    } else {
      if ($s.critical) { Write-Fail "$($s.name) NOT SET — run: fly secrets set $($s.name)=<value> --app $App" }
      else             { Write-Warn "$($s.name) not set (optional)" }
    }
  }
} catch { Write-Warn "Could not list secrets: $_" }

# ─── APP STATUS ──────────────────────────────────────────────────────────────────
Write-Step "App machine status"
try {
  $status = fly status --app $App 2>&1
  if ($status -match "started") { Write-OK "Machines started (auto-wake on request)" }
  else                          { Write-Warn "No machines started — first request will cold-start" }
} catch { Write-Warn "Could not get app status: $_" }

# ─── LIVE SMOKE ──────────────────────────────────────────────────────────────────
Write-Step "Live smoke test"
$criticalEps = @(
  @{ p = "/health";           method = "GET";  e = 200; body = $null; critical = $true }
  @{ p = "/api/relay/send";   method = "POST"; e = 201; critical = $true;
     body = '{"protocol":"UNIONAI-WIRE-v0","intent_id":"bootstrap-v2","src_did":"did:bootstrap:ps1","dst_did":"did:unionai:s4:k0nsulat","intent":{"type":"bootstrap","summary":"bootstrap.ps1 smoke"}}' }
  @{ p = "/api/system/smoke"; method = "GET";  e = 200; body = $null; critical = $false }
)
foreach ($ep in $criticalEps) {
  $r = Invoke-Api $ep.p $ep.method $ep.body
  if ($r -and $r.StatusCode -eq $ep.e) {
    $extra = ""
    if ($ep.p -eq "/api/system/smoke" -and $r.Content) {
      $j = $r.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
      if ($j) { $extra = " tag=$($j.tag)" }
    }
    Write-OK "$($ep.method) $($ep.p) => $($r.StatusCode)$extra"
  } else {
    $code = if ($r) { $r.StatusCode } else { "ERR" }
    if ($ep.critical) { Write-Fail "$($ep.method) $($ep.p) => $code" }
    else              { Write-Warn "$($ep.method) $($ep.p) => $code" }
  }
}

# ─── PROMOTION STATUS ────────────────────────────────────────────────────────────
Write-Step "Deployment promotion status"
$r = Invoke-Api "/api/system/promotion"
if ($r -and $r.StatusCode -eq 200) {
  $p = $r.Content | ConvertFrom-Json
  $color = if ($p.status -eq "VERIFIED") { "Green" } elseif ($p.status -eq "BLOCKED") { "Red" } else { "Yellow" }
  Write-Host "  Status:    $($p.status)" -ForegroundColor $color
  Write-Host "  all_ok:    $($p.all_ok)" -ForegroundColor Gray
  Write-Host "  deploy:    $($p.deploy_hash)" -ForegroundColor Gray
  Write-Host "  checked:   $($p.last_checked)" -ForegroundColor Gray
  if ($p.status -eq "BLOCKED") { Write-Warn "System is BLOCKED — check /api/system/smoke for details" ; $script:Errors++ }
} else { Write-Warn "Promotion endpoint not reachable" }

# ─── SNAPSHOT STATUS ─────────────────────────────────────────────────────────────
Write-Step "Daily runtime snapshot"
$r = Invoke-Api "/api/system/snapshots/latest"
if ($r -and $r.StatusCode -eq 200) {
  $s = $r.Content | ConvertFrom-Json
  Write-OK "Snapshot $($s.snapshot_date): tag=$($s.tag) drift=$($s.drift_ratio) relay=$($s.relay_total) incidents=$($s.incident_count)"
  Write-Info "  Markdown: $BaseUrl/status/$($s.snapshot_date)-runtime-snapshot.md"
} else { Write-Warn "No snapshot yet — will be created in ~10s on startup" }

# ─── OPTIONAL DEPLOY ─────────────────────────────────────────────────────────────
if ($Deploy -or $Sync) {
  Write-Step "Deploying to Fly.io"
  $repoRoot = Split-Path $PSScriptRoot -Parent
  Set-Location $repoRoot
  fly deploy --app $App --remote-only 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-OK "Deploy succeeded"
    Write-Info "Waiting 15s for app startup..."
    Start-Sleep -Seconds 15
    $r2 = Invoke-Api "/api/system/smoke"
    if ($r2 -and $r2.StatusCode -eq 200) {
      $j2 = $r2.Content | ConvertFrom-Json
      $color2 = if ($j2.tag -eq "VERIFIED") { "Green" } else { "Red" }
      Write-Host "  Post-deploy smoke: $($j2.tag)" -ForegroundColor $color2
    }
  } else {
    Write-Fail "Deploy failed (exit $LASTEXITCODE)"
  }
}

# ─── SUMMARY ─────────────────────────────────────────────────────────────────────
Write-Host ""
if ($script:Errors -eq 0) {
  Write-Host "BOOTSTRAP OK" -ForegroundColor Green
} else {
  Write-Host "$($script:Errors) ISSUE(S) — resolve above" -ForegroundColor Red
}
Write-Host ""
Write-Host "  Live:       $BaseUrl" -ForegroundColor Gray
Write-Host "  Smoke:      $BaseUrl/api/system/smoke" -ForegroundColor Gray
Write-Host "  Promotion:  $BaseUrl/api/system/promotion" -ForegroundColor Gray
Write-Host "  Qdrant:     $BaseUrl/api/qdrant/health" -ForegroundColor Gray
Write-Host "  Metrics:    $BaseUrl/metrics" -ForegroundColor Gray
Write-Host "  Grafana:    grafana/dashboard.json (import to Grafana Cloud)" -ForegroundColor Gray
Write-Host "  Prometheus: grafana/prometheus.yml (scrape config)" -ForegroundColor Gray
exit $script:Errors
