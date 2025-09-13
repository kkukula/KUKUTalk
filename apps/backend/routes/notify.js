const notify = require('../lib/notify')

function getPrefs(req, res){
  const uid = req.user && req.user.sub
  return res.json({ prefs: notify.getPrefs(uid) })
}
function setPrefs(req, res){
  const uid = req.user && req.user.sub
  const p = notify.setPrefs(uid, { push: !!(req.body && req.body.push), email: !!(req.body && req.body.email) })
  return res.json({ ok:true, prefs: p })
}
function subscribe(req, res){
  const uid = req.user && req.user.sub
  const sub = req.body || {}
  const n = notify.addSubscription(uid, sub)
  return res.json({ ok:true, subs: n })
}
function vapid(req, res){
  const k = notify.ensureVapid()
  return res.json({ publicKey: k.publicKey })
}
function test(req, res){
  const uid = req.user && req.user.sub
  const ch = String((req.body && req.body.channel) || 'push')
  if (ch === 'email') {
    notify.enqueueEmail(uid, 'KUKUTalk test email', 'This is a test notification.')
  } else {
    notify.enqueuePush(uid, { title:'KUKUTalk', body:'This is a test push.', ts: Date.now() })
  }
  return res.json({ ok:true })
}
function outboxLast(req, res){
  if (String(process.env.NOTIFY_DEBUG||'').toLowerCase()!=='true') return res.status(404).end()
  const fs = require('fs'); const path = require('path')
  const dir = path.join(__dirname, '..', 'data', 'outbox')
  try {
    const files = fs.readdirSync(dir).filter(f=>f.endsWith('.eml')).sort()
    if (!files.length) return res.json({ file: null })
    const f = files[files.length-1]
    const content = fs.readFileSync(path.join(dir, f), 'utf8')
    return res.json({ file: f, size: content.length })
  } catch(e){ return res.json({ file: null }) }
}
module.exports = { getPrefs, setPrefs, subscribe, vapid, test, outboxLast }
