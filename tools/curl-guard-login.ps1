param()
$dc="infra/docker/docker-compose.yml"
$ov="infra/docker/docker-compose.guard.yml"
$cmd=@"
printf '%s' '{""username"":""dev1"",""password"":""Passw0rd!""}' >/tmp/login.json
curl -i -s -H 'Content-Type: application/json' --data-binary @/tmp/login.json http://api:3001/auth/login | sed -n '1,80p'
"@
docker compose -f $dc -f $ov exec guard sh -lc $cmd
