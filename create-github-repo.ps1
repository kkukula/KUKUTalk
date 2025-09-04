# create-github-repo.ps1
param(
  [string]$Owner      = "kkukula",
  [string]$Repo       = "KUKUTalk",
  [ValidateSet("private","public")][string]$Visibility = "private",
  [bool]$IsOrg        = $false
)

$ErrorActionPreference = "Stop"

function OK([string]$m){ Write-Host ("[OK]  " + $m) -ForegroundColor Green }
function INF([string]$m){ Write-Host ("[i]   " + $m) -ForegroundColor Gray }
function BAD([string]$m){ Write-Host ("[X]   " + $m) -ForegroundColor Red }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { BAD "git not found"; exit 1 }
$root = (Get-Location).Path
INF "Working dir: $root"

$gi = @"
# Node / pnpm / Turbo
node_modules/
.pnpm-store/
.pnpm-debug.log*
.npmrc
.turbo/
dist/
build/
out/
coverage/
.next/
.cache/
.tmp/
temp/
tmp/

# Logs
*.log
logs/

# Env / secrets
.env
.env.*
apps/**/.env
infra/**/.env

# OS junk
.DS_Store
Thumbs.db

# Docker
**/.dockerignore

# Prisma
prisma/dev.db
**/dev.db
"@

$giPath = Join-Path $root ".gitignore"
if (Test-Path $giPath) {
  INF ".gitignore exists -> appending defaults"
  Add-Content -Path $giPath -Value "`r`n# --- KUKUTalk defaults ---`r`n$gi" -Encoding UTF8
} else {
  Set-Content -Path $giPath -Value $gi -Encoding UTF8
  OK "Created .gitignore"
}

if (-not (Test-Path (Join-Path $root ".git"))) {
  INF "Initializing git repo..."
  git init | Out-Null
}
# ensure branch main
try { git symbolic-ref --short HEAD | Out-Null } catch { }
$cur = ""
try { $cur = git branch --show-current } catch {}
if ($cur -ne "main" -and $cur -ne "") { git branch -M main } elseif ($cur -eq "") { git checkout -b main 2>$null | Out-Null }

git add -A
try { git commit -m "Initial import" | Out-Null } catch { INF "Nothing to commit" }

$remoteUrl = "https://github.com/$Owner/$Repo.git"
$hasGh = $false
try { $null = gh --version; $hasGh = $true } catch {}

if ($hasGh) {
  INF "Using GitHub CLI (gh)"
  $exists = $false
  try { gh repo view "$Owner/$Repo" 1>$null 2>$null; $exists = $true } catch {}
  if (-not $exists) {
    $flags = @("--remote","origin")
    if ($Visibility -eq "private") { $flags = @("--private") + $flags } else { $flags = @("--public") + $flags }
    gh repo create "$Owner/$Repo" @flags | Out-Null
    OK "Created repo $Owner/$Repo"
  } else {
    INF "Repo $Owner/$Repo already exists"
  }
  if (-not (git remote | Select-String -SimpleMatch "origin")) { git remote add origin $remoteUrl }
  git push -u origin main
} else {
  INF "gh not found -> using REST API with GITHUB_TOKEN"
  if (-not $env:GITHUB_TOKEN) { BAD "Set GITHUB_TOKEN env var (repo scope) and rerun"; exit 1 }
  $Headers = @{
    Authorization = "token $($env:GITHUB_TOKEN)"
    "User-Agent"  = "kukutalk-setup"
    Accept        = "application/vnd.github+json"
  }
  if ($IsOrg) {
    $uri = "https://api.github.com/orgs/$Owner/repos"
    $Body = @{ name = $Repo; private = ($Visibility -eq "private") } | ConvertTo-Json
  } else {
    $uri = "https://api.github.com/user/repos"
    $Body = @{ name = $Repo; private = ($Visibility -eq "private") } | ConvertTo-Json
  }
  try {
    Invoke-RestMethod -Method Post -Uri $uri -Headers $Headers -Body $Body | Out-Null
    OK "Created repo $Owner/$Repo via REST API"
  } catch {
    INF "Repo may already exist or creation failed; continuing"
  }
  if (-not (git remote | Select-String -SimpleMatch "origin")) { git remote add origin $remoteUrl }
  git push -u origin main
}

OK "All done. Remote: $remoteUrl"
Write-Host "Next: open $remoteUrl" -ForegroundColor Cyan
