param([string]$Base="http://localhost:3002",[int]$timeoutSec=60)
$ErrorActionPreference="Stop"
$sw = [Diagnostics.Stopwatch]::StartNew()
while ($sw.Elapsed.TotalSeconds -lt $timeoutSec) {
  try {
    $h = Invoke-WebRequest -UseBasicParsing -Uri "$Base/health" -TimeoutSec 3
    if ($h.StatusCode -ge 200) {
      $b=@{ username="dev1"; password="Passw0rd!" } | ConvertTo-Json
      $resp = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$Base/auth/login" -ContentType "application/json" -Body $b -TimeoutSec 3
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { "READY ($($resp.StatusCode))"; exit 0 }
    }
  } catch {}
  Start-Sleep -Milliseconds 800
}
Write-Error "Guard not ready in $timeoutSec s"
