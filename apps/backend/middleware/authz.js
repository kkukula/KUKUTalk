const jwt = require('jsonwebtoken')

function requireAuth(req, res, next) {
  const hdr = req.headers['authorization'] || ''
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null
  if (!token) return res.status(401).json({ error: 'missing token' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev')
    req.user = payload
    return next()
  } catch(e) {
    return res.status(401).json({ error: 'invalid token' })
  }
}

function requireRole(role) {
  return function(req, res, next) {
    const roles = (req.user && req.user.roles) || []
    if (roles.indexOf(role) === -1) return res.status(403).json({ error: 'forbidden' })
    return next()
  }
}

module.exports = { requireAuth, requireRole }
