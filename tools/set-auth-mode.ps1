param([ValidateSet("disabled","both","emailonly")][string]$Mode="disabled")
$ctr = (docker ps --format "{{.Names}}" | Where-Object { $_ -match "docker-api-1$" -or $_ -match "api-1$" } | Select-Object -First 1)
if (-not $ctr) { throw "Nie znaleziono kontenera API (szukam *api-1)" }
$cmd = "printf '$Mode' > /app/.auth_email_mode && echo set:$Mode"
docker exec $ctr sh -lc "$cmd"
