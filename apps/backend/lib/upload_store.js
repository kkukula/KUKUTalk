const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const ROOT = path.join(__dirname, '..', 'data', 'uploads')
const INDEX = path.join(__dirname, '..', 'data', 'uploads-index.json')

function readIndex(){
  try { return JSON.parse(fs.readFileSync(INDEX, 'utf8')) } catch(e){ return { version:1, items:[] } }
}
function writeIndex(obj){
  const tmp = INDEX + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8')
  fs.renameSync(tmp, INDEX)
}
function ensureDirs(){
  if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true })
}
function genId(){ return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2) }
function sha256(buf){ return crypto.createHash('sha256').update(buf).digest('hex') }

function detectMime(buf){
  if (!buf || buf.length < 4) return null
  const b = buf
  if (b[0]===0x89 && b[1]===0x50 && b[2]===0x4E && b[3]===0x47) return { mime:'image/png', ext:'png' }
  if (b[0]===0xFF && b[1]===0xD8) return { mime:'image/jpeg', ext:'jpg' }
  if (b[0]===0x47 && b[1]===0x49 && b[2]===0x46 && b[3]===0x38) return { mime:'image/gif', ext:'gif' }
  if (b[0]===0x25 && b[1]===0x50 && b[2]===0x44 && b[3]===0x46) return { mime:'application/pdf', ext:'pdf' }
  return null
}

function saveNew(uploaderId, originalName, buf, allowed){
  ensureDirs()
  const info = detectMime(buf)
  if (!info) return { ok:false, reason:'unknown_type' }
  if (Array.isArray(allowed) && allowed.length && allowed.indexOf(info.mime)===-1) return { ok:false, reason:'not_allowed' }
  const id = genId()
  const hash = sha256(buf)
  const fileName = id + '.' + info.ext
  const abs = path.join(ROOT, fileName)
  fs.writeFileSync(abs, buf)
  const idx = readIndex()
  const meta = { id, uploaderId, originalName, mime: info.mime, size: buf.length, sha256: hash, fileName, status:'clean', createdAt: Date.now() }
  idx.items.push(meta)
  writeIndex(idx)
  return { ok:true, id, meta }
}

function getMeta(id){
  const idx = readIndex()
  return (idx.items||[]).find(x => x.id === id) || null
}

module.exports = { saveNew, getMeta, ROOT }
