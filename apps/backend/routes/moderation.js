const { getWhitelist, setWhitelist } = require('../lib/moderation')
const audit = require('../lib/audit')
const { readJson } = require('../lib/store')

function getWL(_req, res){ return res.json({ items: getWhitelist() }) }
function setWL(req, res){
  if (!Array.isArray(req.body.items)) return res.status(400).json({ error:'items array required' })
  const v = (req.body.items||[]).map(x => String(x).trim()).filter(Boolean)
  const out = setWhitelist(v)
  return res.json({ ok:true, items: out })
}
function modStats(_req, res){
  const db = readJson()
  return res.json({ users: (db.users||[]).length, children: (db.children||[]).length })
}
module.exports = { getWL, setWL, modStats }

