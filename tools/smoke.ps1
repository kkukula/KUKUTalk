param([string]$Base="http://localhost:3002")
$ErrorActionPreference="Stop"
$b=@{ username="dev1"; password="Passw0rd!" } | ConvertTo-Json
$tok = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$Base/auth/login" -ContentType "application/json" -Body $b
$access = ($tok.Content | ConvertFrom-Json).accessToken
Write-Host "LOGIN OK (len=$($access.Length))"

$g = Invoke-WebRequest -UseBasicParsing -Method GET -Uri "$Base/conversations" -Headers @{ Authorization = "Bearer $access" }
Write-Host "GET /conversations -> $($g.StatusCode)"

$payload = @{ type="DIRECT"; participantIds=@("u_123","u_456"); title="Smoke direct" } | ConvertTo-Json
$p = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$Base/conversations" -ContentType "application/json" -Headers @{ Authorization = "Bearer $access" } -Body $payload
Write-Host "POST /conversations -> $($p.StatusCode)`nBody: $($p.Content)"
