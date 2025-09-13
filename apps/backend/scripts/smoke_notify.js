const http = require('http')

function post(path, body, token){
  const data = Buffer.from(JSON.stringify(body||{}))
  return new Promise((resolve,reject)=>{
    const headers = { 'Content-Type':'application/json', 'Content-Length': data.length }
    if (token) headers['Authorization'] = 'Bearer ' + token
    const req = http.request({ host:'localhost', port: process.env.PORT||3001, path, method:'POST', headers }, res=>{ let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve({status:res.statusCode, body:b})) })
    req.on('error', reject); req.write(data); req.end()
  })
}
function get(path, token){
  return new Promise((resolve,reject)=>{
    const headers = token?{ 'Authorization':'Bearer '+token }:{}
    const req = http.request({ host:'localhost', port: process.env.PORT||3001, path, method:'GET', headers }, res=>{ let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve({status:res.statusCode, body:b})) })
    req.on('error', reject); req.end()
  })
}

;(async ()=>{
  // create parent
  let r = await post('/auth/register-parent', { email:'parent+'+Date.now()+'@example.com', password:'Passw0rd!' })
  r = await post('/auth/login', { email: JSON.parse(r.body).email || 'parent@example.com', password:'Passw0rd!' })
  const token = JSON.parse(r.body).token

  // enable email pref and send test (uses outbox if SMTP_URL empty)
  await post('/notify/prefs', { email:true, push:false }, token)
  await post('/notify/test', { channel:'email' }, token)

  // poll outbox-last
  let ok = false
  for (let i=0;i<10;i++){
    await new Promise(s=>setTimeout(s,200))
    const k = await get('/notify/outbox-last', token)
    const j = JSON.parse(k.body)
    if (j && j.file) { ok = true; break }
  }
  console.log(JSON.stringify({ pass: ok }, null, 2))
  process.exit(ok?0:1)
})().catch(e=>{ console.error(e); process.exit(2) })
