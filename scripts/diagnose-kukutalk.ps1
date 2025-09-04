# diagnose-kukutalk.ps1
# Quick environment and runtime check for KUKUTalk (Windows PowerShell)

$ErrorActionPreference = "SilentlyContinue"

function Line($t){ Write-Host $t -ForegroundColor Cyan }
function OK($t){ Write-Host ("  [OK] " + $t) -ForegroundColor Green }
function BAD($t){ Write-Host ("  [X]  " + $t) -ForegroundColor Red }
function INF($t){ Write-Host ("      " + $t) -ForegroundColor Gray }

$root = (Get-Location)

Line "== TOOLS =="
$node = $null; try { $node = node -v } catch {}
if($node){ OK ("Node: " + $node) } else { BAD "Node not found" }

$pnpm = $null; try { $pnpm = pnpm -v } catch {}
if($pnpm){ OK ("pnpm: " + $pnpm) } else { INF "pnpm not found (npm will be used)" }

$npm = $null; try { $npm = npm -v } catch {}
if($npm){ OK ("npm: " + $npm) } else { BAD "npm not found" }

$dockerCli = $null; try { $dockerCli = docker --version } catch {}
if($dockerCli){ OK ("docker: " + $dockerCli) } else { INF "docker CLI not found or Docker Desktop is not running" }

$ddSvc = Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue
if($ddSvc){ INF ("Docker Desktop service: " + $ddSvc.Status) } else { INF "Docker Desktop service not detected" }

Line "== PRISMA CONFIG =="
$schemaPath = Join-Path $root "apps\api\infra\prisma\schema.prisma"
if(Test-Path $schemaPath){
  $schemaRaw = Get-Content $schemaPath -Raw
  $provider = $null
  if($schemaRaw -match 'provider\s*=\s*"(.*?)"'){ $provider = $matches[1] }
  if($provider){ OK ("Prisma provider: " + $provider) } else { BAD "Prisma provider not found in schema.prisma" }
}else{
  BAD "schema.prisma not found at apps\api\infra\prisma\schema.prisma"
}

$apiEnvPath = "apps\api\.env"
if(Test-Path $apiEnvPath){
  $dbLine = (Get-Content $apiEnvPath) | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
  if($dbLine){
    OK ("API .env DATABASE_URL: " + $dbLine.Substring(13))
  } else {
    BAD "API .env has no DATABASE_URL"
  }
}else{
  BAD "apps\api\.env not found"
}

$webEnvPath = "apps\web\.env"
if(Test-Path $webEnvPath){
  $apiVar = (Get-Content $webEnvPath) | Where-Object { $_ -match '^(VITE_API_URL|NEXT_PUBLIC_API_URL)=' } | Select-Object -First 1
  if($apiVar){ OK ("WEB .env API URL: " + $apiVar) } else { INF "WEB .env has no API URL var" }
}else{
  INF "apps\web\.env not found (may be created from .env.example)"
}

Line "== PORTS =="
# helper to test a port
function PortInfo($p){
  $lines = netstat -ano | findstr /R (":$p\s")
  if($LASTEXITCODE -eq 0 -and $lines){
    $pids = @()
    $lines | ForEach-Object {
      $cols = ($_ -replace '\s+',' ').Trim().Split(' ')
      if($cols.Length -ge 5){ $pids += $cols[-1] }
    }
    $pids = $pids | Sort-Object -Unique
    $procs = $pids | ForEach-Object {
      try{
        $proc = Get-Process -Id $_ -ErrorAction SilentlyContinue
        if($proc){ "$_ ($($proc.ProcessName))" } else { "$_ (unknown)" }
      }catch{ "$_ (unknown)" }
    }
    OK ("Port " + $p + " LISTEN by: " + ($procs -join ', '))
  } else {
    INF ("Port " + $p + " free")
  }
}
PortInfo 3001   # API default
PortInfo 3000   # Next.js default
PortInfo 5173   # Vite default
PortInfo 5432   # Postgres default
PortInfo 6379   # Redis default

Line "== NODE_MODULES =="
if(Test-Path "apps\api\node_modules\@prisma\client"){ OK "API deps installed" } else { INF "API deps missing" }
if(Test-Path "apps\web\node_modules"){ OK "WEB deps installed" } else { INF "WEB deps missing" }

Line "== SUMMARY =="
$ready = $true
if(-not $node){ $ready = $false }
if(-not (Test-Path $apiEnvPath)){ $ready = $false }
if(-not (Test-Path $schemaPath)){ $ready = $false }
if($ready){ OK "Baseline looks OK. You can start services." } else { BAD "Baseline not ready. Fix above issues." }
