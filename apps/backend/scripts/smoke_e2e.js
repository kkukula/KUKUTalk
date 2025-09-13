const io = require('socket.io-client')
const crypto = require('crypto')
const nacl = require('tweetnacl')

function b64u(buf){ return Buffer.from(buf).toString('base64') }
function keyFrom(pass, room){ const s='kuku|'+(room||'')+'|'+pass; return new Uint8Array(crypto.createHash('sha256').update(s).digest()) }
function enc(msg, pass, room){
  const key = keyFrom(pass, room)
  const nonce = nacl.randomBytes(24)
  const ct = nacl.secretbox(Buffer.from(msg,'utf8'), nonce, key)
  return 'E2E.v1.'+b64u(nonce)+'.'+b64u(ct)
}
;(async () => {
  const url = 'ws://localhost:' + (process.env.PORT||3001)
  const client = io(url, { auth:{} })
  const payload = { from:'T', text: enc('hello e2e', 'dev-secret', 'testroom'), room:'testroom', ts: Date.now() }
  const ok = await new Promise(res=>{
    let t=setTimeout(()=>res(false),1500)
    client.once('connect', ()=> client.emit('chat:message', payload))
    client.once('system:ack', ()=>{ clearTimeout(t); res(true) })
  })
  client.close()
  console.log(JSON.stringify({ pass: ok }, null, 2))
  process.exit(ok?0:1)
})().catch(e=>{ console.error(e); process.exit(2) })
