const http = require('http')

function post(path, body) {
  const data = Buffer.from(JSON.stringify(body))
  return new Promise((resolve, reject) => {
    const req = http.request({ host:'localhost', port: process.env.PORT||3001, path, method:'POST', headers:{
      'Content-Type':'application/json',
      'Content-Length': data.length
    }}, res => {
      let buf=''; res.on('data', c=>buf+=c); res.on('end', ()=>resolve({status:res.statusCode, body:buf, headers:res.headers}))
    })
    req.on('error', reject)
    req.write(data); req.end()
  })
}
function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host:'localhost', port: process.env.PORT||3001, path, method:'GET', headers: token?{'Authorization':'Bearer '+token}:{}
    }, res => { let buf=''; res.on('data', c=>buf+=c); res.on('end', ()=>resolve({status:res.statusCode, body:buf, headers:res.headers})) })
    req.on('error', reject); req.end()
  })
}

;(async () => {
  const email = 'parent+' + Date.now() + '@example.com'
  const pass = 'Passw0rd!'
  const out = { pass:true, notes:[] }

  const r1 = await post('/auth/register-parent', { email, password: pass })
  if (r1.status !== 200) { out.pass=false; out.notes.push('register status ' + r1.status + ' ' + r1.body) }

  const r2 = await post('/auth/login', { email, password: pass })
  if (r2.status !== 200) { out.pass=false; out.notes.push('login status ' + r2.status + ' ' + r2.body) }
  const token = (r2.status===200) ? (JSON.parse(r2.body).token||'') : ''

  const r3 = await get('/me', token)
  if (r3.status !== 200) { out.pass=false; out.notes.push('me status ' + r3.status + ' ' + r3.body) }

  const r4 = await post('/profiles/child', { name: 'TestChild' }, token)
    .catch(async () => await fetchWithAuth('/profiles/child', token, {name:'TestChild'}))
  // If direct post with token header missing in helper, quick fallback using raw:
  async function fetchWithAuth(p, t, body){ 
    const data = Buffer.from(JSON.stringify(body))
    return new Promise((resolve, reject)=>{
      const req = http.request({ host:'localhost', port: process.env.PORT||3001, path:p, method:'POST', headers:{
        'Content-Type':'application/json', 'Content-Length': data.length, 'Authorization': 'Bearer '+t
      }}, res=>{ let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve({status:res.statusCode, body:b})) })
      req.on('error', reject); req.write(data); req.end()
    })
  }

  const childPost = await fetchWithAuth('/profiles/child', token, { name: 'PilotKid' })
  if (childPost.status !== 200) { out.pass=false; out.notes.push('create child status ' + childPost.status + ' ' + childPost.body) }

  const wl = await fetchWithAuth('/contacts/whitelist', token, { contact: 'family_friend@example.com' })
  if (wl.status !== 200) { out.pass=false; out.notes.push('whitelist status ' + wl.status + ' ' + wl.body) }

  console.log(JSON.stringify(out, null, 2))
  process.exit(out.pass ? 0 : 1)
})().catch(e => { console.error(e); process.exit(2) })
