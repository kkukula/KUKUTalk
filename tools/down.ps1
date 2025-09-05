$dc = "infra/docker/docker-compose.yml"
$ov = "infra/docker/docker-compose.guard.yml"
docker compose -f $dc -f $ov down -v
