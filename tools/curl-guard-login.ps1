param()
$dc="infra/docker/docker-compose.yml"
$ov="infra/docker/docker-compose.guard.yml"
PAYLOAD_B64="eyJ1c2VybmFtZSI6ImRldjEiLCJwYXNzd29yZCI6IlBhc3N3MHJkISJ9"
cmd=$(cat <<'SH'
printf '%s' '$PAYLOAD_B64' | base64 -d > /tmp/login.json
curl -i -s -H 'Content-Type: application/json' --data-binary @/tmp/login.json http://api:3001/auth/login | sed -n '1,80p'
SH
)
docker compose -f $dc -f $ov exec guard sh -lc "$cmd"
