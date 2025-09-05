param([string]$Base="http://localhost:3002")
$ErrorActionPreference="Stop"
$b = @{ email="dev1@example.com"; password="Passw0rd!" } | ConvertTo-Json -Compress
$tok = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$Base/auth/login" -ContentType "application/json" -Body $b
"EMAIL LOGIN -> $($tok.StatusCode)"
