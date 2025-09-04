# switch-to-sqlite.ps1
# Switch Prisma provider to SQLite for offline dev and push schema

$ErrorActionPreference = "Stop"

$schema = "apps\api\infra\prisma\schema.prisma"
$envPath = "apps\api\.env"

if(-not (Test-Path $schema)){ Write-Host "[X] schema.prisma not found" -ForegroundColor Red; exit 1 }

# backup
Copy-Item $schema ($schema + ".bak") -Force

# replace provider to sqlite
(Get-Content $schema) -replace 'provider\s*=\s*"postgresql"','provider = "sqlite"' | Set-Content $schema -Encoding UTF8

# ensure DATABASE_URL=file:...
$targetUrl = 'DATABASE_URL=file:./infra/prisma/dev.db'
if(Test-Path $envPath){
  $cnt = Get-Content $envPath
  if(($cnt | Select-String -Pattern '^DATABASE_URL=')){
    ($cnt -replace '^DATABASE_URL=.*', $targetUrl) | Set-Content $envPath -Encoding UTF8
  } else {
    Add-Content -Path $envPath -Value $targetUrl -Encoding UTF8
  }
}else{
  Set-Content -Path $envPath -Value $targetUrl -Encoding UTF8
}

Push-Location apps\api
npx prisma generate
npx prisma db push
# optional seeds
if(Test-Path "prisma\seed.cjs"){ try{ node prisma\seed.cjs }catch{} }
if(Test-Path "prisma\seed.js"){ try{ node prisma\seed.js }catch{} }
Pop-Location

Write-Host "[OK] Switched to SQLite and synced schema." -ForegroundColor Green
