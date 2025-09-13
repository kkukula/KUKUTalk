const { v4: uuidv4 } = require('uuid')
const { readJson, writeJson } = require('../lib/store')

function createChild(req, res) {
  const parentId = req.user.sub
  const name = String(req.body.name || '').trim()
  if (!name) return res.status(400).json({ error: 'name required' })
  const db = readJson()
  const parent = db.users.find(u => u.id === parentId)
  if (!parent) return res.status(404).json({ error: 'parent not found' })
  const id = uuidv4()
  const child = { id, parentId, name, createdAt: Date.now() }
  db.children.push(child)
  parent.children.push(id)
  writeJson(db)
  return res.json({ ok: true, child })
}

function listChildren(req, res) {
  const db = readJson()
  const mine = db.children.filter(c => c.parentId === req.user.sub)
  return res.json({ items: mine })
}

function addWhitelist(req, res) {
  const db = readJson()
  const parent = db.users.find(u => u.id === req.user.sub)
  if (!parent) return res.status(404).json({ error: 'parent not found' })
  const contact = String(req.body.contact || '').trim()
  if (!contact) return res.status(400).json({ error: 'contact required' })
  if (parent.whitelist.indexOf(contact) === -1) parent.whitelist.push(contact)
  writeJson(db)
  return res.json({ ok: true, whitelist: parent.whitelist })
}

module.exports = { createChild, listChildren, addWhitelist }
