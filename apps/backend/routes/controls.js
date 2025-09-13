const { v4: uuidv4 } = require('uuid')
const { readJson, writeJson } = require('../lib/store')

// Schedule rule shape: { days:[0-6], start:'HH:MM', end:'HH:MM' }
function setSchedule(req, res) {
  const parentId = req.user.sub
  const childId = String(req.body.childId||'').trim()
  const rules = Array.isArray(req.body.rules) ? req.body.rules : []
  if (!childId) return res.status(400).json({ error: 'childId required' })
  const db = readJson()
  const parent = db.users.find(u=>u.id===parentId)
  if (!parent || parent.children.indexOf(childId)===-1) return res.status(404).json({ error: 'child not found' })
  db.controls = db.controls || { schedules:{}, requests:[] }
  db.controls.schedules[childId] = rules.map(normalizeRule).filter(Boolean)
  writeJson(db)
  return res.json({ ok:true, childId, rules: db.controls.schedules[childId] })
}
function getSchedule(req, res) {
  const parentId = req.user.sub
  const childId = String(req.query.childId||'').trim()
  const db = readJson()
  const parent = db.users.find(u=>u.id===parentId)
  if (!parent || parent.children.indexOf(childId)===-1) return res.status(404).json({ error: 'child not found' })
  const rules = (((db.controls||{}).schedules||{})[childId]) || []
  return res.json({ childId, rules })
}
function requestContact(req, res) {
  // Child requests new contact/room (e.g., room id or contact email)
  const childId = req.user.sub
  const contact = String(req.body.contact||'').trim()
  if (!contact) return res.status(400).json({ error:'contact required' })
  const db = readJson()
  const child = db.children.find(c=>c.id===childId)
  if (!child) return res.status(404).json({ error:'child not found' })
  db.controls = db.controls || { schedules:{}, requests:[] }
  const id = uuidv4()
  db.controls.requests.push({ id, childId, contact, createdAt: Date.now(), status:'pending' })
  writeJson(db)
  return res.json({ ok:true, id })
}
function listRequests(req, res) {
  const parentId = req.user.sub
  const db = readJson()
  const mineKids = new Set((db.users.find(u=>u.id===parentId)||{children:[]}).children || [])
  const items = (db.controls&&db.controls.requests||[]).filter(r=>mineKids.has(r.childId))
  return res.json({ items })
}
function approveRequest(req, res) {
  const parentId = req.user.sub
  const reqId = String(req.body.id||'').trim()
  const db = readJson()
  const rq = (db.controls&&db.controls.requests||[]).find(r=>r.id===reqId)
  if (!rq) return res.status(404).json({ error:'request not found' })
  const parent = db.users.find(u=>u.id===parentId)
  if (!parent || parent.children.indexOf(rq.childId)===-1) return res.status(403).json({ error:'forbidden' })
  rq.status = 'approved'; rq.approvedAt = Date.now()
  // add to whitelist of the parent
  parent.whitelist = parent.whitelist || []
  if (parent.whitelist.indexOf(rq.contact)===-1) parent.whitelist.push(rq.contact)
  writeJson(db)
  return res.json({ ok:true, request: rq, whitelist: parent.whitelist })
}

function normalizeRule(r){
  try{
    const days = (Array.isArray(r.days)?r.days:[]).map(x=>Number(x)).filter(x=>x>=0 && x<=6)
    const start = String(r.start||'').slice(0,5)
    const end = String(r.end||'').slice(0,5)
    if (!days.length || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null
    return { days, start, end }
  }catch(e){ return null }
}

module.exports = { setSchedule, getSchedule, requestContact, listRequests, approveRequest }
