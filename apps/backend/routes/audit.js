const audit = require('../lib/audit')

function listAudit(req, res){
  const limit = Number(req.query.limit || 100)
  return res.json({ items: audit.tail(limit) })
}
function exportCsv(req, res){
  const limit = Number(req.query.limit || 1000)
  const csv = audit.toCsv(audit.tail(limit))
  res.setHeader('Content-Type','text/csv; charset=utf-8')
  res.setHeader('Content-Disposition','attachment; filename=""audit.csv""')
  return res.send(csv)
}
module.exports = { listAudit, exportCsv }
