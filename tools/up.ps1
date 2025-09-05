param([int]$Timeout=60)
$dc = "infra/docker/docker-compose.yml"
$ov = "infra/docker/docker-compose.guard.yml"
docker compose -f $dc -f $ov up -d --build --remove-orphans
pwsh tools/wait-guard.ps1 -timeoutSec $Timeout
pwsh tools/smoke.ps1
