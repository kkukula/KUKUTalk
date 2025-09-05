param([string]$Email="dev1@example.com")
$dc="infra/docker/docker-compose.yml"; $ov="infra/docker/docker-compose.guard.yml"
$prep=@"
cat >/tmp/login.json <<'JSON'
{"email":"$Email","password":"Passw0rd!"}
JSON
"@
docker compose -f $dc -f $ov exec guard sh -lc $prep
docker compose -f $dc -f $ov exec guard sh -lc "curl -i -s --json @/tmp/login.json http://api:3001/auth/login | sed -n '1,80p'"
