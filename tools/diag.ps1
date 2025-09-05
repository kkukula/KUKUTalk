param([int]$n=120)
Write-Host "`n== API logs (tail $n) =="
docker compose -f "infra/docker/docker-compose.yml" -f "infra/docker/docker-compose.guard.yml" logs api --no-log-prefix -n $n
Write-Host "`n== GUARD logs (tail $n) =="
docker compose -f "infra/docker/docker-compose.yml" -f "infra/docker/docker-compose.guard.yml" logs guard --no-log-prefix -n $n
Write-Host "`n== Guard  API /docs-json (node) =="
docker compose -f "infra/docker/docker-compose.yml" -f "infra/docker/docker-compose.guard.yml" exec guard node -e "require('http').get('http://api:3001/docs-json',r=>{console.log('OK:'+r.statusCode);r.resume()}).on('error',e=>console.log('ERR:'+(e.code||e.message)))"

Write-Host "`n== AUTH /me (via Guard) =="
$b=@{ username="dev1"; password="Passw0rd!" } | ConvertTo-Json
$tok = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "http://localhost:3002/auth/login" -ContentType "application/json" -Body $b
$acc = ($tok.Content | ConvertFrom-Json).accessToken
try {
  $me = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3002/auth/me" -Headers @{ Authorization="Bearer $acc" }
  "AUTH /me -> $($me.StatusCode) : $($me.Content)"
} catch {
  "AUTH /me -> ERROR $($_.Exception.Response.StatusCode.value__)"
}
