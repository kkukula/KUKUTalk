param([int]$n=120)
Write-Host "`n== API logs (tail $n) =="
docker compose -f "infra/docker/docker-compose.yml" -f "infra/docker/docker-compose.guard.yml" logs api --no-log-prefix -n $n
Write-Host "`n== GUARD logs (tail $n) =="
docker compose -f "infra/docker/docker-compose.yml" -f "infra/docker/docker-compose.guard.yml" logs guard --no-log-prefix -n $n
Write-Host "`n== Guard  API /docs-json (node) =="
docker compose -f "infra/docker/docker-compose.yml" -f "infra/docker/docker-compose.guard.yml" exec guard node -e "require('http').get('http://api:3001/docs-json',r=>{console.log('OK:'+r.statusCode);r.resume()}).on('error',e=>console.log('ERR:'+(e.code||e.message)))"
