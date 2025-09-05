param([switch]$Force=$false)
$dc = "infra/docker/docker-compose.yml"
$ov = "infra/docker/docker-compose.guard.yml"
$flags = $Force.IsPresent ? "-f" : ""
docker compose -f $dc -f $ov exec api sh -lc "pnpm -C apps/api exec prisma migrate reset $flags --skip-seed false"
