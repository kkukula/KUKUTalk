try { (Invoke-WebRequest -UseBasicParsing http://localhost:3001/ -TimeoutSec 2).StatusCode } catch { "API: " + ($_.Exception.Response.StatusCode.value__) }
try { (Invoke-WebRequest -UseBasicParsing http://localhost:3002/health -TimeoutSec 2).StatusCode } catch { "GUARD: " + ($_.Exception.Response.StatusCode.value__) }
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
