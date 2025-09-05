param([int]\HttpStatus=120)
Write-Host "
== API logs (tail \HttpStatus) =="
docker compose -f 'infra/docker/docker-compose.yml' -f 'infra/docker/docker-compose.guard.yml' logs api --no-log-prefix -n \HttpStatus
Write-Host "
== GUARD logs (tail \HttpStatus) =="
docker compose -f 'infra/docker/docker-compose.yml' -f 'infra/docker/docker-compose.guard.yml' logs guard --no-log-prefix -n \HttpStatus
Write-Host "
== Guard  API /docs-json (node) =="
docker compose -f 'infra/docker/docker-compose.yml' -f 'infra/docker/docker-compose.guard.yml' exec guard node -e "require('http').get('http://api:3001/docs-json',r=>{console.log('OK:'+r.statusCode);r.resume()}).on('error',e=>console.log('ERR:'+(e.code||e.message)))"
