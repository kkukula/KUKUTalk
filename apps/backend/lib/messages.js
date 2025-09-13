const fs = require('fs')
const path = require('path')
const FILE = path.join(__dirname, '..', 'data', 'messages.json')

function load(){ try { return JSON.parse(fs.readFileSync(FILE,'utf8')) } catch(e){ return { version:1, items:[] } } }
function save(db){ const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db), 'utf8'); fs.renameSync(tmp, FILE) }
function add(msg, max){ const db = load(); db.items.push(msg); const lim = Number(max||200); if (db.items.length>lim) db.items = db.items.slice(-lim); save(db) }
function history(room, limit){ const db = load(); const arr = db.items.filter(m => (room ? String(m.room||'')===String(room) : !m.room)); const lim = Number(limit||50); return arr.slice(-lim) }
module.exports = { add, history }
