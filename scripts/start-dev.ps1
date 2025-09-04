# start-dev.ps1
# Start API and Web in separate windows, with pnpm/npm fallback

function RunWin($title, $cmd){
  Start-Process powershell -ArgumentList '-NoExit','-Command',("Write-Host ""== " + $title + " ==""; " + $cmd)) | Out-Null
}

$apiCmd = 'cd apps\api; if (Get-Command pnpm -ErrorAction SilentlyContinue) { pnpm run start:dev } else { npm run start:dev }'
$webPrep = 'if (-not (Test-Path apps\web\.env) -and (Test-Path apps\web\.env.example)) { Copy-Item apps\web\.env.example apps\web\.env -ErrorAction SilentlyContinue }'
$webCmd = 'cd apps\web; if (Get-Command pnpm -ErrorAction SilentlyContinue) { pnpm run dev } else { npm run dev }'

Invoke-Expression $webPrep
RunWin "API" $apiCmd
RunWin "WEB" $webCmd

Write-Host "Launched API and WEB in separate windows." -ForegroundColor Green
