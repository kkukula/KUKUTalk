param([string]$Base="http://localhost:3002")
$ErrorActionPreference="Stop"
$b = @{ username="dev1"; password="Passw0rd!" } | ConvertTo-Json
$tok = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$Base/auth/login" -ContentType "application/json" -Body $b
$access = ($tok.Content | ConvertFrom-Json).accessToken
$conv = @{ type="DIRECT"; participantIds=@("u_123","u_456"); title="Demo chat" } | ConvertTo-Json
$c = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$Base/conversations" -ContentType "application/json" -Headers @{ Authorization = "Bearer $access" } -Body $conv
$id = ($c.Content | ConvertFrom-Json).id
$msg = @{ content="Hello from demo-send.ps1" } | ConvertTo-Json
$m = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "$Base/conversations/$id/messages" -ContentType "application/json" -Headers @{ Authorization = "Bearer $access" } -Body $msg
"CONV: $id  MSG: $($m.StatusCode)"
