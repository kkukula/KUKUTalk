param(
  [string]$Username="dev1",
  [string]$Password="Passw0rd!",
  [string]$Dc="infra/docker/docker-compose.yml",
  [string]$Ov="infra/docker/docker-compose.guard.yml",
  [switch]$StatusOnly
)

# JSON -> Base64 lokalnie w PS (zero problemów z quotingiem)
$payload    = @{ username=$Username; password=$Password } | ConvertTo-Json -Compress
$payloadB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($payload))

# Skrypt shellowy wykonywany W KONTENERZE
$sh = if ($StatusOnly) {
@"
printf '%s' '$payloadB64' | base64 -d > /tmp/login.json
curl -s -o /dev/null -w 'API_LOGIN_HTTP:%{http_code}\n' \
  -H 'Content-Type: application/json' --data-binary @/tmp/login.json \
  http://api:3001/auth/login
"@
} else {
@"
printf '%s' '$payloadB64' | base64 -d > /tmp/login.json
curl -i -s -H 'Content-Type: application/json' \
  --data-binary @/tmp/login.json http://api:3001/auth/login | sed -n '1,80p'
"@
}

docker compose -f "$Dc" -f "$Ov" exec guard sh -lc $sh
