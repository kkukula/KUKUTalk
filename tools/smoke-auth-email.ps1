param(
  [string]$Api="http://localhost:3001",
  [string]$Path="/auth/login"
)
function PostJson([hashtable]$Body){
  $json = ($Body | ConvertTo-Json -Depth 5 -Compress)
  try {
    $resp = Invoke-WebRequest -Method POST -Uri ($Api+$Path) -ContentType "application/json" -Body $json -TimeoutSec 10 -ErrorAction Stop
    return @{ Code=$resp.StatusCode; Ok=$true }
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__){
      return @{ Code=$_.Exception.Response.StatusCode.value__; Ok=$false }
    }
    return @{ Code=0; Ok=$false }
  }
}

Write-Host "== Smoke AUTH (aktualny tryb) ==" -ForegroundColor Cyan
$rA = PostJson @{ username="someuser"; password="x" }
Write-Host ("username-only -> HTTP {0}" -f $rA.Code)
$rB = PostJson @{ email="noone@example.com"; password="x" }
Write-Host ("email-only    -> HTTP {0}" -f $rB.Code)
