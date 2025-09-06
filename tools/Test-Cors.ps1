param(
  [int[]] $Ports = @(5173,5174),
  [string] $Api  = "http://localhost:3001",
  [string] $Path = "/auth/login"
)

foreach ($p in $Ports) {
  $origin  = "http://localhost:$p"
  $headers = @{
    "Origin"                          = $origin
    "Access-Control-Request-Method"   = "POST"
    "Access-Control-Request-Headers"  = "content-type,authorization"
  }
  try {
    $res  = Invoke-WebRequest -Method Options -Uri ($Api + $Path) -Headers $headers -TimeoutSec 15 -ErrorAction Stop
    $acao = $res.Headers["Access-Control-Allow-Origin"];        if (-not $acao) { $acao = "(brak ACAO)" }
    $acac = $res.Headers["Access-Control-Allow-Credentials"];   if (-not $acac) { $acac = "(brak ACAC)" }
    Write-Host ("[OK] Preflight {0} -> {1} | ACAO={2} | ACAC={3}" -f $origin, $res.StatusCode, $acao, $acac) -ForegroundColor Green
  } catch {
    Write-Host ("[FAIL] Preflight {0} -> {1}" -f $origin, $_.Exception.Message) -ForegroundColor Red
  }
}
