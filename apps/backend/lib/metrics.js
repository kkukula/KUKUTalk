const client = require('prom-client')

const register = new client.Registry()
client.collectDefaultMetrics({ register, prefix: 'kukutalk_' })

const httpReqs = new client.Counter({
  name: 'kukutalk_http_requests_total',
  help: 'HTTP requests total',
  labelNames: ['method','route','status']
})
const httpLatency = new client.Histogram({
  name: 'kukutalk_http_request_duration_seconds',
  help: 'HTTP request duration',
  buckets: [0.01,0.05,0.1,0.2,0.5,1,2,5],
  labelNames: ['route']
})
const socketConns = new client.Gauge({
  name: 'kukutalk_socket_connections',
  help: 'Active socket connections'
})
const socketMsgs = new client.Counter({
  name: 'kukutalk_socket_messages_total',
  help: 'Socket messages',
  labelNames: ['type'] // ack, block
})

register.registerMetric(httpReqs)
register.registerMetric(httpLatency)
register.registerMetric(socketConns)
register.registerMetric(socketMsgs)

function httpStartTimer(route){ return httpLatency.startTimer({ route }) }
function httpCount(method, route, status){ httpReqs.inc({ method, route, status: String(status) }, 1) }
function socketsInc(delta){ socketConns.inc(delta) }
function socketMsg(type){ socketMsgs.inc({ type }, 1) }

module.exports = { register, httpStartTimer, httpCount, socketsInc, socketMsg }
