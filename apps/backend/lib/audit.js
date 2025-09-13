const fs = require('fs')
const path = require('path')
const LOG = path.join(__dirname, '..', 'data', 'audit.log')

function ensure(){ const d = path.dirname(LOG); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive:true }); if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, '', 'utf8') }

function logEvent(ev){
  ensure()
  try {
    const e = Object.assign({ ts: Date.now() }, ev||{})
    const line = JSON.stringify(e)
    fs.appendFileSync(LOG, line + '\n', 'utf8')
  } catch(e) {}
}
function readAll(){
  ensure()
  try { return fs.readFileSync(LOG, 'utf8').split(/\r?\n/).filter(Boolean).map(x=>{ try{ return JSON.parse(x) }catch(e){ return null } }).filter(Boolean) } catch(e){ return [] }
}
function tail(limit){
  const arr = readAll()
  if (!limit || isNaN(limit)) return arr.slice(-100)
  limit = Math.max(1, Math.min(1000, Number(limit)))
  return arr.slice(-limit)
}
function toCsv(items){
  const esc = v => ('"'+String(v).replace(/"/g,'""')+'"')
  const rows = [['ts','type','actorId','actorRole','note']]
  for (const it of items) rows.push([it.ts, it.type||'', it.actorId||'', (it.actorRole||''), (it.note||'')])
  return rows.map(r=>r.map(esc).join(',')).join('\n')
}
module.exports = { logEvent, tail, toCsv }
