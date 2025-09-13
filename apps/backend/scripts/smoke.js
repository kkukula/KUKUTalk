const http = require('http')

function req(path='\/health') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: 'localhost', port: process.env.PORT||3001, path, method: 'GET' }, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
    })
    req.on('error', reject)
    req.end()
  })
}

;(async () => {
  const out = { pass: true, notes: [] }

  const r1 = await req()
  if (r1.status !== 200) { out.pass=false; out.notes.push('health status != 200') }

  const hdr = r1.headers
  const must = [
    'x-content-type-options',
    'x-dns-prefetch-control',
    'x-frame-options'
  ]
  must.forEach(h => {
    if (!hdr[h]) { out.pass=false; out.notes.push('missing header ' + h) }
  })

  // Make multiple requests to check rate-limit headers presence
  const r2 = await req()
  const rateHeaders = ['ratelimit-limit','ratelimit-remaining','ratelimit-reset']
  let rhOk = rateHeaders.every(h => h in r2.headers)
  if (!rhOk) { out.pass=false; out.notes.push('missing rate limit headers') }

  console.log(JSON.stringify(out, null, 2))
  process.exit(out.pass ? 0 : 1)
})().catch(e => { console.error(e); process.exit(2) })
