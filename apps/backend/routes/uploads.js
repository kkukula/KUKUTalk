const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { saveNew, getMeta, ROOT } = require('../lib/upload_store')
const audit = require('../lib/audit')

const ENABLED = String(process.env.UPLOADS_ENABLED||'true').toLowerCase()==='true'
const MAX = Number(process.env.UPLOAD_MAX_BYTES || 10485760)
const ALLOWED = String(process.env.UPLOAD_ALLOWED_MIME||'').split(',').map(s=>s.trim()).filter(Boolean)

const storage = multer.memoryStorage()
const mw = multer({ storage, limits: { fileSize: MAX } })

async function handleUpload(req, res){
  if (!ENABLED) return res.status(503).json({ error:'uploads_disabled' })
  const f = req.file
  if (!f || !f.buffer || !f.originalname) return res.status(400).json({ error:'file_required' })
  const uid = (req.user && req.user.sub) || 'anonymous'
  const r = saveNew(uid, f.originalname, f.buffer, ALLOWED)
  if (!r.ok) return res.status(400).json({ error: r.reason })
  return res.json({ ok:true, id:r.id })
}

function serveFile(req, res){
  const id = String(req.params.id||'').trim()
  if (!id) return res.status(400).send('bad_request')
  const meta = getMeta(id)
  if (!meta) return res.status(404).send('not_found')
  if (meta.status !== 'clean') return res.status(423).send('locked')
  const abs = path.join(ROOT, meta.fileName)
  if (!fs.existsSync(abs)) return res.status(404).send('not_found')
  res.setHeader('Content-Type', meta.mime)
  res.setHeader('Content-Length', meta.size)
  try { audit.logEvent({ type:'file_read', actorId:(req.user&&req.user.sub)||'unknown', actorRole:'parent', note:id }) } catch(e) {}
  fs.createReadStream(abs).pipe(res)
}

module.exports = { mw, handleUpload, serveFile }

