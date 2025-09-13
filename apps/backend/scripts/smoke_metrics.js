const http = require('http')

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host:'localhost', port: process.env.PORT||3001, path, method:'GET' }, res => {
      let buf=''; res.on('data', c=>buf+=c); res.on('end', ()=>resolve({status:res.statusCode, body:buf, headers:res.headers}))
    })
    req.on('error', reject); req.end()
  })
}

;(async () => {
  const h = await get('/health')
  const m = await get((process.env.METRICS_PATH||'/metrics'))
  const pass = h.status===200 && m.status===200 && (m.body.indexOf('kukutalk_http_requests_total')!==-1)
  console.log(JSON.stringify({ pass, health:h.status, metrics:m.status }, null, 2))
  process.exit(pass?0:1)
})().catch(e=>{ console.error(e); process.exit(2) })
