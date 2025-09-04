# KUKUTalk - setup (ASCII only)
# Run from repo root, e.g. C:\projekty\kukulatalk
# PS> powershell -ExecutionPolicy Bypass -File .\scripts\setup-kukutalk.ps1

$ErrorActionPreference = "Stop"

function WStep($m){ Write-Host $m -ForegroundColor Cyan }
function WOk($m){ Write-Host ("   -> " + $m) -ForegroundColor Green }
function WInf($m){ Write-Host ("   -> " + $m) -ForegroundColor Gray }
function WWrn($m){ Write-Host ("   -> " + $m) -ForegroundColor Yellow }
function WErr($m){ Write-Host ("   [BLAD] " + $m) -ForegroundColor Red }

# 0) Validate location
$RepoRoot = (Get-Location)
if(-not (Test-Path "$RepoRoot\apps")){ WErr "Run from repo root (must contain 'apps\')."; exit 1 }
$RepoName = Split-Path -Leaf $RepoRoot

# 1) Clean junk
WStep "1) Cleaning duplicates and junk"
# remove node_modules
Get-ChildItem $RepoRoot -Recurse -Directory -Filter "node_modules" -ErrorAction SilentlyContinue | ForEach-Object {
  try { WInf "Removing $($_.FullName)"; Remove-Item -Recurse -Force $_.FullName } catch {}
}
# remove build artifacts
$toClean = @(
  "apps\api\dist","apps\web\.next","apps\web\dist","apps\web\build",
  ".turbo",".cache","coverage","out","build","tmp","temp","_support"
)
$toClean | ForEach-Object {
  if(Test-Path $_){ try { WInf "Removing $_"; Remove-Item -Recurse -Force $_ } catch {} }
}
# remove *.bak
Get-ChildItem $RepoRoot -Recurse -Include *.bak,*.bak-* -File -ErrorAction SilentlyContinue | ForEach-Object {
  try { Remove-Item -Force $_.FullName } catch {}
}

# 2) Structure tidy
WStep "2) Tidying structure"
if( (Test-Path "infra\prisma") -and (Test-Path "apps\api\infra\prisma") ){
  WInf "Duplicate 'infra\prisma' detected. Keeping 'apps\api\infra\prisma'. Removing 'infra\prisma'."
  try { Remove-Item -Recurse -Force "infra\prisma" } catch {}
}

# 3) Tools: node, pnpm
WStep "3) Checking tools (node, pnpm)"
$hasNode = $false
try { $null = node -v; $hasNode = $true } catch {}
if(-not $hasNode){
  WWrn "Node.js not found. Please install Node.js LTS, then rerun."
  WInf  "winget install -e --id OpenJS.NodeJS.LTS   (optional)"
  WInf  "choco install -y nodejs-lts               (optional)"
  exit 1
}
WOk ("Node.js: " + (node -v))

$hasPnpm = $false
try { $null = pnpm -v; $hasPnpm = $true } catch {}
if(-not $hasPnpm){
  WInf "Installing pnpm globally via npm..."
  try { npm install -g pnpm | Out-Null; $null = pnpm -v; $hasPnpm = $true } catch {}
}
if($hasPnpm){ WOk ("pnpm: " + (pnpm -v)) } else { WWrn "pnpm not available, will use npm." }

# 4) Install deps
WStep "4) Installing dependencies"
if($hasPnpm){
  WInf "pnpm install (root)"
  pnpm install
}else{
  if(Test-Path "package.json"){ npm install }
  if(Test-Path "apps\api\package.json"){ Push-Location apps\api; npm install; Pop-Location }
  if(Test-Path "apps\web\package.json"){ Push-Location apps\web; npm install; Pop-Location }
}

# 5) .env files
WStep "5) Preparing .env files"
# API .env
$apiEnvPath = "apps\api\.env"
$apiEnv = @{}
if(Test-Path $apiEnvPath){
  (Get-Content $apiEnvPath) | ForEach-Object {
    if($_ -match '^\s*#' -or $_ -match '^\s*$'){ return }
    $kv = $_ -split '=',2
    if($kv.Length -eq 2){ $apiEnv[$kv[0].Trim()] = $kv[1].Trim() }
  }
}else{
  WInf "Creating apps\api\.env"
}
if(-not $apiEnv.ContainsKey("DATABASE_URL")){
  $apiEnv["DATABASE_URL"] = "file:./prisma/dev.db"
}
if(-not $apiEnv.ContainsKey("JWT_SECRET")){
  $apiEnv["JWT_SECRET"] = ([Guid]::NewGuid().ToString("N"))
}
$apiEnvLines = $apiEnv.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }
Set-Content -Path $apiEnvPath -Value $apiEnvLines -Encoding UTF8
WOk "apps\api\.env ready"

# WEB .env
$webExample = "apps\web\.env.example"
$webEnv = "apps\web\.env"
if( (Test-Path $webExample) -and (-not (Test-Path $webEnv)) ){
  Copy-Item $webExample $webEnv
  WOk "apps\web\.env created from .env.example"
}elseif(Test-Path $webEnv){
  WInf "apps\web\.env exists"
}else{
  WWrn "apps\web\.env(.example) not found - skipped"
}

# 6) Prisma: migrate/generate + seed
WStep "6) Initializing DB (SQLite) and Prisma"
if(Test-Path "apps\api\prisma"){
  Push-Location apps\api
  try{
    WInf "npx prisma migrate deploy"
    npx prisma migrate deploy | Out-Null
  }catch{ WWrn "prisma migrate deploy failed (continuing)" }
  try{
    WInf "npx prisma generate"
    npx prisma generate | Out-Null
  }catch{ WErr "prisma generate failed" }
  if(Test-Path "prisma\seed.cjs"){
    WInf "Seeding prisma\seed.cjs"
    try{ node prisma\seed.cjs | Out-Null }catch{}
  }elseif(Test-Path "prisma\seed.js"){
    WInf "Seeding prisma\seed.js"
    try{ node prisma\seed.js | Out-Null }catch{}
  }elseif(Test-Path "prisma\seed.ts"){
    WInf "Seeding prisma\seed.ts (requires tsx/ts-node)"
    try{ npx tsx prisma\seed.ts | Out-Null }catch{}
  }
  Pop-Location
  WOk "Local DB and Prisma ready"
}else{
  WWrn "apps\api\prisma not found - skipped"
}

# 7) Zip package (without node_modules etc.)
WStep "7) Creating clean ZIP package"
$ParentDir = Split-Path -Parent $RepoRoot
$ZipPath = Join-Path $ParentDir ("{0}_clean.zip" -f $RepoName)
if(Test-Path $ZipPath){ Remove-Item $ZipPath -Force }

$TempDir = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath "KUKUTalk_Package"
if(Test-Path $TempDir){ Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Use robocopy to copy with excludes
$rcArgs = @(
  "$RepoRoot", "$TempDir", "/E",
  "/XD", ".git","node_modules",".next","dist",".turbo",".cache","coverage","out","build","tmp","temp","_support",
  "/XF", "*.bak"
)
& robocopy @rcArgs | Out-Null

Compress-Archive -Path (Join-Path $TempDir "*") -DestinationPath $ZipPath -Force
Remove-Item $TempDir -Recurse -Force
WOk ("ZIP: " + $ZipPath)

Write-Host ""
WOk "Local run:"
Write-Host "  # Backend" -ForegroundColor White
Write-Host "  cd apps\api; pnpm run start:dev   (or: npm run start:dev)" -ForegroundColor White
Write-Host "  # Frontend" -ForegroundColor White
Write-Host "  cd ..\web; pnpm run dev           (or: npm run dev)" -ForegroundColor White
