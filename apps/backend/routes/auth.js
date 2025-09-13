const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { readJson, writeJson } = require('../lib/store')

function emailNorm(e){ return String(e||'').trim().toLowerCase() }

function registerParent(req, res) {
  const email = emailNorm(req.body.email)
  const password = String(req.body.password || '')
  if (!email || password.length < 8) return res.status(400).json({ error: 'invalid payload' })
  const db = readJson()
  if (db.users.find(u => u.email === email)) return res.status(409).json({ error: 'exists' })
  const id = uuidv4()
  const hash = bcrypt.hashSync(password, 10)
  const user = { id, email, pwd: hash, roles: ['parent'], children: [], createdAt: Date.now(), whitelist: [] }
  db.users.push(user)
  writeJson(db)
  return res.json({ ok: true, id, email })
}

function login(req, res) {
  const email = emailNorm(req.body.email)
  const password = String(req.body.password || '')
  const db = readJson()
  const user = db.users.find(u => u.email === email)
  if (!user) return res.status(401).json({ error: 'invalid credentials' })
  if (!bcrypt.compareSync(password, user.pwd)) return res.status(401).json({ error: 'invalid credentials' })
  const token = jwt.sign({ sub: user.id, email: user.email, roles: user.roles }, process.env.JWT_SECRET || 'dev', { expiresIn: process.env.JWT_EXPIRES || '2h' })
  return res.json({ token })
}

function me(req, res) {
  const db = readJson()
  const user = db.users.find(u => u.id === req.user.sub)
  if (!user) return res.status(404).json({ error: 'not found' })
  const safe = { id: user.id, email: user.email, roles: user.roles, children: user.children, whitelist: user.whitelist }
  return res.json(safe)
}

module.exports = { registerParent, login, me }
