const messages = require('../lib/messages')

function history(req, res){
  try{
    const room = req.query && req.query.room ? String(req.query.room) : null
    const limit = Number((req.query && req.query.limit) || 100)
    const items = messages.history(room, limit)
    return res.json({ items })
  }catch(e){
    return res.status(500).json({ error:'history_failed' })
  }
}

module.exports = { history }
