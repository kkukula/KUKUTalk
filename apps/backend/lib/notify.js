const fs = require('fs')
const path = require('path')
const webpush = require('web-push')
const nodemailer = require('nodemailer')
const { readJson } = require('./store')
const queue = require('./queue')

const DB = path.join(__dirname, '..', 'data', 'notify.json')
const OUTBOX = path.join(__dirname, '..', 'data', 'outbox')

function readDB(){
  try { return JSON.parse(fs.readFileSync(DB,'utf8')) } catch(e){ return { version:1, users:{}, vapid:{ publicKey:'', privateKey:'' } } }
}
function writeDB(obj){
  const tmp = DB + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8')
  fs.renameSync(tmp, DB)
}
function ensureDirs(){
  if (!fs.existsSync(OUTBOX)) fs.mkdirSync(OUTBOX, { recursive:true })
}
function ensureVapid(){
  const db = readDB()
  if (!db.vapid) db.vapid = { publicKey:'', privateKey:'' }
  if (!db.vapid.publicKey || !db.vapid.privateKey) {
    const kp = webpush.generateVAPIDKeys()
    db.vapid.publicKey = kp.publicKey
    db.vapid.privateKey = kp.privateKey
    writeDB(db)
  }
  webpush.setVapidDetails(process.env.VAPID_CONTACT || 'mailto:admin@example.com', db.vapid.publicKey, db.vapid.privateKey)
  return db.vapid
}

function getPrefs(userId){
  const db = readDB()
  const u = db.users[userId] || { prefs:{ push:false, email:false }, subs:[] }
  return u.prefs
}
function setPrefs(userId, prefs){
  const db = readDB()
  if (!db.users[userId]) db.users[userId] = { prefs:{ push:false, email:false }, subs:[] }
  db.users[userId].prefs = Object.assign({ push:false, email:false }, prefs||{})
  writeDB(db); return db.users[userId].prefs
}
function addSubscription(userId, sub){
  const db = readDB()
  if (!db.users[userId]) db.users[userId] = { prefs:{ push:false, email:false }, subs:[] }
  const s = JSON.stringify(sub)
  if (!db.users[userId].subs.some(x => JSON.stringify(x) === s)) db.users[userId].subs.push(sub)
  writeDB(db); return db.users[userId].subs.length
}

async function sendPushToUser(userId, payload){
  const db = readDB(); ensureVapid()
  const rec = db.users[userId]; if (!rec || !rec.subs || !rec.subs.length) return
  const data = JSON.stringify(payload||{})
  for (const sub of rec.subs) {
    try { await webpush.sendNotification(sub, data) } catch(e) { /* ignore per-sub failures */ }
  }
}

async function sendEmailToUser(userId, subject, text){
  ensureDirs()
  const url = process.env.SMTP_URL
  if (!url) {
    const name = 'mail_' + Date.now() + '_' + Math.random().toString(16).slice(2) + '.eml'
    fs.writeFileSync(path.join(OUTBOX, name), [
      'Subject: '+subject,
      '',
      text
    ].join('\n'), 'utf8')
    return
  }
  const t = nodemailer.createTransport(url)
  await t.sendMail({
    from: process.env.VAPID_CONTACT || 'noreply@example.com',
    to: 'parent+'+userId+'@example.com',
    subject,
    text
  })
}

function enqueuePush(userId, payload){
  return queue.enqueue({ run: () => sendPushToUser(userId, payload), maxTries:3, backoffMs:500 })
}
function enqueueEmail(userId, subject, text){
  return queue.enqueue({ run: () => sendEmailToUser(userId, subject, text), maxTries:3, backoffMs:1000 })
}

function parentForChild(childId){
  const db = readJson()
  return (db.users||[]).find(u => Array.isArray(u.children) && u.children.indexOf(childId)!==-1) || null
}

module.exports = {
  ensureVapid, getPrefs, setPrefs, addSubscription,
  enqueuePush, enqueueEmail, parentForChild
}
