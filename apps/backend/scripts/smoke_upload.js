const http = require('http')
function post(path, body, token) {
  const data = Buffer.from(JSON.stringify(body))
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type':'application/json', 'Content-Length': data.length }
    if (token) headers['Authorization'] = 'Bearer ' + token
    const req = http.request({ host:'localhost', port: process.env.PORT||3001, path, method:'POST', headers }, res => {
      let buf=''; res.on('data', c=>buf+=c); res.on('end', ()=>resolve({status:res.statusCode, body:buf, headers:res.headers})) })
    req.on('error', reject); req.write(data); req.end()
  })
}
function postMultipart(path, fileName, mime, buf, token){
  const boundary = '----kuku' + Date.now()
  const head = Buffer.from('--'+boundary+'\\r\\n' +
    'Content-Disposition: form-data; name=\"file\"; filename=\"'+fileName+'\"\\r\\n' +
    'Content-Type: '+mime+'\\r\\n\\r\\n', 'utf8')
  const tail = Buffer.from('\\r\\n--'+boundary+'--\\r\\n','utf8')
  const body = Buffer.concat([head, buf, tail])
  return new Promise((resolve, reject)=>{
    const headers = { 'Content-Type': 'multipart/form-data; boundary='+boundary, 'Content-Length': body.length }
    if (token) headers['Authorization'] = 'Bearer ' + token
    const req = http.request({ host:'localhost', port: process.env.PORT||3001, path, method:'POST', headers }, res=>{
      let buf2=''; res.on('data', c=>buf2+=c); res.on('end', ()=>resolve({status:res.statusCode, body:buf2, headers:res.headers}))
    })
    req.on('error', reject); req.write(body); req.end()
  })
}
function get(path, token){
  return new Promise((resolve, reject)=>{
    const headers = token?{'Authorization':'Bearer '+token}:{}
    const req = http.request({ host:'localhost', port: process.env.PORT||3001, path, method:'GET', headers }, res=>{
      let buf=''; res.on('data', c=>buf+=c); res.on('end', ()=>resolve({status:res.statusCode, body:buf, headers:res.headers}))
    })
    req.on('error', reject); req.end()
  })
}
;(async () => {
  const email = 'parent+' + Date.now() + '@example.com'
  const pass = 'Passw0rd!'
  let r = await post('/auth/register-parent', { email, password: pass })
  if (r.status !== 200) { console.log(JSON.stringify({ pass:false, step:'register', status:r.status, body:r.body })); process.exit(1) }
  r = await post('/auth/login', { email, password: pass })
  if (r.status !== 200) { console.log(JSON.stringify({ pass:false, step:'login', status:r.status, body:r.body })); process.exit(1) }
  const token = JSON.parse(r.body).token

  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P8z8AARgMGgQEAAgAB9Yc7QwAAAABJRU5ErkJggg=='
  const png = Buffer.from(b64, 'base64')

  r = await postMultipart('/upload', 'tiny.png', 'image/png', png, token)
  if (r.status !== 200) { console.log(JSON.stringify({ pass:false, step:'upload', status:r.status, body:r.body })); process.exit(1) }
  const id = (JSON.parse(r.body)||{}).id
  if (!id) { console.log(JSON.stringify({ pass:false, step:'no_id' })); process.exit(1) }

  const g = await get('/files/'+id, token)
  const pass = g.status===200 && (g.headers['content-type']||'').indexOf('image/png')!==-1
  console.log(JSON.stringify({ pass, id, fetch:g.status }, null, 2))
  process.exit(pass?0:1)
})().catch(e=>{ console.error(e); process.exit(2) })
